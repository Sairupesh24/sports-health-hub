-- Migration for AMS-Physio-Billing Integration
-- Add soreness_data to wellness_logs
ALTER TABLE public.wellness_logs ADD COLUMN IF NOT EXISTS soreness_data JSONB;

-- Create performance_tests table
CREATE TABLE IF NOT EXISTS public.performance_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL, -- Jump, Sprint, Strength
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id UUID DEFAULT public.get_my_org_id()
);

-- Enable RLS for performance_tests
ALTER TABLE public.performance_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_tests
CREATE POLICY "Athletes can view their own tests" ON public.performance_tests
FOR SELECT USING (athlete_id = auth.uid());

CREATE POLICY "Coaches and admins can view all tests" ON public.performance_tests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (ams_role = 'coach' OR ams_role = 'sports_scientist' OR ams_role = 'admin')
    )
    OR 
    organization_id = public.get_my_org_id()
);

CREATE POLICY "Coaches and admins can manage tests" ON public.performance_tests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (ams_role = 'coach' OR ams_role = 'sports_scientist' OR ams_role = 'admin')
    )
);

-- Update sync_entitlement_usage to include 'Attendance Confirmed'
CREATE OR REPLACE FUNCTION public.sync_entitlement_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_used INTEGER;
    v_granted INTEGER;
    v_entitlement_id UUID;
BEGIN
    -- Determine which entitlement to update (support INSERT, UPDATE, DELETE)
    IF TG_OP = 'DELETE' THEN
        v_entitlement_id := OLD.entitlement_id;
    ELSE
        v_entitlement_id := NEW.entitlement_id;
    END IF;

    -- If there's an entitlement attached, update it
    IF v_entitlement_id IS NOT NULL THEN
        -- Count only Completed OR Attendance Confirmed sessions for this entitlement
        SELECT COUNT(*) INTO v_used 
        FROM public.sessions 
        WHERE entitlement_id = v_entitlement_id AND status IN ('Completed', 'Attendance Confirmed');
        
        -- Get granted sessions bounds
        SELECT granted_sessions INTO v_granted 
        FROM public.client_entitlements 
        WHERE id = v_entitlement_id;

        -- Update the entitlement record with new used count and status logic
        UPDATE public.client_entitlements 
        SET 
            sessions_used = v_used,
            status = CASE 
                WHEN status = 'cancelled' THEN 'cancelled' -- Retain manual cancellations
                WHEN v_used >= v_granted THEN 'exhausted'
                ELSE 'active'
            END,
            updated_at = NOW()
        WHERE id = v_entitlement_id;
    END IF;

    -- Return appropriately
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
