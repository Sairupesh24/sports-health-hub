-- Migration to allow sessions without valid entitlements and flag them
-- 1. Add column to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_unentitled BOOLEAN DEFAULT false;

-- 2. Update completion RPC
CREATE OR REPLACE FUNCTION public.complete_session(p_session_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session RECORD;
    v_remaining BIGINT;
    v_entitlement_id UUID;
    v_needs_entitlement BOOLEAN := true;
BEGIN
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status = 'Completed' THEN
        RAISE EXCEPTION 'Session is already completed';
    END IF;

    -- If the session is Free, Trial, or Consultation, skip deduction
    IF v_session.session_type IN ('Free', 'Trial', 'Consultation') THEN
        UPDATE public.sessions SET status = 'Completed', updated_at = NOW() WHERE id = p_session_id;
        RETURN;
    END IF;

    -- CHECK FOR ENTITLEMENTS (NON-BLOCKING)
    IF v_session.service_id IS NULL THEN
        v_needs_entitlement := false;
    ELSE
        -- Check balance dynamically
        SELECT sessions_remaining INTO v_remaining
        FROM public.fn_compute_entitlement_balance(v_session.client_id)
        WHERE service_id = v_session.service_id;

        IF v_remaining IS NULL OR v_remaining <= 0 THEN
            v_needs_entitlement := false;
        END IF;
    END IF;

    IF v_needs_entitlement THEN
        -- Find an active entitlement id to consume against (earliest expiring active)
        SELECT cse.id INTO v_entitlement_id
        FROM public.client_service_entitlements cse
        JOIN public.package_purchases pp ON pp.id = cse.purchase_id
        WHERE cse.client_id = v_session.client_id 
          AND cse.service_id = v_session.service_id
          AND pp.status = 'Active'
          AND (pp.expiry_date IS NULL OR pp.expiry_date >= CURRENT_DATE)
          AND (
              cse.sessions_allowed > (
                  SELECT COUNT(*) FROM public.session_consumption_log scl WHERE scl.entitlement_id = cse.id
              )
          )
        ORDER BY pp.purchase_date ASC
        LIMIT 1;

        IF v_entitlement_id IS NULL THEN
             -- Dynamic balance said YES, but bucket selection said NO. Legacy or anomaly.
             v_needs_entitlement := false; 
        END IF;
    END IF;

    -- Final update: Mark session completed
    IF v_needs_entitlement THEN
        UPDATE public.sessions SET 
            status = 'Completed', 
            entitlement_id = v_entitlement_id,
            is_unentitled = false,
            updated_at = NOW() 
        WHERE id = p_session_id;

        INSERT INTO public.session_consumption_log (
            organization_id, session_id, client_id, service_id, entitlement_id, consumed_by
        ) VALUES (
            v_session.organization_id, p_session_id, v_session.client_id, v_session.service_id, v_entitlement_id, p_user_id
        );
    ELSE
        UPDATE public.sessions SET 
            status = 'Completed', 
            is_unentitled = true,
            updated_at = NOW() 
        WHERE id = p_session_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
