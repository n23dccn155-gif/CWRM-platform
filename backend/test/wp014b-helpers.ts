import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { registerAndLogin } from './int-test-helpers.js';

export interface TestUser {
  id: string;
  accessToken: string;
  email: string;
}

/** Gọi API với Bearer token; trả về supertest Test để nối .send()/.expect(). */
export function api(app: INestApplication<App>, user?: TestUser) {
  const server = app.getHttpServer();
  const withAuth = (test: request.Test) =>
    user ? test.set('Authorization', `Bearer ${user.accessToken}`) : test;
  return {
    get: (path: string) => withAuth(request(server).get(`/api/v1${path}`)),
    post: (path: string) => withAuth(request(server).post(`/api/v1${path}`)),
    put: (path: string) => withAuth(request(server).put(`/api/v1${path}`)),
    patch: (path: string) => withAuth(request(server).patch(`/api/v1${path}`)),
    delete: (path: string) =>
      withAuth(request(server).delete(`/api/v1${path}`)),
  };
}

export async function user(
  app: INestApplication<App>,
  email: string,
  displayName = email.split('@')[0]!,
): Promise<TestUser> {
  return { ...(await registerAndLogin(app, email, displayName)), email };
}

export async function createWorkspace(
  app: INestApplication<App>,
  manager: TestUser,
  name = 'Marketing',
): Promise<string> {
  const response = await api(app, manager)
    .post('/workspaces')
    .send({ name })
    .expect(201);
  return response.body.id as string;
}

/** Mời rồi để người được mời tự Accept, đúng luồng thật. */
export async function joinWorkspace(
  app: INestApplication<App>,
  manager: TestUser,
  member: TestUser,
  workspaceId: string,
): Promise<void> {
  const invitation = await api(app, manager)
    .post(`/workspaces/${workspaceId}/invitations`)
    .send({ email: member.email })
    .expect(201);
  await api(app, member)
    .post(`/workspace-invitations/${invitation.body.id}/accept`)
    .expect(200);
}

export async function createTeam(
  app: INestApplication<App>,
  manager: TestUser,
  workspaceId: string,
  name = 'Content',
): Promise<string> {
  const response = await api(app, manager)
    .post(`/workspaces/${workspaceId}/teams`)
    .send({ name })
    .expect(201);
  return response.body.id as string;
}

export async function addToTeam(
  app: INestApplication<App>,
  manager: TestUser,
  teamId: string,
  member: TestUser,
): Promise<void> {
  await api(app, manager)
    .post(`/teams/${teamId}/members`)
    .send({ userId: member.id })
    .expect(201);
}

/** Tạo task trực tiếp qua Prisma để kiểm quy tắc A của task chưa DONE, không phụ thuộc API task. */
export async function createOpenTask(
  prisma: PrismaService,
  teamId: string,
  accountableUserId: string,
  status: 'TO_DO' | 'DONE' = 'TO_DO',
): Promise<string> {
  const task = await prisma.task.create({
    data: {
      teamId,
      accountableUserId,
      title: 'Task kiểm thử',
      status,
      assignmentMode: 'DIRECT',
      priority: 'MEDIUM',
      deadlineAt: new Date('2026-12-31T00:00:00.000Z'),
      deadlineType: 'FLEXIBLE',
      requiredPeople: 1,
    },
    select: { id: true },
  });
  return task.id;
}

export async function auditActions(
  prisma: PrismaService,
  objectId: string,
): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: { objectId },
    orderBy: { createdAt: 'asc' },
    select: { action: true },
  });
  return rows.map((row) => row.action);
}
