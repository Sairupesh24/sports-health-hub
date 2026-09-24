-- CreateTable: user_app_activity
CREATE TABLE IF NOT EXISTS "user_app_activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "active_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_ping" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_app_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint on (user_id, date)
CREATE UNIQUE INDEX IF NOT EXISTS "user_app_activity_user_id_date_key" ON "user_app_activity"("user_id", "date");

-- CreateTable: activity_tracker_automation
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

-- AddForeignKeys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_app_activity_user_id_fkey'
  ) THEN
    ALTER TABLE "user_app_activity" ADD CONSTRAINT "user_app_activity_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_tracker_automation_organization_id_fkey'
  ) THEN
    ALTER TABLE "activity_tracker_automation" ADD CONSTRAINT "activity_tracker_automation_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
