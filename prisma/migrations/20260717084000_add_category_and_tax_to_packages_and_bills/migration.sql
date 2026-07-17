-- AlterTable
ALTER TABLE "packages" ADD COLUMN "category" TEXT;
ALTER TABLE "packages" ADD COLUMN "tax_amount" DECIMAL DEFAULT 0;

-- AlterTable
ALTER TABLE "bills" ADD COLUMN "tax_amount" DECIMAL DEFAULT 0;

-- AlterTable
ALTER TABLE "billitems" ADD COLUMN "tax_amount" DECIMAL DEFAULT 0;
