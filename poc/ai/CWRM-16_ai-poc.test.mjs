import test from 'node:test';
import assert from 'node:assert/strict';
import { explainRisk } from './CWRM-16_ai-poc.mjs';

const snapshot = {
  id: 'snapshot-private-id', taskId: 'task-private-id', riskLevel: 'HIGH', baseLevel: 'MEDIUM',
  ruleVersion: 'candidate', evaluatedAt: '2026-11-10T03:00:00Z', inputFingerprint: 'example',
  triggeredRules: ['R03'],
  evidence: [{ id: 'ev-1', source: 'task', ruleId: 'R03', field: 'progress', value: 30 }],
};
const taskContext = {
  status: 'BLOCKED', progress: 30, deadlineAt: '2026-11-11T19:00:00Z',
  deadlineType: 'FLEXIBLE', priority: 'HIGH',
  dependency: { unfinishedPredecessorCount: 0, affectedTaskCount: 1, taskId: 'dependency-private-id' },
  milestone: { deadlineAt: '2026-11-15T19:00:00Z', title: 'private-milestone-title' },
  workload: { maxActiveTaskCount: 3, userId: 'user-private-id' },
};
const answer = {
  summary: 'Tiến độ thấp so với hạn.',
  linkedEvidenceIds: ['ev-1'],
  recommendations: [
    { action: 'Giảm phạm vi poster', rationale: 'Giảm khối lượng', caveat: 'Cần Manager duyệt' },
    { action: 'Bổ sung người', rationale: 'Tăng năng lực', caveat: 'Kiểm tra số chỗ' },
  ],
};
const options = { apiKey: 'test-only-key', model: 'gemini-3.1-flash-lite', taskContext };
const responseWithText = (text, finishReason = 'STOP') => Response.json({
  modelVersion: 'test-only-model-version',
  responseId: 'test-only-response',
  usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 120, thoughtsTokenCount: 10, totalTokenCount: 430 },
  candidates: [{ finishReason, content: { parts: [{ text: 'ignore reasoning', thought: true }, { text }] } }],
}, { headers: { 'x-goog-request-id': 'test-only-request' } });

test('missing server configuration preserves evidence and skips the provider', async () => {
  let called = false;
  const result = await explainRisk(snapshot, { taskContext, fetchImpl: () => { called = true; } });
  assert.equal(called, false);
  assert.equal(result.reason, 'missing-server-configuration');
  assert.equal(result.retryable, false);
  assert.equal(result.evidence, snapshot.evidence);
});

test('Gemini JSON response uses sanitized context and links to the original snapshot', async () => {
  const result = await explainRisk(snapshot, { ...options, fetchImpl: async (url, request) => {
    const body = JSON.parse(request.body);
    const input = JSON.parse(body.contents[0].parts[0].text);
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
    assert.equal(request.headers['x-goog-api-key'], 'test-only-key');
    assert.equal(request.redirect, 'error');
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseJsonSchema.properties.recommendations.maxItems, 3);
    assert.deepEqual(input.risk.triggeredRules, ['R03']);
    assert.equal(input.risk.baseLevel, 'MEDIUM');
    assert.equal(input.taskContext.progress, 30);
    assert.equal(input.taskContext.dependency.affectedTaskCount, 1);
    assert.equal(input.taskContext.workload.maxActiveTaskCount, 3);
    assert.equal(input.taskContext.milestone.deadlineAt, '2026-11-15T19:00:00Z');
    assert.doesNotMatch(request.body, /private-id|private-milestone-title|test-only-key/);
    return responseWithText(JSON.stringify(answer));
  } });
  assert.equal(result.ok, true);
  assert.equal(result.snapshotId, snapshot.id);
  assert.equal(result.inputFingerprint, snapshot.inputFingerprint);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'test-only-model-version');
  assert.equal(result.requestId, 'test-only-request');
  assert.equal(result.responseId, 'test-only-response');
  assert.deepEqual(result.usage, { input_tokens: 300, cached_input_tokens: 0, output_tokens: 130, total_tokens: 430 });
  assert.deepEqual(result.answer, answer);
  assert.doesNotMatch(JSON.stringify(result), /test-only-key/);
});

for (const [label, details, seconds] of [
  ['with RetryInfo', [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '8.5s' }], 9],
  ['without retry guidance', [], null],
]) {
  test(`429 ${label} reports quota failure and preserves risk`, async () => {
    const result = await explainRisk(snapshot, {
      ...options, fetchImpl: async () => Response.json({ error: { status: 'RESOURCE_EXHAUSTED', details } }, { status: 429 }),
    });
    assert.equal(result.errorCode, 'AI_QUOTA_EXCEEDED');
    assert.equal(result.retryable, seconds !== null);
    assert.equal(result.retryAfterSeconds, seconds);
    assert.equal(result.riskLevel, 'HIGH');
    assert.equal(result.evidence, snapshot.evidence);
    assert.match(result.fallbackExplanation, /R03/);
  });
}

test('provider network failure is distinct from invalid output', async () => {
  const result = await explainRisk(snapshot, { ...options, fetchImpl: async () => { throw new TypeError('network'); } });
  assert.equal(result.errorCode, 'AI_PROVIDER_ERROR');
  assert.equal(result.retryable, true);
});

test('timeout while consuming the response body is retryable', async () => {
  const result = await explainRisk(snapshot, { ...options, fetchImpl: async () => ({
    ok: true, status: 200,
    json: async () => { throw new DOMException('request timed out', 'TimeoutError'); },
  }) });
  assert.equal(result.errorCode, 'AI_TIMEOUT');
  assert.equal(result.retryable, true);
  assert.equal(result.evidence, snapshot.evidence);
});

const invalidOutputs = [
  ['unknown evidence ID', JSON.stringify({ ...answer, linkedEvidenceIds: ['unknown'] })],
  ['one recommendation', JSON.stringify({ ...answer, recommendations: answer.recommendations.slice(0, 1) })],
  ['four recommendations', JSON.stringify({ ...answer, recommendations: [...answer.recommendations, ...answer.recommendations] })],
  ['malformed JSON', '{invalid'],
  ['incomplete response', JSON.stringify(answer), 'MAX_TOKENS'],
  ['blocked candidate', JSON.stringify(answer), 'SAFETY'],
];
for (const [label, text, finishReason] of invalidOutputs) {
  test(`${label} returns safe fallback`, async () => {
    const result = await explainRisk(snapshot, { ...options, fetchImpl: async () => responseWithText(text, finishReason) });
    assert.equal(result.errorCode, 'AI_OUTPUT_INVALID');
    assert.equal(result.retryable, false);
    assert.equal(result.evidence, snapshot.evidence);
  });
}
