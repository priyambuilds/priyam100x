-- This means a deposit entry must have a positive amount. When we introduce other entry types, we’ll define their rules too.
ALTER TABLE "WalletEntry"
ADD CONSTRAINT "WalletEntry_positive_deposit"
CHECK (
  "type" <> 'DEPOSIT'
  OR "amountCents" > 0
);
