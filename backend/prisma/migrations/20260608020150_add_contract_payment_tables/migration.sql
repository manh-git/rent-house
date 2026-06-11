-- AlterTable
ALTER TABLE "Contracts" ADD COLUMN     "contract_url" TEXT,
ADD COLUMN     "deposit_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "draft_data" JSONB,
ADD COLUMN     "owner_confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_due_day" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "tenant_confirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Signatures" (
    "signature_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature_ip" TEXT NOT NULL,

    CONSTRAINT "Signatures_pkey" PRIMARY KEY ("signature_id")
);

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
