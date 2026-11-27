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
} from './wp014b-helpers.js';

describe('WP-014B · Member và Invitation với PostgreSQL', () => {
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

  describe('Invitation', () => {
    it('chỉ mời tài khoản đã đăng ký, chặn mời trùng và mời người đã là thành viên', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const workspaceId = await createWorkspace(app, manager);

      const unregistered = await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: 'chua-dang-ky@example.com' })
        .expect(422);
      expect(unregistered.body.error.code).toBe('INVITEE_NOT_REGISTERED');

      const created = await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: '  MEMBER@example.com ' })
        .expect(201);
      expect(created.body).toMatchObject({
        workspaceId,
        workspaceName: 'Marketing',
        invitedUserId: member.id,
        invitedByUserId: manager.id,
        status: 'PENDING',
      });

      const duplicate = await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: member.email })
        .expect(409);
      expect(duplicate.body.error).toMatchObject({
        code: 'UNIQUE_CONFLICT',
        details: { reason: 'INVITATION_PENDING' },
      });

      const self = await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: manager.email })
        .expect(409);
      expect(self.body.error.details.reason).toBe('ALREADY_MEMBER');
      expect(await auditActions(prisma, created.body.id)).toEqual([
        'INVITATION_CREATED',
      ]);
    });

    it('hai Manager mời cùng một người cùng lúc chỉ tạo một lời mời PENDING', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const workspaceId = await createWorkspace(app, manager);

      const results = await Promise.all(
        [1, 2, 3].map(() =>
          api(app, manager)
            .post(`/workspaces/${workspaceId}/invitations`)
            .send({ email: member.email }),
        ),
      );
      expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([
        201, 409, 409,
      ]);
      expect(
        await prisma.workspaceInvitation.count({
          where: { invitedUserId: member.id, status: 'PENDING' },
        }),
      ).toBe(1);
    });

    it('Accept tạo membership MEMBER ACTIVE với tập skill rỗng, version 1; không Accept hai lần', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const outsider = await user(app, 'outsider@example.com');
      const workspaceId = await createWorkspace(app, manager);
      const invitation = await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: member.email })
        .expect(201);

      const mine = await api(app, member)
        .get('/workspace-invitations')
        .expect(200);
      expect(mine.body).toMatchObject({ page: 1, pageSize: 20, total: 1 });
      const theirs = await api(app, outsider)
        .get('/workspace-invitations')
        .expect(200);
      expect(theirs.body.total).toBe(0);

      // Lời mời của người khác bị che như không tồn tại.
      await api(app, outsider)
        .post(`/workspace-invitations/${invitation.body.id}/accept`)
        .expect(404);

      const accepted = await api(app, member)
        .post(`/workspace-invitations/${invitation.body.id}/accept`)
        .expect(200);
      expect(accepted.body).toMatchObject({
        workspaceId,
        userId: member.id,
        role: 'MEMBER',
        status: 'ACTIVE',
        skillIds: [],
        skillsVersion: 1,
      });

      const again = await api(app, member)
        .post(`/workspace-invitations/${invitation.body.id}/accept`)
        .expect(422);
      expect(again.body.error).toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        details: { currentStatus: 'ACCEPTED' },
      });
      await api(app, member)
        .post(`/workspace-invitations/${invitation.body.id}/decline`)
        .expect(422);
      await api(app, member)
        .post('/workspace-invitations/khong-phai-uuid/accept')
        .expect(400);

      expect(await auditActions(prisma, invitation.body.id)).toEqual([
        'INVITATION_CREATED',
        'INVITATION_ACCEPTED',
      ]);
      expect(await auditActions(prisma, accepted.body.id)).toEqual([
        'MEMBERSHIP_JOINED',
      ]);
    });

    it('Decline không tạo membership; mời lại sau khi Decline được', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const workspaceId = await createWorkspace(app, manager);
      const invitation = await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: member.email })
        .expect(201);

      const declined = await api(app, member)
        .post(`/workspace-invitations/${invitation.body.id}/decline`)
        .expect(200);
      expect(declined.body.status).toBe('DECLINED');
      expect(
        await prisma.workspaceMembership.count({
          where: { workspaceId, userId: member.id },
        }),
      ).toBe(0);

      await api(app, manager)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: member.email })
        .expect(201);
      const listed = await api(app, manager)
        .get(`/workspaces/${workspaceId}/invitations`)
        .expect(200);
      expect(listed.body.total).toBe(2);
    });

    it('chỉ Manager được mời và xem lời mời của workspace', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const outsider = await user(app, 'outsider@example.com');
      const workspaceId = await createWorkspace(app, manager);
      await joinWorkspace(app, manager, member, workspaceId);

      await api(app, member)
        .post(`/workspaces/${workspaceId}/invitations`)
        .send({ email: outsider.email })
        .expect(403);
      await api(app, member)
        .get(`/workspaces/${workspaceId}/invitations`)
        .expect(403);
      await api(app, outsider)
        .get(`/workspaces/${workspaceId}/invitations`)
        .expect(404);
      await api(app).get(`/workspaces/${workspaceId}/invitations`).expect(401);
    });
  });

  describe('Member', () => {
    it('Manager liệt kê thành viên kèm skill; Member chỉ xem membership của chính mình', async () => {
      const manager = await user(app, 'manager@example.com', 'Quản lý');
      const member = await user(app, 'member@example.com', 'Thành viên');
      const workspaceId = await createWorkspace(app, manager);
      await joinWorkspace(app, manager, member, workspaceId);

      const listed = await api(app, manager)
        .get(`/workspaces/${workspaceId}/members?pageSize=1`)
        .expect(200);
      expect(listed.body).toMatchObject({ page: 1, pageSize: 1, total: 2 });
      expect(listed.body.items[0]).toMatchObject({
        userId: manager.id,
        role: 'MANAGER',
        displayName: 'Quản lý',
        skillIds: [],
        skillsVersion: 1,
      });
      expect(listed.body.items[0]).not.toHaveProperty('roleIds');
      await api(app, member)
        .get(`/workspaces/${workspaceId}/members`)
        .expect(403);

      await api(app, member)
        .get(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(200);
      await api(app, member)
        .get(`/workspaces/${workspaceId}/members/${manager.id}`)
        .expect(403);
      await api(app, manager)
        .get(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(200);
      await api(app, manager)
        .get(
          `/workspaces/${workspaceId}/members/00000000-0000-4000-8000-000000000000`,
        )
        .expect(404);
    });

    it('không hạ quyền, vô hiệu hóa hay gỡ Manager ACTIVE cuối cùng', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const workspaceId = await createWorkspace(app, manager);
      await joinWorkspace(app, manager, member, workspaceId);
      const path = `/workspaces/${workspaceId}/members/${manager.id}`;

      for (const body of [{ role: 'MEMBER' }, { status: 'INACTIVE' }]) {
        const response = await api(app, manager)
          .patch(path)
          .send(body)
          .expect(422);
        expect(response.body.error.code).toBe('LAST_MANAGER_REQUIRED');
      }
      const removed = await api(app, manager).delete(path).expect(422);
      expect(removed.body.error.code).toBe('LAST_MANAGER_REQUIRED');

      const empty = await api(app, manager).patch(path).send({}).expect(400);
      expect(empty.body.error.code).toBe('VALIDATION_ERROR');

      // Có Manager thứ hai thì hạ quyền Manager đầu được, kèm audit before/after/reason.
      const promoted = await api(app, manager)
        .patch(`/workspaces/${workspaceId}/members/${member.id}`)
        .send({ role: 'MANAGER', reason: 'Đồng quản lý chiến dịch' })
        .expect(200);
      expect(promoted.body.role).toBe('MANAGER');
      await api(app, manager).patch(path).send({ role: 'MEMBER' }).expect(200);
      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { objectId: promoted.body.id, action: 'MEMBERSHIP_UPDATED' },
      });
      expect(audit).toMatchObject({
        actorUserId: manager.id,
        actorKind: 'USER',
        action: 'MEMBERSHIP_UPDATED',
        beforeValue: { role: 'MEMBER', status: 'ACTIVE' },
        afterValue: { role: 'MANAGER', status: 'ACTIVE' },
        reason: 'Đồng quản lý chiến dịch',
      });
    });

    it('hai request hạ quyền hai Manager cuối cùng lúc: chỉ một request thành công', async () => {
      const first = await user(app, 'first@example.com');
      const second = await user(app, 'second@example.com');
      const workspaceId = await createWorkspace(app, first);
      await joinWorkspace(app, first, second, workspaceId);
      await api(app, first)
        .patch(`/workspaces/${workspaceId}/members/${second.id}`)
        .send({ role: 'MANAGER' })
        .expect(200);

      const results = await Promise.all([
        api(app, first)
          .patch(`/workspaces/${workspaceId}/members/${first.id}`)
          .send({ role: 'MEMBER' }),
        api(app, second)
          .patch(`/workspaces/${workspaceId}/members/${second.id}`)
          .send({ role: 'MEMBER' }),
      ]);
      expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([
        200, 422,
      ]);
      expect(
        await prisma.workspaceMembership.count({
          where: { workspaceId, role: 'MANAGER', status: 'ACTIVE' },
        }),
      ).toBe(1);
    });

    it('không hạ quyền Manager đang là A của task chưa DONE', async () => {
      const manager = await user(app, 'manager@example.com');
      const other = await user(app, 'other@example.com');
      const workspaceId = await createWorkspace(app, manager);
      await joinWorkspace(app, manager, other, workspaceId);
      await api(app, manager)
        .patch(`/workspaces/${workspaceId}/members/${other.id}`)
        .send({ role: 'MANAGER' })
        .expect(200);
      const teamId = await createTeam(app, manager, workspaceId);
      await addToTeam(app, manager, teamId, manager);
      await createOpenTask(prisma, teamId, manager.id);

      const blocked = await api(app, other)
        .patch(`/workspaces/${workspaceId}/members/${manager.id}`)
        .send({ role: 'MEMBER' })
        .expect(422);
      expect(blocked.body.error).toMatchObject({
        code: 'RESPONSIBILITY_REQUIRED',
        details: { openAccountableTaskCount: 1 },
      });

      await prisma.task.updateMany({ data: { status: 'DONE' } });
      await api(app, other)
        .patch(`/workspaces/${workspaceId}/members/${manager.id}`)
        .send({ role: 'MEMBER' })
        .expect(200);
    });

    it('gỡ thành viên: membership INACTIVE, rời mọi team, mất quyền truy cập; mời lại thì ACTIVE trở lại', async () => {
      const manager = await user(app, 'manager@example.com');
      const member = await user(app, 'member@example.com');
      const workspaceId = await createWorkspace(app, manager);
      await joinWorkspace(app, manager, member, workspaceId);
      const teamId = await createTeam(app, manager, workspaceId);
      await addToTeam(app, manager, teamId, member);

      await api(app, manager)
        .delete(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(204);
      const membership = await prisma.workspaceMembership.findUniqueOrThrow({
        where: { workspaceId_userId: { workspaceId, userId: member.id } },
      });
      expect(membership.status).toBe('INACTIVE');
      const teamMembership = await prisma.teamMembership.findUniqueOrThrow({
        where: { teamId_userId: { teamId, userId: member.id } },
      });
      expect(teamMembership).toMatchObject({ status: 'INACTIVE', version: 2 });
      await api(app, member).get(`/workspaces/${workspaceId}`).expect(404);
      await api(app, member).get(`/teams/${teamId}`).expect(404);
      // Gỡ lần nữa là no-op.
      await api(app, manager)
        .delete(`/workspaces/${workspaceId}/members/${member.id}`)
        .expect(204);

      await joinWorkspace(app, manager, member, workspaceId);
      await api(app, member).get(`/workspaces/${workspaceId}`).expect(200);
      // C33-02.2: tham gia lại workspace không tự khôi phục team cũ.
      await api(app, member).get(`/teams/${teamId}`).expect(404);
      expect(
        (
          await prisma.teamMembership.findUniqueOrThrow({
            where: { teamId_userId: { teamId, userId: member.id } },
          })
        ).status,
      ).toBe('INACTIVE');
      expect(await auditActions(prisma, membership.id)).toEqual([
        'MEMBERSHIP_JOINED',
        'MEMBERSHIP_REMOVED',
        'MEMBERSHIP_JOINED',
      ]);
    });
  });
});
