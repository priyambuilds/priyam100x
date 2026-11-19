/*
  Warnings:

  - The values [CENCELLED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('FILLED', 'OPEN', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_valid_price"
CHECK("limitPriceCents" BETWEEN 1 AND 99);

ALTER TABLE "Order"
ADD CONSTRAINT "Order_valid_quantities"
CHECK (
  "quantity" > 0
  AND "remainingQuantity" BETWEEN 0 AND "quantity"
);

ALTER TABLE "Order" 
ADD CONSTRAINT "Order_valid_status_quantity"
CHECK (
  ("status" = 'OPEN' AND "remainingQuantity" > 0)
  OR ("status" = 'FILLED' AND "remainingQuantity" = 0)
  OR ("status" = 'CANCELLED' AND "remainingQuantity" > 0) 
);