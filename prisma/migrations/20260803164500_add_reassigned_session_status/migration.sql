-- Update sessions status check constraint to include 'Reassigned' and 'Waitlisted'
ALTER TABLE "public"."sessions" DROP CONSTRAINT IF EXISTS "sessions_status_check";
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_status_check" CHECK (status IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In', 'Waitlisted', 'Reassigned'));
