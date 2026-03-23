-- Fix: Auto-resolve service_id from service_type when service_id is NULL in complete_session
-- This ensures sessions booked via the scheduler (with only service_type text) correctly consume entitlements

CREATE OR REPLACE FUNCTION public.complete_session(p_session_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session RECORD;
    v_remaining BIGINT;
    v_entitlement_id UUID;
    v_needs_entitlement BOOLEAN := true;
    v_resolved_service_id UUID;
BEGIN
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status = 'Completed' THEN
        RAISE EXCEPTION 'Session is already completed';
    END IF;

    -- If the session is Free, Trial, or Consultation session_type, skip deduction
    IF v_session.session_type IN ('Free', 'Trial', 'Consultation') THEN
        UPDATE public.sessions SET status = 'Completed', is_unentitled = false, updated_at = NOW() WHERE id = p_session_id;
        RETURN;
    END IF;

    -- Resolve service_id: use the one already on the session, or look it up by service_type name
    v_resolved_service_id := v_session.service_id;

    IF v_resolved_service_id IS NULL AND v_session.service_type IS NOT NULL THEN
        SELECT id INTO v_resolved_service_id
        FROM public.services
        WHERE organization_id = v_session.organization_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(v_session.service_type))
          AND is_active = true
        LIMIT 1;
    END IF;

    -- If we still can't resolve a service, session is un-entitled
    IF v_resolved_service_id IS NULL THEN
        UPDATE public.sessions SET 
            status = 'Completed', 
            is_unentitled = true,
            updated_at = NOW() 
        WHERE id = p_session_id;
        RETURN;
    END IF;

    -- Also update service_id on the session so future calls are consistent
    UPDATE public.sessions SET service_id = v_resolved_service_id WHERE id = p_session_id AND service_id IS NULL;

    -- CHECK FOR ENTITLEMENTS (NON-BLOCKING)
    SELECT sessions_remaining INTO v_remaining
    FROM public.fn_compute_entitlement_balance(v_session.client_id)
    WHERE service_id = v_resolved_service_id;

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        v_needs_entitlement := false;
    END IF;

    IF v_needs_entitlement THEN
        -- Find an active entitlement bucket to consume against (earliest expiring active)
        SELECT cse.id INTO v_entitlement_id
        FROM public.client_service_entitlements cse
        JOIN public.package_purchases pp ON pp.id = cse.purchase_id
        WHERE cse.client_id = v_session.client_id 
          AND cse.service_id = v_resolved_service_id
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
            -- Balance said YES, but bucket selection said NO. Treat as un-entitled.
            v_needs_entitlement := false;
        END IF;
    END IF;

    -- Final update
    IF v_needs_entitlement THEN
        UPDATE public.sessions SET 
            status = 'Completed', 
            entitlement_id = v_entitlement_id,
            service_id = v_resolved_service_id,
            is_unentitled = false,
            updated_at = NOW() 
        WHERE id = p_session_id;

        INSERT INTO public.session_consumption_log (
            organization_id, session_id, client_id, service_id, entitlement_id, consumed_by
        ) VALUES (
            v_session.organization_id, p_session_id, v_session.client_id, v_resolved_service_id, v_entitlement_id, p_user_id
        );
    ELSE
        UPDATE public.sessions SET 
            status = 'Completed', 
            service_id = v_resolved_service_id,
            is_unentitled = true,
            updated_at = NOW() 
        WHERE id = p_session_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
