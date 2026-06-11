-- CreateTable
CREATE TABLE "WithdrawalRequests" (
    "withdrawal_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequests_pkey" PRIMARY KEY ("withdrawal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequests_contract_id_key" ON "WithdrawalRequests"("contract_id");

-- AddForeignKey
ALTER TABLE "WithdrawalRequests" ADD CONSTRAINT "WithdrawalRequests_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;
