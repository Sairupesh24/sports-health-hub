-- Function to compute mathematically available appointment slots
-- Resolves standard availability, holiday exceptions, breaks, admin slot controls, and live bookings dynamically.

CREATE OR REPLACE FUNCTION public.get_available_slots(
    p_org_id UUID,
    p_consultant_id UUID,
    p_date DATE,
    p_service TEXT DEFAULT NULL
) RETURNS TABLE (
    slot_start TIME,
    slot_end TIME
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_day_of_week INTEGER;
    v_start_time TIME;
    v_end_time TIME;
    v_slot_duration INTEGER;
    v_buffer_time INTEGER;
    
    v_org_allow_custom BOOLEAN;
    v_org_default_duration INTEGER;

    v_exception_blocked BOOLEAN;
    v_exception_start TIME;
    v_exception_end TIME;
    
    v_slot_iter TIME;
    v_slot_iter_end TIME;
    v_is_available BOOLEAN;
BEGIN
    -- 1. Extract day of week (0 = Sunday, 6 = Saturday returning matching DOW rule)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- 2. Fetch Global Organization Settings for Duration Overrides
    SELECT allow_custom_duration, default_slot_duration 
    INTO v_org_allow_custom, v_org_default_duration
    FROM public.organization_settings
    WHERE organization_id = p_org_id;
    
    -- Fallback safety if no settings row exists yet
    IF v_org_allow_custom IS NULL THEN
        v_org_allow_custom := false;
        v_org_default_duration := 60;
    END IF;

    -- 3. Check for Full-Day Exceptions (Blocks)
    SELECT is_blocked, start_time, end_time
    INTO v_exception_blocked, v_exception_start, v_exception_end
    FROM public.availability_exceptions
    WHERE consultant_id = p_consultant_id
      AND exception_date = p_date;

    IF v_exception_blocked = true AND v_exception_start IS NULL THEN
        -- The whole day is blocked (Holiday/Leave)
        RETURN;
    END IF;

    -- 4. Get the Standard Recurring Availability
    SELECT start_time, end_time, slot_duration_interval, buffer_time
    INTO v_start_time, v_end_time, v_slot_duration, v_buffer_time
    FROM public.consultant_availability
    WHERE consultant_id = p_consultant_id
      AND day_of_week = v_day_of_week
      AND (p_service IS NULL OR service_type = p_service OR service_type IS NULL)
    LIMIT 1;
    
    -- If there's no standard availability, and no custom exception 'extra hours', return nothing.
    IF v_start_time IS NULL AND v_exception_blocked IS NULL THEN
        RETURN;
    END IF;

    -- 5. Determine the active Time Boundary for this day
    -- If there is a Custom Exception (Like "Working Extra Hours on a Sunday"), it fully overrides standard.
    IF v_exception_blocked = false AND v_exception_start IS NOT NULL THEN
        v_start_time := v_exception_start;
        v_end_time := v_exception_end;
    END IF;
    
    -- 6. Resolve final Slot Duration Rule per Admin Settings
    IF v_org_allow_custom = false OR v_slot_duration IS NULL THEN
        v_slot_duration := v_org_default_duration;
    END IF;

    -- 7. Mathematical Slot Generation & Collision Filtering
    v_slot_iter := v_start_time;
    
    WHILE v_slot_iter < v_end_time LOOP
        v_slot_iter_end := v_slot_iter + (v_slot_duration || ' minutes')::interval;
        
        -- Break if the slot end breaches the shift boundary
        IF v_slot_iter_end > v_end_time THEN
            EXIT;
        END IF;
        
        -- Check if it collides with ANY existing active appointments
        -- Use the EXACT same tsrange intersection (&&) logic to ensure 100% parity with the PostgreSQL Engine DB locking constraint
        SELECT NOT EXISTS (
            SELECT 1 FROM public.appointments 
            WHERE consultant_id = p_consultant_id
              AND appointment_date = p_date
              AND status IN ('confirmed', 'requested', 'rescheduled')
              AND tsrange(
                    (p_date + v_slot_iter)::timestamp,
                    (p_date + v_slot_iter_end)::timestamp,
                    '()'
                  ) && tsrange(
                    (appointment_date + start_time)::timestamp,
                    (appointment_date + end_time)::timestamp,
                    '()'
                  )
        ) INTO v_is_available;
        
        -- Further optimization: Partial Day block Exceptions (Like "Lunch Break")
        IF v_is_available AND v_exception_blocked = true AND v_exception_start IS NOT NULL THEN
             IF tsrange((p_date + v_slot_iter)::timestamp, (p_date + v_slot_iter_end)::timestamp, '()') && 
                tsrange((p_date + v_exception_start)::timestamp, (p_date + v_exception_end)::timestamp, '()') THEN
                 v_is_available := false;
             END IF;
        END IF;

        IF v_is_available THEN
            slot_start := v_slot_iter;
            slot_end := v_slot_iter_end;
            RETURN NEXT;
        END IF;
        
        -- Step Iterator Forward (Slot Duration + Buffer)
        v_slot_iter := v_slot_iter_end + COALESCE(v_buffer_time, 0) * interval '1 minute';
    END LOOP;

    RETURN;
END;
$$;
