-- Migration for ISHPO Entitlement Engine & Integrated Clinical Schema (Part 5: Logic & Groups)

-- 10. Group Attendance Table
CREATE TABLE IF NOT EXISTS public.group_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_status TEXT NOT NULL DEFAULT 'Present' CHECK (attendance_status IN ('Present', 'Absent', 'Late')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, client_id)
);

-- RLS Enablement
ALTER TABLE public.group_attendance ENABLE ROW LEVEL SECURITY;

-- Shared function public.get_my_org_id() exists
CREATE POLICY "Users can view org group attendance" ON public.group_attendance FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE organization_id = public.get_my_org_id())
);
CREATE POLICY "Users can manage org group attendance" ON public.group_attendance FOR ALL USING (
    session_id IN (SELECT id FROM public.sessions WHERE organization_id = public.get_my_org_id())
);


-- 11. Entitlement Engine Trigger Logic
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
        -- Count only Completed sessions for this entitlement
        SELECT COUNT(*) INTO v_used 
        FROM public.sessions 
        WHERE entitlement_id = v_entitlement_id AND status = 'Completed';
        
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

-- Attach trigger to sessions table on Insert, Update, or Delete
CREATE TRIGGER trigger_sync_entitlement_usage
AFTER INSERT OR UPDATE OF status, entitlement_id OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_entitlement_usage();


-- 12. Enforce entitlement availability on INSERT
CREATE OR REPLACE FUNCTION public.check_entitlement_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    IF NEW.entitlement_id IS NOT NULL THEN
        SELECT status INTO v_status FROM public.client_entitlements WHERE id = NEW.entitlement_id;
        IF v_status = 'exhausted' THEN
            RAISE EXCEPTION 'Cannot schedule a session against an exhausted entitlement.';
        ELSIF v_status = 'cancelled' THEN
            RAISE EXCEPTION 'Cannot schedule a session against a cancelled entitlement.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_entitlement_availability
BEFORE INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.check_entitlement_availability();
