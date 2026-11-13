import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const ids = {
  manager: '11111111-1111-4111-8111-111111111111',
  content: '22222222-2222-4222-8222-222222222222',
  designer: '33333333-3333-4333-8333-333333333333',
  workspace: '44444444-4444-4444-8444-444444444444',
  team: '55555555-5555-4555-8555-555555555555',
  contentRole: '66666666-6666-4666-8666-666666666661',
  designerRole: '66666666-6666-4666-8666-666666666662',
  copywritingSkill: '77777777-7777-4777-8777-777777777771',
  figmaSkill: '77777777-7777-4777-8777-777777777772',
  milestone: '88888888-8888-4888-8888-888888888888',
  contentTask: '99999999-9999-4999-8999-999999999991',
  posterTask: '99999999-9999-4999-8999-999999999992',
  adsTask: '99999999-9999-4999-8999-999999999993',
  managerMembership: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  contentMembership: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  designerMembership: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  managerTeamMembership: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  contentTeamMembership: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  designerTeamMembership: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  contentMemberRole: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  designerMemberRole: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  contentMemberSkill: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  designerMemberSkill: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  posterRoleRequirement: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  posterSkillRequirement: 'ffffffff-ffff-4fff-8fff-fffffffffff1',
} as const;

class SeedConfigurationError extends Error {}

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new SeedConfigurationError(
      'Thiếu biến môi trường bắt buộc: DATABASE_URL.',
    );
  }
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new SeedConfigurationError(
      'Thiếu biến môi trường bắt buộc: SEED_DEMO_PASSWORD.',
    );
  }
  const costValue = process.env.BCRYPT_COST?.trim() || '10';
  const cost = Number(costValue);
  if (!Number.isInteger(cost) || cost < 4 || cost > 31) {
    throw new SeedConfigurationError(
      'Biến môi trường BCRYPT_COST phải là số nguyên từ 4 đến 31.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const passwordHash = await bcrypt.hash(demoPassword, cost);
    const manager = await prisma.account.upsert({
      where: { id: ids.manager },
      create: {
        id: ids.manager,
        email: 'manager@example.com',
        passwordHash,
        displayName: 'Trưởng nhóm Marketing',
        isActive: true,
      },
      update: {
        email: 'manager@example.com',
        passwordHash,
        displayName: 'Trưởng nhóm Marketing',
        isActive: true,
      },
    });
    const content = await prisma.account.upsert({
      where: { id: ids.content },
      create: {
        id: ids.content,
        email: 'content@example.com',
        passwordHash,
        displayName: 'Chuyên viên nội dung',
        isActive: true,
      },
      update: {
        email: 'content@example.com',
        passwordHash,
        displayName: 'Chuyên viên nội dung',
        isActive: true,
      },
    });
    const designer = await prisma.account.upsert({
      where: { id: ids.designer },
      create: {
        id: ids.designer,
        email: 'designer@example.com',
        passwordHash,
        displayName: 'Thiết kế đồ họa',
        isActive: true,
      },
      update: {
        email: 'designer@example.com',
        passwordHash,
        displayName: 'Thiết kế đồ họa',
        isActive: true,
      },
    });

    await prisma.workspace.upsert({
      where: { id: ids.workspace },
      create: {
        id: ids.workspace,
        name: 'Marketing Demo',
        createdByUserId: manager.id,
      },
      update: { name: 'Marketing Demo', createdByUserId: manager.id },
    });

    for (const membership of [
      {
        id: ids.managerMembership,
        userId: manager.id,
        role: 'MANAGER' as const,
      },
      {
        id: ids.contentMembership,
        userId: content.id,
        role: 'MEMBER' as const,
      },
      {
        id: ids.designerMembership,
        userId: designer.id,
        role: 'MEMBER' as const,
      },
    ]) {
      await prisma.workspaceMembership.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: ids.workspace,
            userId: membership.userId,
          },
        },
        create: {
          id: membership.id,
          workspaceId: ids.workspace,
          userId: membership.userId,
          role: membership.role,
          status: 'ACTIVE',
        },
        update: { role: membership.role, status: 'ACTIVE' },
      });
    }

    await prisma.team.upsert({
      where: { id: ids.team },
      create: { id: ids.team, workspaceId: ids.workspace, name: 'Marketing' },
      update: { workspaceId: ids.workspace, name: 'Marketing' },
    });
    for (const member of [
      { id: ids.managerTeamMembership, userId: manager.id },
      { id: ids.contentTeamMembership, userId: content.id },
      { id: ids.designerTeamMembership, userId: designer.id },
    ]) {
      await prisma.teamMembership.upsert({
        where: { teamId_userId: { teamId: ids.team, userId: member.userId } },
        create: {
          id: member.id,
          teamId: ids.team,
          userId: member.userId,
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE' },
      });
    }

    await prisma.role.upsert({
      where: { id: ids.contentRole },
      create: {
        id: ids.contentRole,
        workspaceId: ids.workspace,
        name: 'Content',
      },
      update: { workspaceId: ids.workspace, name: 'Content' },
    });
    await prisma.role.upsert({
      where: { id: ids.designerRole },
      create: {
        id: ids.designerRole,
        workspaceId: ids.workspace,
        name: 'Designer',
      },
      update: { workspaceId: ids.workspace, name: 'Designer' },
    });
    await prisma.skill.upsert({
      where: { id: ids.copywritingSkill },
      create: {
        id: ids.copywritingSkill,
        workspaceId: ids.workspace,
        name: 'Copywriting',
      },
      update: { workspaceId: ids.workspace, name: 'Copywriting' },
    });
    await prisma.skill.upsert({
      where: { id: ids.figmaSkill },
      create: { id: ids.figmaSkill, workspaceId: ids.workspace, name: 'Figma' },
      update: { workspaceId: ids.workspace, name: 'Figma' },
    });

    await prisma.memberRole.upsert({
      where: {
        workspaceId_userId_roleId: {
          workspaceId: ids.workspace,
          userId: content.id,
          roleId: ids.contentRole,
        },
      },
      create: {
        id: ids.contentMemberRole,
        workspaceId: ids.workspace,
        userId: content.id,
        roleId: ids.contentRole,
      },
      update: {},
    });
    await prisma.memberRole.upsert({
      where: {
        workspaceId_userId_roleId: {
          workspaceId: ids.workspace,
          userId: designer.id,
          roleId: ids.designerRole,
        },
      },
      create: {
        id: ids.designerMemberRole,
        workspaceId: ids.workspace,
        userId: designer.id,
        roleId: ids.designerRole,
      },
      update: {},
    });
    await prisma.memberSkill.upsert({
      where: {
        workspaceId_userId_skillId: {
          workspaceId: ids.workspace,
          userId: content.id,
          skillId: ids.copywritingSkill,
        },
      },
      create: {
        id: ids.contentMemberSkill,
        workspaceId: ids.workspace,
        userId: content.id,
        skillId: ids.copywritingSkill,
      },
      update: {},
    });
    await prisma.memberSkill.upsert({
      where: {
        workspaceId_userId_skillId: {
          workspaceId: ids.workspace,
          userId: designer.id,
          skillId: ids.figmaSkill,
        },
      },
      create: {
        id: ids.designerMemberSkill,
        workspaceId: ids.workspace,
        userId: designer.id,
        skillId: ids.figmaSkill,
      },
      update: {},
    });

    const now = new Date();
    const addHours = (hours: number) =>
      new Date(now.getTime() + hours * 60 * 60 * 1000);
    await prisma.milestone.upsert({
      where: { id: ids.milestone },
      create: {
        id: ids.milestone,
        teamId: ids.team,
        name: 'Campaign Launch',
        deadlineAt: addHours(14 * 24),
      },
      update: {
        teamId: ids.team,
        name: 'Campaign Launch',
        deadlineAt: addHours(14 * 24),
      },
    });

    const tasks = [
      {
        id: ids.contentTask,
        title: 'Viết nội dung chiến dịch',
        assignmentMode: 'DIRECT' as const,
        openWorkOpen: false,
        priority: 'MEDIUM' as const,
        deadlineAt: addHours(5 * 24),
      },
      {
        id: ids.posterTask,
        title: 'Thiết kế poster chiến dịch',
        assignmentMode: 'OPEN_WORK' as const,
        openWorkOpen: true,
        priority: 'HIGH' as const,
        deadlineAt: addHours(40),
      },
      {
        id: ids.adsTask,
        title: 'Chạy quảng cáo',
        assignmentMode: 'DIRECT' as const,
        openWorkOpen: false,
        priority: 'MEDIUM' as const,
        deadlineAt: addHours(8 * 24),
      },
    ];
    for (const task of tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        create: {
          ...task,
          teamId: ids.team,
          milestoneId: ids.milestone,
          accountableUserId: manager.id,
          status: 'TO_DO',
          deadlineType: 'FLEXIBLE',
          requiredPeople: 1,
          progress: 0,
          version: 1,
        },
        update: {
          ...task,
          teamId: ids.team,
          milestoneId: ids.milestone,
          accountableUserId: manager.id,
          status: 'TO_DO',
          deadlineType: 'FLEXIBLE',
          requiredPeople: 1,
          progress: 0,
          version: 1,
        },
      });
    }
    await prisma.taskRoleRequirement.upsert({
      where: {
        taskId_roleId: { taskId: ids.posterTask, roleId: ids.designerRole },
      },
      create: {
        id: ids.posterRoleRequirement,
        taskId: ids.posterTask,
        roleId: ids.designerRole,
      },
      update: {},
    });
    await prisma.taskSkillRequirement.upsert({
      where: {
        taskId_skillId: { taskId: ids.posterTask, skillId: ids.figmaSkill },
      },
      create: {
        id: ids.posterSkillRequirement,
        taskId: ids.posterTask,
        skillId: ids.figmaSkill,
      },
      update: {},
    });

    const counts = await Promise.all([
      prisma.account.count(),
      prisma.workspace.count(),
      prisma.workspaceMembership.count(),
      prisma.workspaceInvitation.count(),
      prisma.team.count(),
      prisma.teamMembership.count(),
      prisma.role.count(),
      prisma.skill.count(),
      prisma.memberRole.count(),
      prisma.memberSkill.count(),
      prisma.milestone.count(),
      prisma.task.count(),
      prisma.taskRoleRequirement.count(),
      prisma.taskSkillRequirement.count(),
    ]);
    const tableNames = [
      'accounts',
      'workspaces',
      'workspace_memberships',
      'workspace_invitations',
      'teams',
      'team_memberships',
      'roles',
      'skills',
      'member_roles',
      'member_skills',
      'milestones',
      'tasks',
      'task_role_requirements',
      'task_skill_requirements',
    ];
    console.log('Seed hoàn tất. Số bản ghi hiện có:');
    tableNames.forEach((tableName, index) =>
      console.log(`- ${tableName}: ${counts[index]}`),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  if (error instanceof SeedConfigurationError) {
    console.error(error.message);
  } else {
    // Không in nguyên thông báo lỗi vì Prisma có thể kèm dữ liệu đầu vào (gồm hash mật khẩu).
    const name = error instanceof Error ? error.name : 'UnknownError';
    const code = (error as { code?: unknown }).code;
    console.error(
      `Seed thất bại (${name}${typeof code === 'string' ? ` ${code}` : ''}). Kiểm tra PostgreSQL đã chạy, đã áp dụng migration và DATABASE_URL đúng. Đặt DEBUG_SEED=1 để xem chi tiết.`,
    );
    if (process.env.DEBUG_SEED === '1') console.error(error);
  }
  process.exitCode = 1;
});
