-- CreateTable
CREATE TABLE IF NOT EXISTS "nutrition_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
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
    "exercise" BOOLEAN,
    "exercise_duration" TEXT,
    "training_sessions_count" TEXT,
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
    "assessment_date" DATE DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_assessments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nutrition_assessments" ADD CONSTRAINT "nutrition_assessments_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
