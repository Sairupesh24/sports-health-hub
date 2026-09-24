-- AlterTable
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "date" DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS "package_id" UUID;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "default_checkout_time" SET DEFAULT '22:00:00'::time without time zone;

-- AlterTable
ALTER TABLE "packages" ALTER COLUMN "tax_amount" SET NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_analytics_access" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "has_assign_work_access" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_from_session_id" UUID,
ADD COLUMN IF NOT EXISTS "rescheduled_to_session_id" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_tracker_automation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "is_enabled" BOOLEAN DEFAULT false,
    "recipient_emails" TEXT NOT NULL DEFAULT '',
    "scheduled_time" TEXT NOT NULL DEFAULT '18:00',
    "last_sent_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_tracker_automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" UUID,
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hr_leave_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "casual_leave" INTEGER DEFAULT 12,
    "sick_leave" INTEGER DEFAULT 4,
    "paid_leave" INTEGER DEFAULT 0,
    "emergency_leave" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "nutrition_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID,
    "organization_id" UUID,
    "nutritionist_id" UUID,
    "name" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "profession" TEXT,
    "client_type" TEXT DEFAULT 'athlete',
    "sport" TEXT,
    "position" TEXT,
    "training_age" TEXT,
    "competition_level" TEXT,
    "exercise" BOOLEAN DEFAULT true,
    "exercise_duration" TEXT,
    "training_sessions_count" INTEGER,
    "exercise_type" TEXT,
    "height_cm" DECIMAL,
    "weight_kg" DECIMAL,
    "body_fat_pct" DECIMAL,
    "muscle_mass_kg" DECIMAL,
    "bmi" DECIMAL,
    "complaints" TEXT,
    "biochemical_interpretations" TEXT,
    "medical_history" TEXT,
    "other_medications" TEXT,
    "allergies_intolerances" JSONB DEFAULT '[]',
    "dietary_preference" TEXT DEFAULT 'Non-Vegetarian',
    "sleep_duration_hours" DECIMAL,
    "daily_fluid_intake_l" DECIMAL,
    "timeline_recall" JSONB DEFAULT '{}',
    "session_1" JSONB DEFAULT '{}',
    "session_2" JSONB DEFAULT '{}',
    "supplements" JSONB DEFAULT '[]',
    "observations" TEXT,
    "goal" TEXT,
    "advice_prescription" TEXT,
    "taken_by" TEXT,
    "assessment_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_app_activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "active_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_ping" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_app_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "unique_org_employee_leave_balance" ON "hr_leave_balances"("organization_id" ASC, "employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_date" ON "user_app_activity"("user_id" ASC, "date" ASC);

-- AddForeignKey
ALTER TABLE "activity_tracker_automation" DROP CONSTRAINT IF EXISTS "activity_tracker_automation_organization_id_fkey";
ALTER TABLE "activity_tracker_automation" ADD CONSTRAINT "activity_tracker_automation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_organization_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_performed_by_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_package_id_fkey";
ALTER TABLE "bills" ADD CONSTRAINT "bills_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_leave_balances" DROP CONSTRAINT IF EXISTS "hr_leave_balances_employee_id_fkey";
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_leave_balances" DROP CONSTRAINT IF EXISTS "hr_leave_balances_organization_id_fkey";
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nutrition_assessments" DROP CONSTRAINT IF EXISTS "nutrition_assessments_client_id_fkey";
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nutrition_assessments" DROP CONSTRAINT IF EXISTS "nutrition_assessments_nutritionist_id_fkey";
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nutrition_assessments" DROP CONSTRAINT IF EXISTS "nutrition_assessments_organization_id_fkey";
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recurring_questionnaires" DROP CONSTRAINT IF EXISTS "recurring_questionnaires_organization_id_fkey";
ALTER TABLE "recurring_questionnaires" ADD CONSTRAINT "recurring_questionnaires_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recurring_questionnaires" DROP CONSTRAINT IF EXISTS "recurring_questionnaires_questionnaire_id_fkey";
ALTER TABLE "recurring_questionnaires" ADD CONSTRAINT "recurring_questionnaires_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recurring_questionnaires" DROP CONSTRAINT IF EXISTS "recurring_questionnaires_specialist_id_fkey";
ALTER TABLE "recurring_questionnaires" ADD CONSTRAINT "recurring_questionnaires_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_rescheduled_from_session_id_fkey";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_from_session_id_fkey" FOREIGN KEY ("rescheduled_from_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_rescheduled_to_session_id_fkey";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_to_session_id_fkey" FOREIGN KEY ("rescheduled_to_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_app_activity" DROP CONSTRAINT IF EXISTS "user_app_activity_user_id_fkey";
ALTER TABLE "user_app_activity" ADD CONSTRAINT "user_app_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
