/*
  Warnings:

  - You are about to drop the `RoomReviewComments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomReviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserReviewComments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserReviews` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoomReviewComments" DROP CONSTRAINT "RoomReviewComments_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "RoomReviewComments" DROP CONSTRAINT "RoomReviewComments_review_id_fkey";

-- DropForeignKey
ALTER TABLE "RoomReviews" DROP CONSTRAINT "RoomReviews_room_id_fkey";

-- DropForeignKey
ALTER TABLE "RoomReviews" DROP CONSTRAINT "RoomReviews_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "UserReviewComments" DROP CONSTRAINT "UserReviewComments_review_id_fkey";

-- DropForeignKey
ALTER TABLE "UserReviewComments" DROP CONSTRAINT "UserReviewComments_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserReviews" DROP CONSTRAINT "UserReviews_reviewer_id_fkey";

-- DropForeignKey
ALTER TABLE "UserReviews" DROP CONSTRAINT "UserReviews_target_user_id_fkey";

-- DropTable
DROP TABLE "RoomReviewComments";

-- DropTable
DROP TABLE "RoomReviews";

-- DropTable
DROP TABLE "UserReviewComments";

-- DropTable
DROP TABLE "UserReviews";
