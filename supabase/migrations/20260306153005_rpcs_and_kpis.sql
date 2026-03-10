-- Migration for ISHPO Entitlement Engine & Integrated Clinical Schema (Part 6: APIs & KPIs)

-- 13. Reschedule Session RPC
-- Clones an existing session, sets the old one to 'Rescheduled', and links them.
CREATE OR REPLACE FUNCTION public.reschedule_session(
    p_session_id UUID,
    p_new_start TIMESTAMPTZ,
    p_new_end TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
    v_old_session public.sessions%ROWTYPE;
    v_new_session_id UUID;
    v_new_session_mode TEXT;
BEGIN
    -- Get the old session
    SELECT * INTO v_old_session FROM public.sessions WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found.', p_session_id;
    END IF;

    IF v_old_session.status != 'Planned' THEN
        RAISE EXCEPTION 'Only Planned sessions can be rescheduled.';
    END IF;

    -- Create new session based on the old one
    INSERT INTO public.sessions (
        organization_id, client_id, therapist_id, service_type, entitlement_id, 
        session_mode, scheduled_start, scheduled_end, status, rescheduled_from_session_id, created_by
    )
    VALUES (
        v_old_session.organization_id, v_old_session.client_id, v_old_session.therapist_id, v_old_session.service_type, v_old_session.entitlement_id, 
        v_old_session.session_mode, p_new_start, p_new_end, 'Planned', p_session_id, auth.uid()
    ) RETURNING id, session_mode INTO v_new_session_id, v_new_session_mode;

    -- Update old session
    UPDATE public.sessions 
    SET status = 'Rescheduled', rescheduled_to_session_id = v_new_session_id, updated_at = NOW()
    WHERE id = p_session_id;

    -- If its physio, clone the details row (empty notes, but carry over injury ID)
    IF v_old_session.service_type = 'Physiotherapy' THEN
        INSERT INTO public.physio_session_details (session_id, injury_id)
        SELECT v_new_session_id, injury_id
        FROM public.physio_session_details WHERE session_id = p_session_id;
    END IF;
    
    -- If group, clone attendance
    IF v_new_session_mode = 'Group' THEN
        INSERT INTO public.group_attendance (session_id, client_id, attendance_status)
        SELECT v_new_session_id, client_id, 'Present'
        FROM public.group_attendance WHERE session_id = p_session_id;
    END IF;

    RETURN v_new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. KPI RPC (Sessions per Consultant per interval)
CREATE OR REPLACE FUNCTION public.get_consultant_session_kpis(
    p_org_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    consultant_name TEXT,
    total_completed BIGINT,
    total_missed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as consultant_name,
        COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN s.status = 'Missed' THEN 1 END) as total_missed
    FROM public.sessions s
    LEFT JOIN public.profiles p ON s.therapist_id = p.id
    WHERE s.organization_id = p_org_id 
      AND s.scheduled_start >= p_start_date 
      AND s.scheduled_start <= p_end_date
    GROUP BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
