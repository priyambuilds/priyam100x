-- AlterEnum
ALTER TYPE "WalletEntryType" ADD VALUE 'MERGE';

ALTER TABLE "WalletEntry"
ADD CONSTRAINT "WalletEntry_valid_merge"
CHECK(
  "type" <> 'MERGE'
  OR (
    "amountCents" > 0
    AND "amountCents" % 100 = 0
    AND "marketId" IS NOT NULL
  )
)