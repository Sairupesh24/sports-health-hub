-- AlterTable
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "enabled_modules" TEXT;
