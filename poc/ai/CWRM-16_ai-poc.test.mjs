import test from 'node:test';
import assert from 'node:assert/strict';
import { explainRisk } from './CWRM-16_ai-poc.mjs';

const snapshot = { taskId: 'MKT-POSTER-01', riskLevel: 'High', ruleVersion: 'candidate', evaluatedAt: '2026-11-10T03:00:00Z', inputFingerprint: 'example', evidence: [{ id: 'ev-1', field: 'progress', value: 30 }] };

test('missing server configuration preserves risk and avoids a network call', async () => {
  const result = await explainRisk(snapshot, { fetchImpl: () => { throw new Error('must not call'); } });
  assert.equal(result.ok, false);
  assert.equal(result.riskLevel, 'High');
  assert.equal(result.evidence, snapshot.evidence);
});

test('provider error preserves evidence and reports failure', async () => {
  const result = await explainRisk(snapshot, { apiKey: 'test-only', model: 'test-only', fetchImpl: async () => ({ ok: false, status: 429 }) });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'http-429');
  assert.equal(result.evidence, snapshot.evidence);
});

test('valid structured response is linked to the input snapshot', async () => {
  const answer = { explanation: 'Tiến độ thấp so với hạn.', linkedEvidenceIds: ['ev-1'], recommendations: [{ action: 'Giảm phạm vi poster', rationale: 'Giảm khối lượng', caveat: 'Cần Manager duyệt' }, { action: 'Bổ sung người', rationale: 'Tăng năng lực', caveat: 'Kiểm tra số chỗ' }] };
  const result = await explainRisk(snapshot, { apiKey: 'test-only', model: 'test-only', fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'completed', model: 'test-only', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }) }) });
  assert.equal(result.ok, true);
  assert.equal(result.snapshotFingerprint, 'example');
  assert.deepEqual(result.answer, answer);
});

test('fabricated evidence reference is rejected', async () => {
  const answer = { explanation: 'Risk cao.', linkedEvidenceIds: ['not-in-snapshot'], recommendations: [{ action: 'A', rationale: 'B', caveat: 'C' }, { action: 'D', rationale: 'E', caveat: 'F' }] };
  const result = await explainRisk(snapshot, { apiKey: 'test-only', model: 'test-only', fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }) }) });
  assert.equal(result.ok, false);
  assert.equal(result.riskLevel, 'High');
});
