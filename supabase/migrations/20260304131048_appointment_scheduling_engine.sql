-- Enable the btree_gist extension necessary for the EXCLUDE constraint to work with both equality (=) and overlap (&&) operators
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Create Organization Settings Table
CREATE TABLE IF NOT EXISTS public.organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    allow_custom_duration BOOLEAN DEFAULT false,
    default_slot_duration INTEGER DEFAULT 60, -- In minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Consultant Availability Table
CREATE TABLE IF NOT EXISTS public.consultant_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    service_type TEXT, 
    slot_duration_interval INTEGER, -- Null means it falls back to organization_settings.default_slot_duration
    buffer_time INTEGER NOT NULL DEFAULT 0,
    max_daily_appointments INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(consultant_id, day_of_week, start_time, end_time)
);

-- 3. Create Availability Exceptions Table
CREATE TABLE IF NOT EXISTS public.availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_blocked BOOLEAN DEFAULT true, -- TRUE = holiday/leave, FALSE = custom extra hours
    start_time TIME, -- If null and is_blocked=true, whole day is blocked
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Appointments Table with Strict Concurrency Constraint
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('requested', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status DEFAULT 'confirmed',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Exclusion Constraint geometrically guarantees no overlapping active appointments for a single consultant on a single day.
ALTER TABLE public.appointments ADD CONSTRAINT prevent_double_booking 
    EXCLUDE USING gist (
        consultant_id WITH =,
        tsrange(
            (appointment_date + start_time)::timestamp, 
            (appointment_date + end_time)::timestamp, 
            '()'
        ) WITH &&
    ) WHERE (status IN ('confirmed', 'requested', 'rescheduled'));

-- 5. Create Appointment History Table
CREATE TABLE IF NOT EXISTS public.appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    previous_status appointment_status,
    new_status appointment_status NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;

-- Shared function shortcut to check user org
-- public.get_my_org_id() is assumed to already exist from a prior migration.

-- Organization Settings Policies
CREATE POLICY "Users can view org settings" ON public.organization_settings FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Admins can manage org settings" ON public.organization_settings FOR ALL USING (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'));

-- Consultant Availability Policies
CREATE POLICY "Users can view org availability" ON public.consultant_availability FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Consultants can manage their own availability" ON public.consultant_availability FOR ALL USING (consultant_id = auth.uid() OR (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin')));

-- Availability Exceptions Policies
CREATE POLICY "Users can view org exceptions" ON public.availability_exceptions FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Consultants can manage their own exceptions" ON public.availability_exceptions FOR ALL USING (consultant_id = auth.uid() OR (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin')));

-- Appointments Policies
CREATE POLICY "Users can view org appointments" ON public.appointments FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Clients can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (client_id = auth.uid() AND organization_id = public.get_my_org_id());
CREATE POLICY "Staff can create appointments" ON public.appointments FOR INSERT WITH CHECK (organization_id = public.get_my_org_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant')));
CREATE POLICY "Staff can update appointments" ON public.appointments FOR UPDATE USING (organization_id = public.get_my_org_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant')));
CREATE POLICY "Clients can cancel their own appointments" ON public.appointments FOR UPDATE USING (client_id = auth.uid() AND organization_id = public.get_my_org_id());

-- Appointment History Policies
CREATE POLICY "Users can view org appointment history" ON public.appointment_history FOR SELECT USING (
    appointment_id IN (SELECT id FROM public.appointments WHERE organization_id = public.get_my_org_id())
);
CREATE POLICY "Users can insert history" ON public.appointment_history FOR INSERT WITH CHECK (
    appointment_id IN (SELECT id FROM public.appointments WHERE organization_id = public.get_my_org_id())
);
