import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { clearPublicTables, createIntegrationApp } from './int-test-helpers.js';
import {
  addToTeam,
  api,
  auditActions,
  createTeam,
  createWorkspace,
  joinWorkspace,
  user,
  type TestUser,
} from './wp014b-helpers.js';

describe('WP-015A · Task CRUD Core với PostgreSQL', () => {
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

  /** Workspace có hai team: Content (manager, member) và Design (manager, designer); outsider ở ngoài. */
  async function setup() {
    const manager = await user(app, 'manager@example.com', 'Quản lý');
    const member = await user(app, 'member@example.com', 'Thành viên');
    const designer = await user(app, 'designer@example.com', 'Thiết kế');
    const outsider = await user(app, 'outsider@example.com', 'Người ngoài');
    const workspaceId = await createWorkspace(app, manager);
    await joinWorkspace(app, manager, member, workspaceId);
    await joinWorkspace(app, manager, designer, workspaceId);
    const contentTeam = await createTeam(app, manager, workspaceId, 'Content');
    const designTeam = await createTeam(app, manager, workspaceId, 'Design');
    await addToTeam(app, manager, contentTeam, manager);
    await addToTeam(app, manager, contentTeam, member);
    await addToTeam(app, manager, designTeam, manager);
    await addToTeam(app, manager, designTeam, designer);
    return {
      manager,
      member,
      designer,
      outsider,
      workspaceId,
      contentTeam,
      designTeam,
    };
  }

  function taskBody(teamId: string, accountable: TestUser, extra = {}) {
    return {
      teamId,
      title: 'Viết bài blog',
      accountableUserId: accountable.id,
      priority: 'HIGH',
      deadlineAt: '2026-12-10T10:00:00Z',
      deadlineType: 'FLEXIBLE',
      requiredPeople: 2,
      assignmentMode: 'DIRECT',
      ...extra,
    };
  }

  async function createTask(
    manager: TestUser,
    teamId: string,
    extra = {},
  ): Promise<{ id: string; version: number }> {
    const response = await api(app, manager)
      .post('/tasks')
      .send(taskBody(teamId, manager, extra))
      .expect(201);
    return response.body as { id: string; version: number };
  }

  describe('POST /tasks', () => {
    it('tạo task TO_DO, progress 0, version 1; phần của module chưa có trả đúng hiện trạng; ghi audit', async () => {
      const { manager, workspaceId, contentTeam } = await setup();
      const role = await api(app, manager)
        .post(`/workspaces/${workspaceId}/roles`)
        .send({ name: 'Writer' })
        .expect(201);
      const skill = await api(app, manager)
        .post(`/workspaces/${workspaceId}/skills`)
        .send({ name: 'SEO' })
        .expect(201);

      const created = await api(app, manager)
        .post('/tasks')
        .send(
          taskBody(contentTeam, manager, {
            title: '  Viết bài blog  ',
            description: 'Bài về chiến dịch',
            effortEstimateHours: 12.5,
            requiredRoleIds: [role.body.id],
            requiredSkillIds: [skill.body.id],
          }),
        )
        .expect(201);
      expect(created.body).toMatchObject({
        teamId: contentTeam,
        teamName: 'Content',
        milestoneId: null,
        milestoneName: null,
        title: 'Viết bài blog',
        description: 'Bài về chiến dịch',
        accountableUserId: manager.id,
        accountableUser: { userId: manager.id, displayName: 'Quản lý' },
        status: 'TO_DO',
        assignmentMode: 'DIRECT',
        priority: 'HIGH',
        deadlineAt: '2026-12-10T10:00:00.000Z',
        deadlineType: 'FLEXIBLE',
        effortEstimateHours: 12.5,
        effortActualHours: null,
        unallocatedEffortHours: 12.5,
        requiredPeople: 2,
        occupiedSlots: 0,
        progress: 0,
        version: 1,
        requiredRoleIds: [role.body.id],
        requiredSkillIds: [skill.body.id],
        responsibleUserIds: [],
        responsibleUsers: [],
        predecessors: [],
        successors: [],
        openWork: {
          state: 'NOT_OPENED',
          closedReason: null,
          acceptedCount: 0,
          occupiedSlots: 0,
          requiredPeople: 2,
          pendingRequestCount: 0,
        },
        openBlockerCount: 0,
        affectedTaskCount: 0,
        risk: null,
        myRequestStatus: null,
        availableActions: ['EDIT_TASK', 'UPDATE_REQUIRED_PEOPLE'],
        startedAt: null,
        completedAt: null,
      });
      expect(await auditActions(prisma, created.body.id)).toEqual([
        'TASK_CREATED',
      ]);
    });

    it('A phải là Manager ACTIVE của workspace và thành viên ACTIVE của team (422 ACCOUNTABLE_NOT_MANAGER)', async () => {
      const { manager, member, workspaceId, contentTeam } = await setup();
      const asMember = await api(app, manager)
        .post('/tasks')
        .send(taskBody(contentTeam, member))
        .expect(422);
      expect(asMember.body.error.code).toBe('ACCOUNTABLE_NOT_MANAGER');

      const otherManager = await user(app, 'manager2@example.com');
      await joinWorkspace(app, manager, otherManager, workspaceId);
      await api(app, manager)
        .patch(`/workspaces/${workspaceId}/members/${otherManager.id}`)
        .send({ role: 'MANAGER' })
        .expect(200);
      const notInTeam = await api(app, manager)
        .post('/tasks')
        .send(taskBody(contentTeam, otherManager))
        .expect(422);
      expect(notInTeam.body.error.code).toBe('ACCOUNTABLE_NOT_MANAGER');
      expect(await prisma.task.count()).toBe(0);
    });

    it('team ngoài phạm vi thấy trả 400; Member trong team trả 403; milestone khác team 422; role/skill ngoài workspace 400', async () => {
      const { manager, member, outsider, contentTeam, designTeam } =
        await setup();
      const foreignWorkspace = await createWorkspace(app, outsider, 'Khác');
      const foreignTeam = await createTeam(app, outsider, foreignWorkspace);
      const foreignRole = await api(app, outsider)
        .post(`/workspaces/${foreignWorkspace}/roles`)
        .send({ name: 'Writer' })
        .expect(201);

      const foreign = await api(app, manager)
        .post('/tasks')
        .send(taskBody(foreignTeam, manager))
        .expect(400);
      expect(foreign.body.error.details.fields).toHaveProperty('teamId');
      const missing = await api(app, manager)
        .post('/tasks')
        .send(taskBody('00000000-0000-4000-8000-000000000000', manager))
        .expect(400);
      expect(missing.body).toEqual(foreign.body);
      // Member không thuộc Design: không thấy team nên cũng là 400; Member của Content: thấy team, thiếu quyền, 403.
      await api(app, member)
        .post('/tasks')
        .send(taskBody(designTeam, manager))
        .expect(400);
      await api(app, member)
        .post('/tasks')
        .send(taskBody(contentTeam, manager))
        .expect(403);

      const milestone = await prisma.milestone.create({
        data: {
          teamId: designTeam,
          name: 'Ra mắt',
          deadlineAt: new Date('2026-12-20T00:00:00Z'),
        },
      });
      const mismatch = await api(app, manager)
        .post('/tasks')
        .send(taskBody(contentTeam, manager, { milestoneId: milestone.id }))
        .expect(422);
      expect(mismatch.body.error.code).toBe('MILESTONE_TEAM_MISMATCH');
      const sameTeam = await api(app, manager)
        .post('/tasks')
        .send(taskBody(designTeam, manager, { milestoneId: milestone.id }))
        .expect(201);
      expect(sameTeam.body.milestoneName).toBe('Ra mắt');

      const badRole = await api(app, manager)
        .post('/tasks')
        .send(
          taskBody(contentTeam, manager, {
            requiredRoleIds: [foreignRole.body.id],
          }),
        )
        .expect(400);
      expect(badRole.body.error.details).toMatchObject({
        unknownRoleIds: [foreignRole.body.id],
      });
      expect(await prisma.task.count()).toBe(1);
    });

    it('validation: thiếu trường, null, deadline không có múi giờ, effort 3 chữ số thập phân, requiredPeople 0', async () => {
      const { manager, contentTeam } = await setup();
      const cases = [
        { title: undefined },
        { title: null },
        { title: '   ' },
        { deadlineAt: '2026-12-10T10:00:00' },
        { deadlineAt: '2026-12-10' },
        { effortEstimateHours: 1.234 },
        { effortEstimateHours: -1 },
        { requiredPeople: 0 },
        { requiredPeople: 1.5 },
        { assignmentMode: 'OTHER' },
        { requiredRoleIds: null },
        { status: 'DONE' },
      ];
      for (const extra of cases) {
        // title: undefined bị JSON.stringify bỏ đi, tức là thiếu trường.
        const body = taskBody(contentTeam, manager, extra);
        const response = await api(app, manager)
          .post('/tasks')
          .send(body)
          .expect(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
      await api(app, manager)
        .post('/tasks')
        .send(taskBody(contentTeam, manager, { effortEstimateHours: null }))
        .expect(201);
    });
  });

  describe('Phân quyền và GET', () => {
    it('Manager thấy mọi team; Member chỉ thấy task team mình; ngoài phạm vi trả 404 giống task không tồn tại', async () => {
      const {
        manager,
        member,
        outsider,
        workspaceId,
        contentTeam,
        designTeam,
      } = await setup();
      const mine = await createTask(manager, contentTeam);
      const notMine = await createTask(manager, designTeam);

      const managerList = await api(app, manager)
        .get(`/tasks?workspaceId=${workspaceId}`)
        .expect(200);
      expect(managerList.body.total).toBe(2);
      const memberList = await api(app, member)
        .get(`/tasks?workspaceId=${workspaceId}`)
        .expect(200);
      expect(memberList.body).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 1,
      });
      expect(memberList.body.items[0]).toMatchObject({
        id: mine.id,
        availableActions: [],
        openWork: { pendingRequestCount: null },
      });

      await api(app, member).get(`/tasks/${mine.id}`).expect(200);
      const hidden = await api(app, member)
        .get(`/tasks/${notMine.id}`)
        .expect(404);
      const missing = await api(app, member)
        .get('/tasks/00000000-0000-4000-8000-000000000000')
        .expect(404);
      expect(hidden.body).toEqual(missing.body);
      await api(app, outsider).get(`/tasks/${mine.id}`).expect(404);
      await api(app, outsider)
        .get(`/tasks?workspaceId=${workspaceId}`)
        .expect(404);
      await api(app, member).get('/tasks/khong-phai-uuid').expect(400);
      await api(app, member).get('/tasks').expect(400);

      // Ghi: Member trong team nhận 403, Member ngoài team nhận 404.
      await api(app, member)
        .patch(`/tasks/${mine.id}`)
        .send({ title: 'Đổi', expectedVersion: 1 })
        .expect(403);
      await api(app, member)
        .patch(`/tasks/${notMine.id}`)
        .send({ title: 'Đổi', expectedVersion: 1 })
        .expect(404);
      await api(app, member)
        .patch(`/tasks/${mine.id}/required-people`)
        .send({ requiredPeople: 3, expectedVersion: 1 })
        .expect(403);
      await api(app).get(`/tasks/${mine.id}`).expect(401);
    });

    it('Member rời team thì mất quyền xem task của team đó', async () => {
      const { manager, member, contentTeam } = await setup();
      const task = await createTask(manager, contentTeam);
      await api(app, member).get(`/tasks/${task.id}`).expect(200);
      await api(app, manager)
        .delete(`/teams/${contentTeam}/members/${member.id}`)
        .expect(204);
      await api(app, member).get(`/tasks/${task.id}`).expect(404);
    });
  });

  describe('GET /tasks — bộ lọc (P-02 của 0.3.4-draft)', () => {
    it('bộ lọc chưa hỗ trợ trả 422 cho cả request, liệt kê đúng tên và sắp theo tên', async () => {
      const { manager, workspaceId, contentTeam } = await setup();
      await createTask(manager, contentTeam);
      const base = `/tasks?workspaceId=${workspaceId}`;

      const one = await api(app, manager)
        .get(`${base}&riskLevel=HIGH`)
        .expect(422);
      expect(one.body.error).toEqual({
        code: 'FILTER_NOT_AVAILABLE',
        message: expect.any(String),
        details: { unsupportedFilters: ['riskLevel'] },
      });
      const all = await api(app, manager)
        .get(
          `${base}&status=TO_DO&riskLevel=LOW&responsibleUserId=${manager.id}&openWorkState=OPEN`,
        )
        .expect(422);
      expect(all.body.error.details.unsupportedFilters).toEqual([
        'openWorkState',
        'responsibleUserId',
        'riskLevel',
      ]);
    });

    it('validation chạy trước 422; người ngoài workspace vẫn nhận 404', async () => {
      const { manager, outsider, workspaceId } = await setup();
      const base = `/tasks?workspaceId=${workspaceId}`;
      const invalid = await api(app, manager)
        .get(`${base}&riskLevel=EXTREME`)
        .expect(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
      await api(app, manager)
        .get(`${base}&responsibleUserId=khong-phai-uuid`)
        .expect(400);
      await api(app, outsider).get(`${base}&riskLevel=HIGH`).expect(404);
      await api(app, manager).get(`${base}&unknownFilter=1`).expect(400);
    });

    it('bộ lọc đã hỗ trợ chạy trên dữ liệu thật; không khớp thì 200 rỗng; deadline là khoảng [after, before)', async () => {
      const { manager, member, workspaceId, contentTeam, designTeam } =
        await setup();
      const early = await createTask(manager, contentTeam, {
        deadlineAt: '2026-12-05T00:00:00Z',
        priority: 'LOW',
      });
      const late = await createTask(manager, contentTeam, {
        deadlineAt: '2026-12-15T00:00:00Z',
        assignmentMode: 'OPEN_WORK',
      });
      await createTask(manager, designTeam, {
        deadlineAt: '2026-12-06T00:00:00Z',
      });
      const base = `/tasks?workspaceId=${workspaceId}`;
      const ids = async (who: TestUser, query: string) =>
        (await api(app, who).get(`${base}${query}`).expect(200)).body.items.map(
          (item: { id: string }) => item.id,
        );

      expect(await ids(manager, `&teamId=${contentTeam}`)).toEqual([
        early.id,
        late.id,
      ]);
      expect(await ids(manager, '&priority=LOW')).toEqual([early.id]);
      expect(await ids(manager, '&assignmentMode=OPEN_WORK')).toEqual([
        late.id,
      ]);
      expect(await ids(manager, `&accountableUserId=${member.id}`)).toEqual([]);
      expect(
        await ids(
          manager,
          `&teamId=${contentTeam}&deadlineAfter=2026-12-05T00:00:00Z&deadlineBefore=2026-12-15T00:00:00Z`,
        ),
      ).toEqual([early.id]);
      expect(await ids(manager, '&status=DONE')).toEqual([]);
      // Member lọc theo team mình không thuộc: không lộ task, trả rỗng.
      expect(await ids(member, `&teamId=${designTeam}`)).toEqual([]);

      const paged = await api(app, manager)
        .get(`${base}&pageSize=2&page=2`)
        .expect(200);
      expect(paged.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
      expect(paged.body.items.map((item: { id: string }) => item.id)).toEqual([
        late.id,
      ]);
    });
  });

  describe('PATCH /tasks/{taskId}', () => {
    it('version cũ 409; no-op không tăng version, không audit; đổi thật tăng đúng 1 và ghi audit', async () => {
      const { manager, workspaceId, contentTeam } = await setup();
      const task = await createTask(manager, contentTeam);
      const path = `/tasks/${task.id}`;
      const skill = await api(app, manager)
        .post(`/workspaces/${workspaceId}/skills`)
        .send({ name: 'SEO' })
        .expect(201);

      const stale = await api(app, manager)
        .patch(path)
        .send({ title: 'Mới', expectedVersion: 2 })
        .expect(409);
      expect(stale.body.error).toMatchObject({
        code: 'VERSION_CONFLICT',
        details: { currentVersion: 1 },
      });
      const noop = await api(app, manager)
        .patch(path)
        .send({
          title: 'Viết bài blog',
          deadlineAt: '2026-12-10T17:00:00+07:00',
          requiredRoleIds: [],
          expectedVersion: 1,
        })
        .expect(200);
      expect(noop.body.version).toBe(1);

      const changed = await api(app, manager)
        .patch(path)
        .send({
          title: 'Viết bài blog mới',
          description: 'Mô tả',
          priority: 'CRITICAL',
          effortEstimateHours: 4,
          requiredSkillIds: [skill.body.id],
          expectedVersion: 1,
        })
        .expect(200);
      expect(changed.body).toMatchObject({
        title: 'Viết bài blog mới',
        description: 'Mô tả',
        priority: 'CRITICAL',
        effortEstimateHours: 4,
        requiredSkillIds: [skill.body.id],
        version: 2,
      });
      const cleared = await api(app, manager)
        .patch(path)
        .send({
          description: null,
          effortEstimateHours: null,
          expectedVersion: 2,
        })
        .expect(200);
      expect(cleared.body).toMatchObject({
        description: null,
        effortEstimateHours: null,
        version: 3,
      });
      expect(await auditActions(prisma, task.id)).toEqual([
        'TASK_CREATED',
        'TASK_UPDATED',
        'TASK_UPDATED',
      ]);
    });

    it('không nhận status/accountableUserId/openWork; không sửa task DONE; deadline FIXED cần reason', async () => {
      const { manager, contentTeam } = await setup();
      const task = await createTask(manager, contentTeam, {
        deadlineType: 'FIXED',
      });
      const path = `/tasks/${task.id}`;
      for (const field of [
        { status: 'DONE' },
        { accountableUserId: manager.id },
        { openWork: { state: 'OPEN' } },
        { title: null },
      ]) {
        await api(app, manager)
          .patch(path)
          .send({ ...field, expectedVersion: 1 })
          .expect(400);
      }

      const noReason = await api(app, manager)
        .patch(path)
        .send({ deadlineAt: '2026-12-11T10:00:00Z', expectedVersion: 1 })
        .expect(400);
      expect(noReason.body.error.details.fields).toHaveProperty('reason');
      await api(app, manager)
        .patch(path)
        .send({ deadlineType: 'FLEXIBLE', expectedVersion: 1 })
        .expect(400);
      // Đổi trường khác của task FIXED không cần reason.
      await api(app, manager)
        .patch(path)
        .send({ priority: 'LOW', expectedVersion: 1 })
        .expect(200);
      const withReason = await api(app, manager)
        .patch(path)
        .send({
          deadlineAt: '2026-12-11T10:00:00Z',
          reason: 'Khách hàng lùi lịch',
          expectedVersion: 2,
        })
        .expect(200);
      expect(withReason.body).toMatchObject({
        deadlineAt: '2026-12-11T10:00:00.000Z',
        version: 3,
      });
      const audit = await prisma.auditLog.findFirstOrThrow({
        where: {
          objectId: task.id,
          action: 'TASK_UPDATED',
          reason: { not: null },
        },
      });
      expect(audit).toMatchObject({
        reason: 'Khách hàng lùi lịch',
        beforeValue: { deadlineAt: '2026-12-10T10:00:00.000Z', version: 2 },
        afterValue: { deadlineAt: '2026-12-11T10:00:00.000Z', version: 3 },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'DONE', completedAt: new Date() },
      });
      const done = await api(app, manager)
        .patch(path)
        .send({ title: 'Sau DONE', expectedVersion: 3 })
        .expect(422);
      expect(done.body.error.code).toBe('INVALID_STATE_TRANSITION');
      await api(app, manager)
        .patch(`${path}/required-people`)
        .send({ requiredPeople: 5, expectedVersion: 3 })
        .expect(422);
    });

    it('tham chiếu sai được kiểm trước version (400 kể cả version cũ); milestone gán và bỏ được', async () => {
      const { manager, outsider, contentTeam, designTeam } = await setup();
      const task = await createTask(manager, contentTeam);
      const path = `/tasks/${task.id}`;
      const foreignWorkspace = await createWorkspace(app, outsider, 'Khác');
      const foreignSkill = await api(app, outsider)
        .post(`/workspaces/${foreignWorkspace}/skills`)
        .send({ name: 'SEO' })
        .expect(201);
      const bad = await api(app, manager)
        .patch(path)
        .send({ requiredSkillIds: [foreignSkill.body.id], expectedVersion: 9 })
        .expect(400);
      expect(bad.body.error.details.unknownSkillIds).toEqual([
        foreignSkill.body.id,
      ]);

      const contentMilestone = await prisma.milestone.create({
        data: {
          teamId: contentTeam,
          name: 'Tháng 12',
          deadlineAt: new Date('2026-12-31T00:00:00Z'),
        },
      });
      const designMilestone = await prisma.milestone.create({
        data: {
          teamId: designTeam,
          name: 'Ra mắt',
          deadlineAt: new Date('2026-12-31T00:00:00Z'),
        },
      });
      const mismatch = await api(app, manager)
        .patch(path)
        .send({ milestoneId: designMilestone.id, expectedVersion: 1 })
        .expect(422);
      expect(mismatch.body.error.code).toBe('MILESTONE_TEAM_MISMATCH');
      const assigned = await api(app, manager)
        .patch(path)
        .send({ milestoneId: contentMilestone.id, expectedVersion: 1 })
        .expect(200);
      expect(assigned.body).toMatchObject({
        milestoneName: 'Tháng 12',
        version: 2,
      });
      const removed = await api(app, manager)
        .patch(path)
        .send({ milestoneId: null, expectedVersion: 2 })
        .expect(200);
      expect(removed.body).toMatchObject({ milestoneId: null, version: 3 });
    });

    it('hai PATCH cùng expectedVersion chạy song song: một 200, một 409, version tăng đúng 1', async () => {
      const { manager, contentTeam } = await setup();
      const task = await createTask(manager, contentTeam);
      const results = await Promise.all(
        ['A', 'B'].map((suffix) =>
          api(app, manager)
            .patch(`/tasks/${task.id}`)
            .send({ title: `Tiêu đề ${suffix}`, expectedVersion: 1 }),
        ),
      );
      expect(
        results.map((result) => result.status).sort((a, b) => a - b),
      ).toEqual([200, 409]);
      const row = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(row.version).toBe(2);
      expect(await auditActions(prisma, task.id)).toEqual([
        'TASK_CREATED',
        'TASK_UPDATED',
      ]);
    });
  });

  describe('PATCH /tasks/{taskId}/required-people', () => {
    it('version, no-op và đổi thật; giá trị sai trả 400', async () => {
      const { manager, contentTeam } = await setup();
      const task = await createTask(manager, contentTeam);
      const path = `/tasks/${task.id}/required-people`;
      await api(app, manager)
        .patch(path)
        .send({ requiredPeople: 3, expectedVersion: 2 })
        .expect(409);
      const noop = await api(app, manager)
        .patch(path)
        .send({ requiredPeople: 2, expectedVersion: 1 })
        .expect(200);
      expect(noop.body.version).toBe(1);
      const changed = await api(app, manager)
        .patch(path)
        .send({ requiredPeople: 3, expectedVersion: 1 })
        .expect(200);
      expect(changed.body).toMatchObject({
        requiredPeople: 3,
        openWork: { requiredPeople: 3 },
        version: 2,
      });
      for (const requiredPeople of [0, -1, 1.5, '3']) {
        await api(app, manager)
          .patch(path)
          .send({ requiredPeople, expectedVersion: 2 })
          .expect(400);
      }
      expect(await auditActions(prisma, task.id)).toEqual([
        'TASK_CREATED',
        'TASK_REQUIRED_PEOPLE_CHANGED',
      ]);
    });
  });

  describe('Liên kết với WP-014B', () => {
    it('task tạo qua API chặn hạ quyền A (RESPONSIBILITY_REQUIRED) cho tới khi task DONE', async () => {
      const { manager, workspaceId, contentTeam } = await setup();
      const second = await user(app, 'manager2@example.com');
      await joinWorkspace(app, manager, second, workspaceId);
      await api(app, manager)
        .patch(`/workspaces/${workspaceId}/members/${second.id}`)
        .send({ role: 'MANAGER' })
        .expect(200);
      const task = await createTask(manager, contentTeam);

      const blocked = await api(app, second)
        .patch(`/workspaces/${workspaceId}/members/${manager.id}`)
        .send({ role: 'MEMBER' })
        .expect(422);
      expect(blocked.body.error.code).toBe('RESPONSIBILITY_REQUIRED');
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'DONE', completedAt: new Date() },
      });
      await api(app, second)
        .patch(`/workspaces/${workspaceId}/members/${manager.id}`)
        .send({ role: 'MEMBER' })
        .expect(200);
    });
  });
});
