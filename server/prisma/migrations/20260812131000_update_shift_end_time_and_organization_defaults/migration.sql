-- AlterTable: Add default_shift_end_time to organizations if not exists and update default checkout/shift end time to 18:00:00 (6:00 PM)
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_shift_end_time" TIME(6) DEFAULT '18:00:00'::time without time zone;
ALTER TABLE "organizations" ALTER COLUMN "default_checkout_time" SET DEFAULT '18:00:00'::time without time zone;

-- Update existing organization rows to 18:00:00 if defaulted to 22:00:00
UPDATE "organizations" 
SET "default_shift_end_time" = '18:00:00'::time without time zone 
WHERE "default_shift_end_time" IS NULL OR "default_shift_end_time" = '22:00:00'::time without time zone;

UPDATE "organizations" 
SET "default_checkout_time" = '18:00:00'::time without time zone 
WHERE "default_checkout_time" IS NULL OR "default_checkout_time" = '22:00:00'::time without time zone;
