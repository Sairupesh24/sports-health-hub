-- Create Table recurring_questionnaires
CREATE TABLE IF NOT EXISTS "recurring_questionnaires" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "client_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "recurrence_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "next_run" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_run" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_questionnaires_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for recurring_questionnaires
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_questionnaires_organization_id_fkey') THEN
        ALTER TABLE "recurring_questionnaires" ADD CONSTRAINT "recurring_questionnaires_organization_id_fkey" 
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_questionnaires_questionnaire_id_fkey') THEN
        ALTER TABLE "recurring_questionnaires" ADD CONSTRAINT "recurring_questionnaires_questionnaire_id_fkey" 
        FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_questionnaires_specialist_id_fkey') THEN
        ALTER TABLE "recurring_questionnaires" ADD CONSTRAINT "recurring_questionnaires_specialist_id_fkey" 
        FOREIGN KEY ("specialist_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- AlterTable organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_checkout_time" TIME DEFAULT '22:00:00';

-- AlterTable profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_analytics_access" BOOLEAN DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_assign_work_access" BOOLEAN DEFAULT false;

-- AlterTable packages
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "tax_percentage" DECIMAL DEFAULT 0;
ALTER TABLE "packages" ALTER COLUMN "category" SET DEFAULT 'Others';

-- AlterTable bills
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "date" DATE;
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "package_id" UUID;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_package_id_fkey') THEN
        ALTER TABLE "bills" ADD CONSTRAINT "bills_package_id_fkey" 
        FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- AlterTable sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "is_guest" BOOLEAN DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "guest_name" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "guest_contact" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "enquiry_id" UUID;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_enquiry_id_fkey') THEN
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_enquiry_id_fkey" 
        FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- AlterTable emergency_alerts
ALTER TABLE "emergency_alerts" ADD COLUMN IF NOT EXISTS "admin_decision" TEXT;
ALTER TABLE "emergency_alerts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable hrattendancelogs
ALTER TABLE "hrattendancelogs" ADD COLUMN IF NOT EXISTS "remark" TEXT;

-- AlterTable program_assignments
ALTER TABLE "program_assignments" ADD COLUMN IF NOT EXISTS "organization_id" UUID;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'program_assignments_organization_id_fkey') THEN
        ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_organization_id_fkey" 
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;
