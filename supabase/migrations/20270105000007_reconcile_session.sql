-- Reconcile un-entitled sessions after a client has paid
-- When an admin clicks "Reconcile", this function:
--   1. Checks client has remaining entitlements for the session's service
--   2. If yes: deducts one and clears is_unentitled flag
--   3. If no: raises an exception telling admin the client still hasn't purchased enough sessions

CREATE OR REPLACE FUNCTION public.reconcile_session(p_session_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session         RECORD;
    v_resolved_svc_id UUID;
    v_remaining       BIGINT;
    v_entitlement_id  UUID;
BEGIN
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    IF NOT v_session.is_unentitled THEN
        RAISE EXCEPTION 'Session % is not flagged as un-entitled. Nothing to reconcile.', p_session_id;
    END IF;

    -- Resolve service_id (same logic as complete_session)
    v_resolved_svc_id := v_session.service_id;

    IF v_resolved_svc_id IS NULL AND v_session.service_type IS NOT NULL THEN
        SELECT id INTO v_resolved_svc_id
        FROM   public.services
        WHERE  organization_id = v_session.organization_id
          AND  LOWER(TRIM(name)) = LOWER(TRIM(v_session.service_type))
          AND  is_active = true
        LIMIT 1;
    END IF;

    IF v_resolved_svc_id IS NULL THEN
        RAISE EXCEPTION 'Cannot resolve service for reconciliation. Please ensure the service type is valid.';
    END IF;

    -- Check remaining entitlements
    SELECT sessions_remaining INTO v_remaining
    FROM   public.fn_compute_entitlement_balance(v_session.client_id)
    WHERE  service_id = v_resolved_svc_id;

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        RAISE EXCEPTION 'Client does not have sufficient entitlements for this service yet. Please ensure a package has been purchased and is active.';
    END IF;

    -- Find the entitlement bucket to consume
    SELECT cse.id INTO v_entitlement_id
    FROM   public.client_service_entitlements cse
    JOIN   public.package_purchases pp ON pp.id = cse.purchase_id
    WHERE  cse.client_id   = v_session.client_id
      AND  cse.service_id  = v_resolved_svc_id
      AND  pp.status       = 'Active'
      AND  (pp.expiry_date IS NULL OR pp.expiry_date >= CURRENT_DATE)
      AND  cse.sessions_allowed > (
               SELECT COUNT(*)
               FROM   public.session_consumption_log scl
               WHERE  scl.entitlement_id = cse.id
           )
    ORDER BY pp.purchase_date ASC
    LIMIT 1;

    IF v_entitlement_id IS NULL THEN
        RAISE EXCEPTION 'Could not find an eligible entitlement bucket. Please verify the package is active and not expired.';
    END IF;

    -- Deduct entitlement and clear the flag
    UPDATE public.sessions
    SET    is_unentitled   = false,
           entitlement_id  = v_entitlement_id,
           service_id      = v_resolved_svc_id,
           updated_at      = NOW()
    WHERE  id = p_session_id;

    INSERT INTO public.session_consumption_log
        (organization_id, session_id, client_id, service_id, entitlement_id, consumed_by)
    VALUES
        (v_session.organization_id, p_session_id, v_session.client_id,
         v_resolved_svc_id, v_entitlement_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
