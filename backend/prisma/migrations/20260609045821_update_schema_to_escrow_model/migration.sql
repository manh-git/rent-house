-- AlterTable
ALTER TABLE "Contracts" ADD COLUMN     "cancelled_by_user_id" INTEGER,
ADD COLUMN     "reason_cancel" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
