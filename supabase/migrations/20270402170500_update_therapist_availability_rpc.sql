CREATE OR REPLACE FUNCTION public.get_client_therapist_availability(
    p_client_id UUID,
    p_date DATE
) RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_assigned_consultant_id UUID;
    v_org_id UUID;
    v_c_details RECORD;
    v_status TEXT;
    v_exception_blocked BOOLEAN;
    v_exception_start TIME;
    v_sched_start TIME;
    v_day_of_week INTEGER;
    v_free_slots JSON;
    v_slot_count INTEGER;
    v_booked_count INTEGER;
    v_alternate_therapists JSON := '[]'::JSON;
BEGIN
    -- 1. Get client and assigned consultant from clients table
    SELECT assigned_consultant_id, organization_id INTO v_assigned_consultant_id, v_org_id
    FROM public.clients
    WHERE id = p_client_id;
    
    IF v_assigned_consultant_id IS NULL THEN
        RETURN json_build_object(
            'status', 'Unassigned',
            'assigned_therapist', NULL,
            'free_slots', '[]'::JSON,
            'alternate_therapists', '[]'::JSON
        );
    END IF;

    -- 2. Get consultant details
    SELECT p.id, p.first_name || ' ' || p.last_name as name, ur.role, p.profession 
    INTO v_c_details
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = v_assigned_consultant_id
    LIMIT 1;

    -- 3. Check Leave Exception
    SELECT is_blocked, start_time
    INTO v_exception_blocked, v_exception_start
    FROM public.availability_exceptions
    WHERE consultant_id = v_assigned_consultant_id
      AND exception_date = p_date;

    IF v_exception_blocked = true AND v_exception_start IS NULL THEN
        v_status := 'On Leave';
    ELSE
        -- 4. Check standard availability
        v_day_of_week := EXTRACT(DOW FROM p_date);
        
        SELECT start_time INTO v_sched_start
        FROM public.consultant_availability
        WHERE consultant_id = v_assigned_consultant_id
          AND day_of_week = v_day_of_week
        LIMIT 1;
        
        IF v_sched_start IS NULL AND v_exception_blocked IS NULL THEN
            v_status := 'Unavailable'; -- No Schedule
        ELSE
            -- We have a schedule, check slots
            SELECT json_agg(
                json_build_object('start', slot_start, 'end', slot_end)
            ) INTO v_free_slots
            FROM public.get_available_slots(v_org_id, v_assigned_consultant_id, p_date, NULL);
            
            v_free_slots := COALESCE(v_free_slots, '[]'::JSON);
            v_slot_count := json_array_length(v_free_slots);
            
            -- Check if any booked appointments
            SELECT COUNT(*) INTO v_booked_count
            FROM public.appointments
            WHERE consultant_id = v_assigned_consultant_id
              AND appointment_date = p_date
              AND status IN ('confirmed', 'requested', 'rescheduled');
              
            IF v_slot_count = 0 THEN
                v_status := 'Unavailable';
            ELSIF v_booked_count > 0 THEN
                v_status := 'Partially Available';
            ELSE
                v_status := 'Available';
            END IF;
        END IF;
    END IF;

    IF v_free_slots IS NULL THEN
        v_free_slots := '[]'::JSON;
    END IF;

    -- 5. Alternate Therapists logic
    IF v_status IN ('Unavailable', 'On Leave') THEN
        SELECT json_agg(
            json_build_object(
                'id', alt.id,
                'name', alt.first_name || ' ' || alt.last_name,
                'role', ur.role,
                'profession', alt.profession,
                'free_slots', (
                    SELECT COALESCE(json_agg(json_build_object('start', s.slot_start, 'end', s.slot_end)), '[]'::JSON)
                    FROM public.get_available_slots(v_org_id, alt.id, p_date, NULL) s
                )
            )
        )
        INTO v_alternate_therapists
        FROM public.profiles alt
        JOIN public.user_roles ur ON ur.user_id = alt.id
        WHERE alt.organization_id = v_org_id
          AND alt.id != v_assigned_consultant_id
          AND ur.role IN ('consultant', 'admin')
          AND COALESCE(alt.profession, '') = COALESCE(v_c_details.profession, '')
          AND EXISTS (
             SELECT 1 FROM public.get_available_slots(v_org_id, alt.id, p_date, NULL)
          );

        v_alternate_therapists := COALESCE(v_alternate_therapists, '[]'::JSON);
    END IF;

    RETURN json_build_object(
        'status', v_status,
        'assigned_therapist', json_build_object(
            'id', v_c_details.id,
            'name', v_c_details.name,
            'role', v_c_details.role,
            'profession', v_c_details.profession
        ),
        'free_slots', v_free_slots,
        'alternate_therapists', v_alternate_therapists
    );
END;
$$;
