-- CreateIndex
CREATE INDEX IF NOT EXISTS "nutrition_assessments_client_id_idx" ON "nutrition_assessments"("client_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "nutrition_assessments_organization_id_idx" ON "nutrition_assessments"("organization_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "nutrition_assessments_assessment_date_idx" ON "nutrition_assessments"("assessment_date");
