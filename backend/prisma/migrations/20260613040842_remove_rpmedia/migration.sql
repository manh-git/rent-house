/*
  Warnings:

  - You are about to drop the `ReportMedia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReportMedia" DROP CONSTRAINT "ReportMedia_report_id_fkey";

-- DropTable
DROP TABLE "ReportMedia";
