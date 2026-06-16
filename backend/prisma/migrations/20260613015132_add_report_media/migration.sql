-- CreateTable
CREATE TABLE "ReportMedia" (
    "media_id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportMedia_pkey" PRIMARY KEY ("media_id")
);

-- AddForeignKey
ALTER TABLE "ReportMedia" ADD CONSTRAINT "ReportMedia_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Reports"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;
