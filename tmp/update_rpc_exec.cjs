const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SQL = `
CREATE OR REPLACE FUNCTION public.complete_session(p_session_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session         RECORD;
    v_therapist_role  TEXT;
    v_resolved_svc_id UUID;
    v_remaining       BIGINT;
    v_entitlement_id  UUID;
    v_needs_entit     BOOLEAN := true;
BEGIN
    -- 1. Load session
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    IF v_session.status = 'Completed' THEN
        RAISE EXCEPTION 'Session % is already completed', p_session_id;
    END IF;

    -- 2. Free / Trial → complete with no deduction
    IF v_session.session_type IN ('Free', 'Trial') THEN
        UPDATE public.sessions
        SET    status = 'Completed', is_unentitled = false, updated_at = NOW()
        WHERE  id = p_session_id;
        RETURN;
    END IF;

    -- 3. Resolve service_id
    v_resolved_svc_id := v_session.service_id;

    -- 3a. Match service_type text → services.name
    IF v_resolved_svc_id IS NULL AND v_session.service_type IS NOT NULL THEN
        SELECT id INTO v_resolved_svc_id
        FROM   public.services
        WHERE  organization_id = v_session.organization_id
          AND  LOWER(TRIM(name)) = LOWER(TRIM(v_session.service_type))
          AND  is_active = true
        LIMIT 1;
    END IF;

    -- 3b. Role/Profession fallback
    IF v_resolved_svc_id IS NULL THEN
        -- Get profession if possible, else role
        SELECT COALESCE(p.profession, r.role) INTO v_therapist_role
        FROM   public.profiles p
        LEFT JOIN public.user_roles r ON r.user_id = p.id
        WHERE  p.id = v_session.therapist_id
        LIMIT 1;

        IF v_therapist_role IN ('Sports Scientist', 'sports_scientist') THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  LOWER(TRIM(name)) IN ('strength & conditioning', 'strength and conditioning', 's&c', 'snc')
              AND  is_active = true
            ORDER BY LOWER(name) ASC LIMIT 1;
        ELSIF v_therapist_role IN ('Physiotherapist', 'physiotherapist', 'Consultant', 'consultant') THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  LOWER(TRIM(name)) IN ('physiotherapy', 'physio', 'assessment')
              AND  is_active = true
            LIMIT 1;
        ELSIF v_therapist_role IN ('Sports Physician', 'sports_physician') THEN
            SELECT id INTO v_resolved_svc_id
            FROM   public.services
            WHERE  organization_id = v_session.organization_id
              AND  LOWER(TRIM(name)) IN ('consultation', 'physician consultation', 'medical')
              AND  is_active = true
            LIMIT 1;
        END IF;
    END IF;

    -- 4. Pin service_id onto session
    IF v_resolved_svc_id IS NOT NULL THEN
        UPDATE public.sessions
        SET    service_id = v_resolved_svc_id
        WHERE  id = p_session_id AND service_id IS NULL;
    END IF;

    -- 5. Check entitlement balance
    IF v_resolved_svc_id IS NULL THEN
        v_needs_entit := false;
    ELSE
        SELECT sessions_remaining INTO v_remaining
        FROM   public.fn_compute_entitlement_balance(v_session.client_id)
        WHERE  service_id = v_resolved_svc_id;

        IF v_remaining IS NULL OR v_remaining <= 0 THEN
            v_needs_entit := false;
        END IF;
    END IF;

    -- 6. Consume entitlement
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
            v_needs_entit := false;
        END IF;
    END IF;

    -- 7. Persist result
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
`;

async function run() {
  console.log('Running RPC update via exec_sql...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: SQL });
  if (error) {
    console.error('❌ RPC update failed:', error);
  } else {
    console.log('✅ RPC update successful!');
  }
}

run();
