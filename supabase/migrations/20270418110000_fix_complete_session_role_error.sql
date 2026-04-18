-- Migration: Fix "column p.role does not exist" in complete_session
-- This migration updates the complete_session function to use the 'profession' column
-- instead of the non-existent 'role' column on the profiles table.

CREATE OR REPLACE FUNCTION public.complete_session(p_session_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session         RECORD;
    v_therapist_prof  TEXT;
    v_resolved_svc_id UUID;
    v_remaining       BIGINT;
    v_entitlement_id  UUID;
    v_needs_entit     BOOLEAN := true;
BEGIN
    -- ── 1. Load session ──────────────────────────────────────────────────────
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    IF v_session.status = 'Completed' THEN
        RAISE EXCEPTION 'Session % is already completed', p_session_id;
    END IF;

    -- ── 2. Free / Trial → complete with no deduction ─────────────────────────
    IF v_session.session_type IN ('Free', 'Trial') THEN
        UPDATE public.sessions
        SET    status = 'Completed', is_unentitled = false, updated_at = NOW()
        WHERE  id = p_session_id;
        RETURN;
    END IF;

    -- ── 3. Resolve service_id ─────────────────────────────────────────────────
    v_resolved_svc_id := v_session.service_id;   -- explicit (may be NULL)

    -- 3a. Match service_type text → services.name
    IF v_resolved_svc_id IS NULL AND v_session.service_type IS NOT NULL THEN
        SELECT id INTO v_resolved_svc_id
        FROM   public.services
        WHERE  organization_id = v_session.organization_id
          AND  LOWER(TRIM(name)) = LOWER(TRIM(v_session.service_type))
          AND  is_active = true
        LIMIT 1;
    END IF;

    -- 3b. Therapist profession fallback if still unresolved
    IF v_resolved_svc_id IS NULL THEN
        SELECT p.profession INTO v_therapist_prof
        FROM   public.profiles p
        WHERE  p.id = v_session.therapist_id;

        -- Fallback if still NULL (or if we need to check ams_role, but profession is preferred)
        IF v_therapist_prof IS NULL THEN
             -- Some older logic used ams_role or user_roles, but profession is the new standard
             -- for entitlement matching as per the 20270401 migration.
             NULL;
        END IF;

        IF v_therapist_prof = 'Sports Scientist' THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  LOWER(TRIM(name)) IN ('strength & conditioning', 'strength and conditioning', 's&c', 'snc', 'performance')
              AND  is_active = true
            ORDER BY LOWER(name) ASC
            LIMIT 1;
        ELSIF v_therapist_prof IN ('Physiotherapist', 'Consultant') THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  LOWER(TRIM(name)) IN ('physiotherapy', 'physio', 'rehab', 'therapy')
              AND  is_active = true
            LIMIT 1;
        ELSIF v_therapist_prof = 'Nutritionist' THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  LOWER(TRIM(name)) IN ('nutrition', 'nutritionist', 'dietary')
              AND  is_active = true
            LIMIT 1;
        ELSIF v_therapist_prof = 'Sports Physician' THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  (
                   LOWER(TRIM(name)) IN ('consultation', 'medical', 'assessment', 'physiotherapy', 'clinic')
                   OR LOWER(name) LIKE '%physician%'
                   OR LOWER(name) LIKE '%doctor%'
              )
              AND  is_active = true
            ORDER BY (CASE WHEN LOWER(name) LIKE '%consultation%' THEN 0 
                           WHEN LOWER(name) LIKE '%medical%' THEN 1
                           ELSE 2 END) ASC
            LIMIT 1;
        END IF;
    END IF;

    -- ── 4. Pin service_id back onto the session row (ensure consistency) ──────
    IF v_resolved_svc_id IS NOT NULL THEN
        UPDATE public.sessions
        SET    service_id = v_resolved_svc_id
        WHERE  id = p_session_id AND service_id IS NULL;
    END IF;

    -- ── 5. Check entitlement balance ──────────────────────────────────────────
    IF v_resolved_svc_id IS NULL THEN
        -- Cannot determine service → un-entitled
        v_needs_entit := false;
    ELSE
        SELECT sessions_remaining INTO v_remaining
        FROM   public.fn_compute_entitlement_balance(v_session.client_id)
        WHERE  service_id = v_resolved_svc_id;

        IF v_remaining IS NULL OR v_remaining <= 0 THEN
            v_needs_entit := false;
        END IF;
    END IF;

    -- ── 6. Consume entitlement bucket ─────────────────────────────────────────
    IF v_needs_entit THEN
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
            -- Balance said YES but no bucket found – data anomaly; treat as un-entitled
            v_needs_entit := false;
        END IF;
    END IF;

    -- ── 7. Persist result ─────────────────────────────────────────────────────
    IF v_needs_entit THEN
        UPDATE public.sessions
        SET    status         = 'Completed',
               entitlement_id = v_entitlement_id,
               service_id     = v_resolved_svc_id,
               is_unentitled  = false,
               updated_at     = NOW()
        WHERE  id = p_session_id;

        INSERT INTO public.session_consumption_log
            (organization_id, session_id, client_id, service_id, entitlement_id, consumed_by)
        VALUES
            (v_session.organization_id, p_session_id, v_session.client_id,
             v_resolved_svc_id, v_entitlement_id, p_user_id);
    ELSE
        UPDATE public.sessions
        SET    status        = 'Completed',
               service_id   = COALESCE(v_resolved_svc_id, v_session.service_id),
               is_unentitled = true,
               updated_at   = NOW()
        WHERE  id = p_session_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
