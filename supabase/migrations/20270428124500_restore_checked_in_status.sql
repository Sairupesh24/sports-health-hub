-- Restore 'Checked In' to sessions table status constraint (it was accidentally removed in a previous migration)
ALTER TABLE "public"."sessions" DROP CONSTRAINT IF EXISTS "sessions_status_check";
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_status_check" CHECK (status IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In'));
