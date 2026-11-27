-- WP-015A (CWRM-34): đồng bộ bảng tasks với ERD CWRM-11.
-- SQL do `prisma migrate diff` sinh rồi sửa tay: chuyển dữ liệu open_work_open trước khi xóa cột,
-- thêm CHECK mà Prisma Schema không biểu diễn được. Không đụng index lower(name) và CHECK của các migration trước.

-- CreateEnum
CREATE TYPE "open_work_closed_reason" AS ENUM ('FILLED', 'MANAGER_CLOSED');

-- CreateEnum
CREATE TYPE "qualifying_activity_type" AS ENUM ('PROGRESS_CHANGED', 'CHECKLIST_CHANGED', 'RESPONSIBLE_CONFIRMED', 'WORK_UPDATE');

-- AlterTable: các mốc Open Work và mốc dùng cho R13 theo ERD.
ALTER TABLE "tasks"
ADD COLUMN     "open_work_opened_at" TIMESTAMPTZ(3),
ADD COLUMN     "open_work_closed_at" TIMESTAMPTZ(3),
ADD COLUMN     "open_work_closed_reason" "open_work_closed_reason",
ADD COLUMN     "current_in_progress_since" TIMESTAMPTZ(3),
ADD COLUMN     "last_qualifying_activity_at" TIMESTAMPTZ(3),
ADD COLUMN     "last_qualifying_activity_type" "qualifying_activity_type",
ADD COLUMN     "current_review_since" TIMESTAMPTZ(3);

-- Chuyển dữ liệu: task đang mở Open Work lấy thời điểm tạo làm thời điểm mở (không có mốc chính xác hơn).
UPDATE "tasks" SET "open_work_opened_at" = "created_at" WHERE "open_work_open" = true;

-- Task đã ở IN_PROGRESS/REVIEW trước migration (chỉ có thể do dữ liệu tạo tay): lấy mốc gần nhất có sẵn
-- để các CHECK bên dưới áp dụng được.
UPDATE "tasks" SET "current_in_progress_since" = COALESCE("started_at", "updated_at")
WHERE "status" = 'IN_PROGRESS' AND "current_in_progress_since" IS NULL;
UPDATE "tasks" SET "current_review_since" = "updated_at"
WHERE "status" = 'REVIEW' AND "current_review_since" IS NULL;

ALTER TABLE "tasks" DROP COLUMN "open_work_open";

-- Open Work: chỉ đóng được sau khi đã mở; lý do đóng đi cùng thời điểm đóng; chỉ task OPEN_WORK mới mở.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_open_work_closed_after_opened_check" CHECK (
  "open_work_closed_at" IS NULL OR ("open_work_opened_at" IS NOT NULL AND "open_work_closed_at" >= "open_work_opened_at")
);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_open_work_closed_reason_check" CHECK (
  ("open_work_closed_at" IS NULL) = ("open_work_closed_reason" IS NULL)
);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_open_work_mode_check" CHECK (
  "open_work_opened_at" IS NULL OR "assignment_mode" = 'OPEN_WORK'
);

-- Cam kết ở CWRM-37 #10209: task IN_PROGRESS/REVIEW phải có mốc tương ứng cho Risk Engine (R13 và hạn review).
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_in_progress_since_check" CHECK (
  "status" <> 'IN_PROGRESS' OR "current_in_progress_since" IS NOT NULL
);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_review_since_check" CHECK (
  "status" <> 'REVIEW' OR "current_review_since" IS NOT NULL
);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_last_activity_pair_check" CHECK (
  ("last_qualifying_activity_at" IS NULL) = ("last_qualifying_activity_type" IS NULL)
);
