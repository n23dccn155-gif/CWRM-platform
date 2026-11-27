-- WP-014B (CWRM-33): Main Role theo team, version của team membership và tập skill,
-- capacity tuần, audit_logs dùng chung (EST-02). Thiết kế theo ERD 0.3.4-draft (P-01 PM duyệt 26/11/2026).
-- SQL do `prisma migrate diff` sinh rồi sắp lại bằng tay: chuyển dữ liệu member_roles trước khi xóa bảng,
-- thêm CHECK và trigger mà Prisma Schema không biểu diễn được.

-- CreateEnum
CREATE TYPE "capacity_status" AS ENUM ('PENDING_APPROVAL', 'APPROVED');

-- CreateEnum
CREATE TYPE "audit_actor_kind" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "team_memberships" ADD COLUMN     "main_role_id" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "workspace_memberships" ADD COLUMN     "skills_version" INTEGER NOT NULL DEFAULT 1;

-- Chuyển Main Role từ member_roles (cấp workspace) sang team_memberships.main_role_id (cấp team).
-- Chỉ lấy role cùng workspace với team; người có nhiều role thì lấy role được gán sớm nhất.
UPDATE "team_memberships" AS tm
SET "main_role_id" = picked."role_id"
FROM (
    SELECT DISTINCT ON (tm2."id") tm2."id" AS "team_membership_id", mr."role_id"
    FROM "team_memberships" AS tm2
    JOIN "teams" AS t ON t."id" = tm2."team_id"
    JOIN "member_roles" AS mr ON mr."user_id" = tm2."user_id" AND mr."workspace_id" = t."workspace_id"
    JOIN "roles" AS r ON r."id" = mr."role_id" AND r."workspace_id" = t."workspace_id"
    ORDER BY tm2."id", mr."created_at", mr."id"
) AS picked
WHERE tm."id" = picked."team_membership_id";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "member_roles_workspace_id_fkey";

-- DropTable
DROP TABLE "member_roles";

-- CreateTable
CREATE TABLE "member_capacities" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "declared_weekly_hours" DECIMAL(8,2) NOT NULL,
    "declared_at" TIMESTAMPTZ(3) NOT NULL,
    "approved_weekly_hours" DECIMAL(8,2),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "status" "capacity_status" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "member_capacities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_kind" "audit_actor_kind" NOT NULL,
    "object_type" VARCHAR(40) NOT NULL,
    "object_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_capacities_workspace_id_status_user_id_idx" ON "member_capacities"("workspace_id", "status", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_capacities_workspace_id_user_id_key" ON "member_capacities"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_object_type_object_id_created_at_idx" ON "audit_logs"("object_type", "object_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "team_memberships_team_id_main_role_id_idx" ON "team_memberships"("team_id", "main_role_id");

-- CreateIndex
CREATE INDEX "team_memberships_user_id_team_id_status_idx" ON "team_memberships"("user_id", "team_id", "status");

-- CreateIndex
CREATE INDEX "workspace_memberships_user_id_workspace_id_status_idx" ON "workspace_memberships"("user_id", "workspace_id", "status");

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_main_role_id_fkey" FOREIGN KEY ("main_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ràng buộc bổ sung theo ERD mục 6, không biểu diễn được trong Prisma Schema
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_version_check" CHECK ("version" >= 1);
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_skills_version_check" CHECK ("skills_version" >= 1);
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_version_check" CHECK ("version" >= 1);
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_declared_weekly_hours_check" CHECK ("declared_weekly_hours" >= 0);
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_approved_weekly_hours_check" CHECK ("approved_weekly_hours" IS NULL OR "approved_weekly_hours" >= 0);
-- APPROVED phải có đủ số đã duyệt, người duyệt và thời điểm duyệt (Risk Engine coi APPROVED + NULL là input sai).
-- Ba cột duyệt đi cùng nhau: hoặc cùng NULL (chưa từng duyệt), hoặc cùng có giá trị.
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_approval_complete_check" CHECK (
    ("approved_weekly_hours" IS NULL AND "approved_by_user_id" IS NULL AND "approved_at" IS NULL)
    OR ("approved_weekly_hours" IS NOT NULL AND "approved_by_user_id" IS NOT NULL AND "approved_at" IS NOT NULL)
);
ALTER TABLE "member_capacities" ADD CONSTRAINT "member_capacities_approved_status_check" CHECK ("status" <> 'APPROVED' OR "approved_weekly_hours" IS NOT NULL);
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_check" CHECK (
    ("actor_kind" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_kind" = 'SYSTEM' AND "actor_user_id" IS NULL)
);

-- audit_logs chỉ được thêm: chặn UPDATE và DELETE ở mức dòng (TRUNCATE của test không bị ảnh hưởng).
CREATE FUNCTION "audit_logs_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs là append-only, không được % dòng', TG_OP;
END;
$$;
CREATE TRIGGER "audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs"
    FOR EACH ROW EXECUTE FUNCTION "audit_logs_append_only"();
