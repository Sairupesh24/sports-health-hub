-- Update sessions status check constraint to include all existing and new valid statuses
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_status_check";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_status_check" 
CHECK ("status" IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In', 'Waitlisted', 'Reassigned', 'IN_PROGRESS', 'In Progress', 'SCHEDULED', 'Scheduled', 'Deleted', 'DELETED', 'PENDING', 'Pending', 'Draft', 'draft'));
