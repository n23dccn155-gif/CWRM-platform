import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { clearPublicTables, createIntegrationApp } from './int-test-helpers.js';
import {
  addToTeam,
  api,
  auditActions,
  createOpenTask,
  createTeam,
  createWorkspace,
  joinWorkspace,
  user,
  type TestUser,
} from './wp014b-helpers.js';

describe('WP-014B · Team, Main Role, Role/Skill và my-skills với PostgreSQL', () => {
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
    const outsider = await user(app, 'outsider@example.com');
    const workspaceId = await createWorkspace(app, manager);
    await joinWorkspace(app, manager, member, workspaceId);
    return { manager, member, outsider, workspaceId };
  }

  describe('Team', () => {
    it('tên team duy nhất không phân biệt hoa thường khi tạo và khi đổi tên', async () => {
      const { manager, workspaceId } = await setup();
      const teamId = await createTeam(app, manager, workspaceId, 'Content');
      const otherId = await createTeam(app, manager, workspaceId, 'Design');

      const duplicate = await api(app, manager)
        .post(`/workspaces/${workspaceId}/teams`)
        .send({ name: '  cONTENT ' })
        .expect(409);
      expect(duplicate.body.error).toMatchObject({
        code: 'UNIQUE_CONFLICT',
        details: { field: 'name' },
      });
      await api(app, manager)
        .patch(`/teams/${otherId}`)
        .send({ name: 'content' })
        .expect(409);

      const renamed = await api(app, manager)
        .patch(`/teams/${teamId}`)
        .send({ name: 'Nội dung' })
        .expect(200);
      expect(renamed.body).toEqual({
        id: teamId,
        workspaceId,
        name: 'Nội dung',
      });
      expect(await auditActions(prisma, teamId)).toEqual([
        'TEAM_CREATED',
        'TEAM_RENAMED',
      ]);
    });

    it('Manager thấy mọi team; Member chỉ thấy và truy cập team mình thuộc (TEAM_ACCESS)', async () => {
      const { manager, member, outsider, workspaceId } = await setup();
      const mine = await createTeam(app, manager, workspaceId, 'Content');
      const notMine = await createTeam(app, manager, workspaceId, 'Design');
      await addToTeam(app, manager, mine, member);

      const managerList = await api(app, manager)
        .get(`/workspaces/${workspaceId}/teams`)
        .expect(200);
      expect(managerList.body.total).toBe(2);
      const memberList = await api(app, member)
        .get(`/workspaces/${workspaceId}/teams`)
        .expect(200);
      expect(memberList.body.items.map((t: { id: string }) => t.id)).toEqual([
        mine,
      ]);

      await api(app, member).get(`/teams/${mine}`).expect(200);
      await api(app, member).get(`/teams/${mine}/members`).expect(200);
      const hidden = await api(app, member)
        .get(`/teams/${notMine}`)
        .expect(404);
      const missing = await api(app, member)
        .get('/teams/00000000-0000-4000-8000-000000000000')
        .expect(404);
      expect(hidden.body).toEqual(missing.body);
      await api(app, outsider).get(`/teams/${mine}`).expect(404);
      await api(app, member)
        .patch(`/teams/${mine}`)
        .send({ name: 'Đổi' })
        .expect(403);
      // C33-02.1: thao tác Manager trên team Member không nhìn thấy trả 404 như team không tồn tại.
      const hiddenWrite = await api(app, member)
        .patch(`/teams/${notMine}`)
        .send({ name: 'Đổi' })
        .expect(404);
      expect(hiddenWrite.body).toEqual(missing.body);
      await api(app, member)
        .post(`/teams/${notMine}/members`)
        .send({ userId: member.id })
        .expect(404);
      await api(app, member)
        .post(`/workspaces/${workspaceId}/teams`)
        .send({ name: 'Mới' })
        .expect(403);
      await api(app, manager).get('/teams/khong-phai-uuid').expect(400);
    });

    it('thêm thành viên team: phải là thành viên ACTIVE của workspace, không thêm trùng', async () => {
      const { manager, member, outsider, workspaceId } = await setup();
      const teamId = await createTeam(app, manager, workspaceId);

      const notInWorkspace = await api(app, manager)
        .post(`/teams/${teamId}/members`)
        .send({ userId: outsider.id })
        .expect(400);
      expect(notInWorkspace.body.error.details.fields).toHaveProperty('userId');

      const added = await api(app, manager)
        .post(`/teams/${teamId}/members`)
        .send({ userId: member.id })
        .expect(201);
      expect(added.body).toMatchObject({
        teamId,
        userId: member.id,
        status: 'ACTIVE',
        workspaceRole: 'MEMBER',
        mainRoleId: null,
        mainRoleName: null,
        displayName: 'Thành viên',
        version: 1,
      });
      await api(app, manager)
        .post(`/teams/${teamId}/members`)
        .send({ userId: member.id })
        .expect(409);
    });

    it('gỡ thành viên team: chặn A của task chưa DONE; gỡ xong thêm lại thì kích hoạt lại, không khôi phục Main Role', async () => {
      const { manager, member, workspaceId } = await setup();
      const teamId = await createTeam(app, manager, workspaceId);
      await addToTeam(app, manager, teamId, manager);
      await addToTeam(app, manager, teamId, member);
      await createOpenTask(prisma, teamId, manager.id);
      const role = await api(app, manager)
        .post(`/workspaces/${workspaceId}/roles`)
        .send({ name: 'Content' })
        .expect(201);
      await api(app, manager)
        .patch(`/teams/${teamId}/members/${member.id}`)
        .send({ mainRoleId: role.body.id, expectedVersion: 1 })
        .expect(200);

      const blocked = await api(app, manager)
        .delete(`/teams/${teamId}/members/${manager.id}`)
        .expect(422);
      expect(blocked.body.error.code).toBe('RESPONSIBILITY_REQUIRED');

      await api(app, manager)
        .delete(`/teams/${teamId}/members/${member.id}`)
        .expect(204);
      await api(app, member).get(`/teams/${teamId}`).expect(404);
      await api(app, manager)
        .delete(`/teams/${teamId}/members/${member.id}`)
        .expect(404);

      const readded = await api(app, manager)
        .post(`/teams/${teamId}/members`)
        .send({ userId: member.id })
        .expect(201);
      expect(readded.body).toMatchObject({
        status: 'ACTIVE',
        mainRoleId: null,
        version: 4,
      });
    });
  });

  describe('Main Role', () => {
    async function setupMainRole() {
      const context = await setup();
      const teamId = await createTeam(
        app,
        context.manager,
        context.workspaceId,
      );
      await addToTeam(app, context.manager, teamId, context.member);
      const role = await api(app, context.manager)
        .post(`/workspaces/${context.workspaceId}/roles`)
        .send({ name: 'Content Writer' })
        .expect(201);
      return { ...context, teamId, roleId: role.body.id as string };
    }

    it('đặt, no-op và bỏ Main Role theo expectedVersion', async () => {
      const { manager, member, teamId, roleId } = await setupMainRole();
      const path = `/teams/${teamId}/members/${member.id}`;

      const stale = await api(app, manager)
        .patch(path)
        .send({ mainRoleId: roleId, expectedVersion: 2 })
        .expect(409);
      expect(stale.body.error).toMatchObject({
        code: 'VERSION_CONFLICT',
        details: { currentVersion: 1 },
      });

      const set = await api(app, manager)
        .patch(path)
        .send({ mainRoleId: roleId, expectedVersion: 1 })
        .expect(200);
      expect(set.body).toMatchObject({
        mainRoleId: roleId,
        mainRoleName: 'Content Writer',
        version: 2,
      });
      const noop = await api(app, manager)
        .patch(path)
        .send({ mainRoleId: roleId, expectedVersion: 2 })
        .expect(200);
      expect(noop.body.version).toBe(2);
      const cleared = await api(app, manager)
        .patch(path)
        .send({ mainRoleId: null, expectedVersion: 2 })
        .expect(200);
      expect(cleared.body).toMatchObject({ mainRoleId: null, version: 3 });

      const missingField = await api(app, manager)
        .patch(path)
        .send({ expectedVersion: 3 })
        .expect(400);
      expect(missingField.body.error.details.fields).toHaveProperty(
        'mainRoleId',
      );
      const membership = await prisma.teamMembership.findUniqueOrThrow({
        where: { teamId_userId: { teamId, userId: member.id } },
      });
      expect(await auditActions(prisma, membership.id)).toEqual([
        'TEAM_MEMBER_ADDED',
        'TEAM_MEMBER_MAIN_ROLE_CHANGED',
        'TEAM_MEMBER_MAIN_ROLE_CHANGED',
      ]);
    });

    it('Main Role phải thuộc cùng workspace; Member không đặt Main Role', async () => {
      const { manager, member, teamId, outsider } = await setupMainRole();
      const otherWorkspace = await createWorkspace(app, outsider, 'Khác');
      const foreignRole = await api(app, outsider)
        .post(`/workspaces/${otherWorkspace}/roles`)
        .send({ name: 'Designer' })
        .expect(201);
      const path = `/teams/${teamId}/members/${member.id}`;

      const foreign = await api(app, manager)
        .patch(path)
        .send({ mainRoleId: foreignRole.body.id, expectedVersion: 1 })
        .expect(400);
      expect(foreign.body.error.details.fields).toHaveProperty('mainRoleId');
      // C33-03.2: kiểm request trước expectedVersion, nên tham chiếu sai kèm version cũ vẫn là 400.
      await api(app, manager)
        .patch(path)
        .send({ mainRoleId: foreignRole.body.id, expectedVersion: 9 })
        .expect(400);
      await api(app, member)
        .patch(path)
        .send({ mainRoleId: null, expectedVersion: 1 })
        .expect(403);
    });
  });

  describe('Role và Skill', () => {
    it('CRUD danh mục, trùng tên không phân biệt hoa thường, không xóa khi đang dùng', async () => {
      const { manager, member, workspaceId } = await setup();
      const teamId = await createTeam(app, manager, workspaceId);
      await addToTeam(app, manager, teamId, member);

      const role = await api(app, manager)
        .post(`/workspaces/${workspaceId}/roles`)
        .send({ name: ' Designer ', description: 'Thiết kế' })
        .expect(201);
      expect(role.body).toMatchObject({
        workspaceId,
        name: 'Designer',
        description: 'Thiết kế',
      });
      await api(app, manager)
        .post(`/workspaces/${workspaceId}/roles`)
        .send({ name: 'designer' })
        .expect(409);
      // Role và skill là hai danh mục riêng nên trùng tên với nhau không sao.
      const skill = await api(app, manager)
        .post(`/workspaces/${workspaceId}/skills`)
        .send({ name: 'Designer' })
        .expect(201);
      expect(skill.body.description).toBeNull();

      const updated = await api(app, manager)
        .patch(`/roles/${role.body.id}`)
        .send({ name: 'Graphic Designer' })
        .expect(200);
      expect(updated.body).toMatchObject({
        name: 'Graphic Designer',
        description: 'Thiết kế',
      });
      const cleared = await api(app, manager)
        .patch(`/roles/${role.body.id}`)
        .send({ name: 'Graphic Designer', description: '  ' })
        .expect(200);
      expect(cleared.body.description).toBeNull();

      const memberView = await api(app, member)
        .get(`/workspaces/${workspaceId}/roles`)
        .expect(200);
      expect(memberView.body.total).toBe(1);
      await api(app, member)
        .post(`/workspaces/${workspaceId}/skills`)
        .send({ name: 'Figma' })
        .expect(403);
      await api(app, member).delete(`/skills/${skill.body.id}`).expect(403);

      await api(app, manager)
        .patch(`/teams/${teamId}/members/${member.id}`)
        .send({ mainRoleId: role.body.id, expectedVersion: 1 })
        .expect(200);
      const inUse = await api(app, manager)
        .delete(`/roles/${role.body.id}`)
        .expect(409);
      expect(inUse.body.error.details).toMatchObject({
        reason: 'IN_USE',
        references: { teamMemberships: 1, tasks: 0 },
      });

      await api(app, member)
        .put(`/workspaces/${workspaceId}/my-skills`)
        .send({ skillIds: [skill.body.id], expectedVersion: 1 })
        .expect(200);
      await api(app, manager).delete(`/skills/${skill.body.id}`).expect(409);
      await api(app, member)
        .put(`/workspaces/${workspaceId}/my-skills`)
        .send({ skillIds: [], expectedVersion: 2 })
        .expect(200);
      await api(app, manager).delete(`/skills/${skill.body.id}`).expect(204);
      await api(app, manager).delete(`/skills/${skill.body.id}`).expect(404);
      expect(await auditActions(prisma, skill.body.id)).toEqual([
        'SKILL_CREATED',
        'SKILL_DELETED',
      ]);
    });

    it('role/skill của workspace khác bị che bằng 404', async () => {
      const { manager, outsider } = await setup();
      const otherWorkspace = await createWorkspace(app, outsider, 'Khác');
      const foreign = await api(app, outsider)
        .post(`/workspaces/${otherWorkspace}/skills`)
        .send({ name: 'SEO' })
        .expect(201);
      await api(app, manager)
        .patch(`/skills/${foreign.body.id}`)
        .send({ name: 'Đổi' })
        .expect(404);
      await api(app, manager).delete(`/skills/${foreign.body.id}`).expect(404);
    });
  });

  describe('PUT my-skills (P-01)', () => {
    async function skills(manager: TestUser, workspaceId: string) {
      const ids: string[] = [];
      for (const name of ['Copywriting', 'Figma', 'SEO']) {
        const response = await api(app, manager)
          .post(`/workspaces/${workspaceId}/skills`)
          .send({ name })
          .expect(201);
        ids.push(response.body.id as string);
      }
      return ids;
    }

    it('version thuộc cả tập; tập rỗng hợp lệ; no-op không tăng; version cũ trả 409 kể cả payload trùng', async () => {
      const { manager, member, workspaceId } = await setup();
      const [a, b, c] = await skills(manager, workspaceId);
      const path = `/workspaces/${workspaceId}/my-skills`;

      const emptyNoop = await api(app, member)
        .put(path)
        .send({ skillIds: [], expectedVersion: 1 })
        .expect(200);
      expect(emptyNoop.body).toEqual({ skillIds: [], version: 1 });

      const set = await api(app, member)
        .put(path)
        .send({ skillIds: [b, a], expectedVersion: 1 })
        .expect(200);
      expect(set.body).toEqual({ skillIds: [a, b].sort(), version: 2 });

      const reordered = await api(app, member)
        .put(path)
        .send({ skillIds: [a, b], expectedVersion: 2 })
        .expect(200);
      expect(reordered.body.version).toBe(2);

      const stale = await api(app, member)
        .put(path)
        .send({ skillIds: [a, b], expectedVersion: 1 })
        .expect(409);
      expect(stale.body.error).toMatchObject({
        code: 'VERSION_CONFLICT',
        details: { currentVersion: 2 },
      });

      const changed = await api(app, member)
        .put(path)
        .send({ skillIds: [c], expectedVersion: 2 })
        .expect(200);
      expect(changed.body).toEqual({ skillIds: [c], version: 3 });
      const cleared = await api(app, member)
        .put(path)
        .send({ skillIds: [], expectedVersion: 3 })
        .expect(200);
      expect(cleared.body).toEqual({ skillIds: [], version: 4 });

      const membership = await api(app, member)
        .get(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(200);
      expect(membership.body).toMatchObject({ skillIds: [], skillsVersion: 4 });
      expect(await auditActions(prisma, membership.body.id)).toEqual([
        'MEMBERSHIP_JOINED',
        'MEMBER_SKILLS_REPLACED',
        'MEMBER_SKILLS_REPLACED',
        'MEMBER_SKILLS_REPLACED',
      ]);
    });

    it('từ chối skill ngoài workspace, phần tử trùng, sai kiểu; không đổi tập khi lỗi', async () => {
      const { manager, member, outsider, workspaceId } = await setup();
      const [a] = await skills(manager, workspaceId);
      const otherWorkspace = await createWorkspace(app, outsider, 'Khác');
      const foreign = await api(app, outsider)
        .post(`/workspaces/${otherWorkspace}/skills`)
        .send({ name: 'Foreign' })
        .expect(201);
      const path = `/workspaces/${workspaceId}/my-skills`;

      const rejected = await api(app, member)
        .put(path)
        .send({ skillIds: [a, foreign.body.id], expectedVersion: 1 })
        .expect(400);
      expect(rejected.body.error.details.unknownSkillIds).toEqual([
        foreign.body.id,
      ]);
      await api(app, member)
        .put(path)
        .send({ skillIds: [a, a], expectedVersion: 1 })
        .expect(400);
      await api(app, member)
        .put(path)
        .send({ skillIds: ['khong-phai-uuid'], expectedVersion: 1 })
        .expect(400);
      await api(app, member)
        .put(path)
        .send({ skillIds: [a], expectedVersion: 0 })
        .expect(400);
      await api(app, member)
        .put(path)
        .send({ skillIds: [a], expectedVersion: 1, userId: manager.id })
        .expect(400);
      await api(app, outsider)
        .put(path)
        .send({ skillIds: [], expectedVersion: 1 })
        .expect(404);
      expect(await prisma.memberSkill.count()).toBe(0);
    });

    it('hai PUT cùng expectedVersion chạy song song: một 200, một 409, version tăng đúng 1', async () => {
      const { manager, member, workspaceId } = await setup();
      const [a, b] = await skills(manager, workspaceId);
      const path = `/workspaces/${workspaceId}/my-skills`;

      const results = await Promise.all([
        api(app, member)
          .put(path)
          .send({ skillIds: [a], expectedVersion: 1 }),
        api(app, member)
          .put(path)
          .send({ skillIds: [b], expectedVersion: 1 }),
      ]);
      expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([
        200, 409,
      ]);
      const membership = await prisma.workspaceMembership.findUniqueOrThrow({
        where: { workspaceId_userId: { workspaceId, userId: member.id } },
      });
      expect(membership.skillsVersion).toBe(2);
      expect(await prisma.memberSkill.count()).toBe(1);
    });
  });
});
