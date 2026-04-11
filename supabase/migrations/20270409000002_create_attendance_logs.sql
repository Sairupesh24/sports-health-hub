-- Migration: 20270409000002_create_attendance_logs.sql

-- Create attendance logs table
CREATE TABLE IF NOT EXISTS public.hr_attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out')),
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    distance_from_center NUMERIC,
    is_within_geofence BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can view their own logs
DROP POLICY IF EXISTS "Staff can view own attendance logs" ON public.hr_attendance_logs;
CREATE POLICY "Staff can view own attendance logs" ON public.hr_attendance_logs
    FOR SELECT USING (profile_id = auth.uid());

-- HR Managers and Admins can view all logs in their organization
DROP POLICY IF EXISTS "Admins can view org attendance logs" ON public.hr_attendance_logs;
CREATE POLICY "Admins can view org attendance logs" ON public.hr_attendance_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ) AND (
            public.has_role(auth.uid(), 'admin') OR 
            public.has_role(auth.uid(), 'hr_manager')
        )
    );

-- Staff can insert their own logs
DROP POLICY IF EXISTS "Staff can insert own attendance logs" ON public.hr_attendance_logs;
CREATE POLICY "Staff can insert own attendance logs" ON public.hr_attendance_logs
    FOR INSERT WITH CHECK (
        profile_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_hr_attendance_logs_profile ON public.hr_attendance_logs(profile_id);
CREATE INDEX idx_hr_attendance_logs_org ON public.hr_attendance_logs(organization_id);
CREATE INDEX idx_hr_attendance_logs_created_at ON public.hr_attendance_logs(created_at);
