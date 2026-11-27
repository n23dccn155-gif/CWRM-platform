import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { clearPublicTables, createIntegrationApp } from './int-test-helpers.js';
import {
  api,
  auditActions,
  createWorkspace,
  joinWorkspace,
  user,
} from './wp014b-helpers.js';

describe('WP-014B · Capacity tuần và audit_logs với PostgreSQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createIntegrationApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearPublicTables(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup() {
    const manager = await user(app, 'manager@example.com', 'Quản lý');
    const member = await user(app, 'member@example.com', 'Thành viên');
    const workspaceId = await createWorkspace(app, manager);
    await joinWorkspace(app, manager, member, workspaceId);
    return { manager, member, workspaceId };
  }

  it('NOT_DECLARED không tạo dòng; khai báo lần đầu gửi expectedVersion 0', async () => {
    const { member, workspaceId } = await setup();
    const path = `/workspaces/${workspaceId}/my-capacity`;

    const notDeclared = await api(app, member).get(path).expect(200);
    expect(notDeclared.body).toEqual({
      workspaceId,
      userId: member.id,
      displayName: 'Thành viên',
      declaredWeeklyHours: null,
      declaredAt: null,
      approvedWeeklyHours: null,
      approvedByUserId: null,
      approvedAt: null,
      status: 'NOT_DECLARED',
      version: 0,
    });
    expect(await prisma.memberCapacity.count()).toBe(0);

    const wrong = await api(app, member)
      .put(path)
      .send({ declaredWeeklyHours: 20, expectedVersion: 1 })
      .expect(409);
    expect(wrong.body.error.details.currentVersion).toBe(0);

    const declared = await api(app, member)
      .put(path)
      .send({ declaredWeeklyHours: 20.5, expectedVersion: 0 })
      .expect(200);
    expect(declared.body).toMatchObject({
      declaredWeeklyHours: 20.5,
      approvedWeeklyHours: null,
      status: 'PENDING_APPROVAL',
      version: 1,
    });
    expect(declared.body.declaredAt).toMatch(/Z$/);

    for (const hours of [-1, 168.01, 1.234, '20']) {
      await api(app, member)
        .put(path)
        .send({ declaredWeeklyHours: hours, expectedVersion: 1 })
        .expect(400);
    }
  });

  it('C33-03.1/CD-02/CD-04: biên 0 và 168, duyệt sai trạng thái 422, caller ngoài workspace 404', async () => {
    const { manager, member, workspaceId } = await setup();
    const outsider = await user(app, 'outsider@example.com', 'Người ngoài');
    const minePath = `/workspaces/${workspaceId}/my-capacity`;
    const approvePath = `/workspaces/${workspaceId}/members/${member.id}/capacity/approve`;

    const outside = await api(app, outsider)
      .put(minePath)
      .send({ declaredWeeklyHours: 10, expectedVersion: 0 })
      .expect(404);
    expect(outside.body.error.code).toBe('NOT_FOUND');
    await api(app, outsider).get(minePath).expect(404);

    await api(app, member)
      .put(minePath)
      .send({ declaredWeeklyHours: 168, expectedVersion: 0 })
      .expect(200);
    await api(app, member)
      .put(minePath)
      .send({ declaredWeeklyHours: 0, expectedVersion: 1 })
      .expect(200);
    for (const hours of [169, 20.005, null]) {
      await api(app, manager)
        .post(approvePath)
        .send({ approvedWeeklyHours: hours, expectedVersion: 2 })
        .expect(400);
    }
    await api(app, manager)
      .post(approvePath)
      .send({ approvedWeeklyHours: 168, expectedVersion: 2 })
      .expect(200);
    const again = await api(app, manager)
      .post(approvePath)
      .send({ approvedWeeklyHours: 10, expectedVersion: 3 })
      .expect(422);
    expect(again.body.error.code).toBe('INVALID_STATE_TRANSITION');
    const capacity = await prisma.memberCapacity.findFirstOrThrow({
      where: { workspaceId, userId: member.id },
    });
    expect(Number(capacity.approvedWeeklyHours)).toBe(168);
    expect(capacity.version).toBe(3);
  });

  it('khai lại giữ số đã duyệt cho tới khi Manager duyệt số mới (đầu vào R09)', async () => {
    const { manager, member, workspaceId } = await setup();
    const minePath = `/workspaces/${workspaceId}/my-capacity`;
    const approvePath = `/workspaces/${workspaceId}/members/${member.id}/capacity/approve`;

    await api(app, member)
      .put(minePath)
      .send({ declaredWeeklyHours: 20, expectedVersion: 0 })
      .expect(200);
    await api(app, member)
      .post(approvePath)
      .send({ approvedWeeklyHours: 20, expectedVersion: 1 })
      .expect(403);
    await api(app, manager)
      .post(approvePath)
      .send({ approvedWeeklyHours: 20, expectedVersion: 2 })
      .expect(409);

    const approved = await api(app, manager)
      .post(approvePath)
      .send({ approvedWeeklyHours: 18, expectedVersion: 1 })
      .expect(200);
    expect(approved.body).toMatchObject({
      declaredWeeklyHours: 20,
      approvedWeeklyHours: 18,
      approvedByUserId: manager.id,
      status: 'APPROVED',
      version: 2,
    });

    const again = await api(app, manager)
      .post(approvePath)
      .send({ approvedWeeklyHours: 18, expectedVersion: 2 })
      .expect(422);
    expect(again.body.error).toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      details: { currentStatus: 'APPROVED' },
    });

    const redeclared = await api(app, member)
      .put(minePath)
      .send({ declaredWeeklyHours: 25, expectedVersion: 2 })
      .expect(200);
    expect(redeclared.body).toMatchObject({
      declaredWeeklyHours: 25,
      approvedWeeklyHours: 18,
      approvedByUserId: manager.id,
      status: 'PENDING_APPROVAL',
      version: 3,
    });

    const zero = await api(app, manager)
      .post(approvePath)
      .send({ approvedWeeklyHours: 0, expectedVersion: 3 })
      .expect(200);
    expect(zero.body).toMatchObject({ approvedWeeklyHours: 0, version: 4 });

    const row = await prisma.memberCapacity.findFirstOrThrow();
    expect(await auditActions(prisma, row.id)).toEqual([
      'CAPACITY_DECLARED',
      'CAPACITY_APPROVED',
      'CAPACITY_DECLARED',
      'CAPACITY_APPROVED',
    ]);
    const redeclareAudit = await prisma.auditLog.findFirstOrThrow({
      where: { objectId: row.id, afterValue: { path: ['version'], equals: 3 } },
    });
    expect(redeclareAudit.beforeValue).toMatchObject({
      status: 'APPROVED',
      approvedWeeklyHours: 18,
    });
    expect(redeclareAudit.afterValue).toMatchObject({
      status: 'PENDING_APPROVAL',
      approvedWeeklyHours: 18,
    });
  });

  it('Manager liệt kê capacity, việc chờ duyệt đứng trước; duyệt người chưa khai trả 422', async () => {
    const { manager, member, workspaceId } = await setup();
    const other = await user(app, 'other@example.com', 'Người khác');
    await joinWorkspace(app, manager, other, workspaceId);

    await api(app, other)
      .put(`/workspaces/${workspaceId}/my-capacity`)
      .send({ declaredWeeklyHours: 10, expectedVersion: 0 })
      .expect(200);
    await api(app, other)
      .post(`/workspaces/${workspaceId}/members/${other.id}/capacity/approve`)
      .send({ approvedWeeklyHours: 10, expectedVersion: 1 })
      .expect(403);
    await api(app, manager)
      .post(`/workspaces/${workspaceId}/members/${other.id}/capacity/approve`)
      .send({ approvedWeeklyHours: 10, expectedVersion: 1 })
      .expect(200);
    await api(app, member)
      .put(`/workspaces/${workspaceId}/my-capacity`)
      .send({ declaredWeeklyHours: 30, expectedVersion: 0 })
      .expect(200);

    const listed = await api(app, manager)
      .get(`/workspaces/${workspaceId}/capacities`)
      .expect(200);
    expect(listed.body.total).toBe(2);
    expect(
      listed.body.items.map((c: { userId: string; status: string }) => [
        c.userId,
        c.status,
      ]),
    ).toEqual([
      [member.id, 'PENDING_APPROVAL'],
      [other.id, 'APPROVED'],
    ]);
    await api(app, member)
      .get(`/workspaces/${workspaceId}/capacities`)
      .expect(403);

    const notDeclared = await api(app, manager)
      .post(`/workspaces/${workspaceId}/members/${manager.id}/capacity/approve`)
      .send({ approvedWeeklyHours: 10, expectedVersion: 1 })
      .expect(422);
    expect(notDeclared.body.error.details.currentStatus).toBe('NOT_DECLARED');
    await api(app, manager)
      .post(
        `/workspaces/${workspaceId}/members/00000000-0000-4000-8000-000000000000/capacity/approve`,
      )
      .send({ approvedWeeklyHours: 10, expectedVersion: 1 })
      .expect(404);
  });

  it('hai lần khai báo đầu tiên song song: một thành công, một 409', async () => {
    const { member, workspaceId } = await setup();
    const results = await Promise.all(
      [10, 12].map((hours) =>
        api(app, member)
          .put(`/workspaces/${workspaceId}/my-capacity`)
          .send({ declaredWeeklyHours: hours, expectedVersion: 0 }),
      ),
    );
    expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([
      200, 409,
    ]);
    expect(await prisma.memberCapacity.count()).toBe(1);
  });

  it('DB chặn capacity APPROVED thiếu số duyệt và chặn sửa/xóa audit_logs', async () => {
    const { manager, member, workspaceId } = await setup();
    await expect(
      prisma.memberCapacity.create({
        data: {
          workspaceId,
          userId: member.id,
          declaredWeeklyHours: 10,
          declaredAt: new Date(),
          status: 'APPROVED',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.memberCapacity.create({
        data: {
          workspaceId,
          userId: member.id,
          declaredWeeklyHours: 10,
          declaredAt: new Date(),
          approvedWeeklyHours: 10,
          status: 'APPROVED',
        },
      }),
    ).rejects.toThrow();

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { actorUserId: manager.id },
    });
    await expect(
      prisma.$executeRaw`UPDATE audit_logs SET action = 'SUA' WHERE id = ${audit.id}::uuid`,
    ).rejects.toThrow();
    await expect(
      prisma.$executeRaw`DELETE FROM audit_logs WHERE id = ${audit.id}::uuid`,
    ).rejects.toThrow();
    expect(
      (await prisma.auditLog.findUniqueOrThrow({ where: { id: audit.id } }))
        .action,
    ).toBe(audit.action);
  });

  it('lỗi nghiệp vụ rollback luôn audit trong cùng transaction', async () => {
    const { manager, workspaceId } = await setup();
    const before = await prisma.auditLog.count();
    await api(app, manager)
      .patch(`/workspaces/${workspaceId}/members/${manager.id}`)
      .send({ role: 'MEMBER' })
      .expect(422);
    expect(await prisma.auditLog.count()).toBe(before);
  });
});
