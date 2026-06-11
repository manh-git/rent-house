/*
  Warnings:

  - You are about to drop the column `draft_data` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `payment_due_day` on the `Contracts` table. All the data in the column will be lost.
  - You are about to drop the column `create_at` on the `Payments` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_id` on the `Payments` table. All the data in the column will be lost.
  - You are about to drop the `Invoices` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `contract_id` to the `Payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoices" DROP CONSTRAINT "Invoices_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "Payments" DROP CONSTRAINT "Payments_invoice_id_fkey";

-- AlterTable
ALTER TABLE "Contracts" DROP COLUMN "draft_data",
DROP COLUMN "payment_due_day",
ADD COLUMN     "deposit_paid_at" TIMESTAMP(3),
ADD COLUMN     "deposit_transaction_id" TEXT,
ADD COLUMN     "escrow_release_date" TIMESTAMP(3),
ADD COLUMN     "escrow_status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Payments" DROP COLUMN "create_at",
DROP COLUMN "invoice_id",
ADD COLUMN     "contract_id" INTEGER NOT NULL,
ADD COLUMN     "transaction_id" TEXT,
ALTER COLUMN "paid_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Rooms" ADD COLUMN     "is_rented" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Invoices";

-- CreateTable
CREATE TABLE "Wallets" (
    "wallet_id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "Wallets_pkey" PRIMARY KEY ("wallet_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallets_owner_id_key" ON "Wallets"("owner_id");

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallets" ADD CONSTRAINT "Wallets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
