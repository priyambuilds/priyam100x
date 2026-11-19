-- AlterEnum
ALTER TYPE "WalletEntryType" ADD VALUE 'SPLIT';

-- AlterTable
ALTER TABLE "WalletEntry" ADD COLUMN     "marketId" TEXT;

-- AddForeignKey
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletEntry"
ADD CONSTRAINT "WalletEntry_valid_split"
CHECK (
  "type" <> 'SPLIT'
  OR (
    "amountCents" < 0
    AND "amountCents" % 100 = 0
    AND "marketId" IS NOT NULL
  )
)