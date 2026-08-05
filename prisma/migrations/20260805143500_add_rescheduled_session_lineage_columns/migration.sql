-- AlterTable: Add rescheduled session lineage columns to sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_from_session_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_to_session_id" UUID;

-- AddForeignKeys: Self-referential constraints for session lineage tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_rescheduled_from_session_id_fkey'
  ) THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_from_session_id_fkey" 
    FOREIGN KEY ("rescheduled_from_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_rescheduled_to_session_id_fkey'
  ) THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_to_session_id_fkey" 
    FOREIGN KEY ("rescheduled_to_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;
