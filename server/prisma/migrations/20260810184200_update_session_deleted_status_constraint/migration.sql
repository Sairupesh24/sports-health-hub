-- Update sessions_status_check constraint to include Deleted and DELETED statuses
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_status_check";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_status_check" 
CHECK ("status" IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In', 'Waitlisted', 'Reassigned', 'IN_PROGRESS', 'In Progress', 'SCHEDULED', 'Deleted', 'DELETED'));
