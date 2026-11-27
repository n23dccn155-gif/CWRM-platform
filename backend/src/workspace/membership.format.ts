import type { Prisma } from '../generated/prisma/client.js';

type Db = Prisma.TransactionClient;

export interface MembershipRow {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'MANAGER' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
  skillsVersion: number;
  user: { displayName: string };
}

export const MEMBERSHIP_SELECT = {
  id: true,
  workspaceId: true,
  userId: true,
  role: true,
  status: true,
  skillsVersion: true,
  user: { select: { displayName: true } },
} as const;

/** Gắn tập skill (sắp theo id) vào membership theo schema WorkspaceMembership 0.3.4-draft. */
export async function withSkills(db: Db, rows: MembershipRow[]) {
  if (rows.length === 0) return [];
  const skills = await db.memberSkill.findMany({
    where: {
      workspaceId: rows[0]!.workspaceId,
      userId: { in: rows.map((row) => row.userId) },
    },
    select: { userId: true, skillId: true },
    orderBy: { skillId: 'asc' },
  });
  const byUser = new Map<string, string[]>();
  for (const skill of skills) {
    const list = byUser.get(skill.userId) ?? [];
    list.push(skill.skillId);
    byUser.set(skill.userId, list);
  }
  return rows.map((row) => formatMembership(row, byUser.get(row.userId) ?? []));
}

export function formatMembership(row: MembershipRow, skillIds: string[]) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    status: row.status,
    displayName: row.user.displayName,
    skillIds,
    skillsVersion: row.skillsVersion,
  };
}
