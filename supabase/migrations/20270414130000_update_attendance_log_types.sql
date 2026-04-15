-- Migration to expand hr_attendance_logs type constraints to support emergency leaves and autonomous features

ALTER TABLE public.hr_attendance_logs DROP CONSTRAINT IF EXISTS hr_attendance_logs_type_check;

ALTER TABLE public.hr_attendance_logs ADD CONSTRAINT hr_attendance_logs_type_check CHECK (type IN ('check_in', 'check_out', 'missed_check_out', 'emergency_leave'));
