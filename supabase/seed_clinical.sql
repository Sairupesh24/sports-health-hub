-- Seed clinical test data
DO $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_consultant_id UUID;
    v_injury_id UUID;
    v_session_id UUID;
BEGIN
    -- 1. Get an organization
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    IF v_org_id IS NULL THEN RETURN; END IF;

    -- 2. Get a client
    SELECT id INTO v_client_id FROM public.clients WHERE organization_id = v_org_id LIMIT 1;
    IF v_client_id IS NULL THEN RETURN; END IF;

    -- 3. Get a consultant
    SELECT id INTO v_consultant_id FROM public.profiles WHERE organization_id = v_org_id AND role = 'consultant' LIMIT 1;

    -- 4. Seed Injury Master Data
    INSERT INTO public.injury_master_data (organization_id, region, injury_type, diagnosis)
    VALUES 
        (v_org_id, 'Knee', 'Ligament Tear', 'ACL Tear'),
        (v_org_id, 'Knee', 'Ligament Tear', 'MCL Tear'),
        (v_org_id, 'Shoulder', 'Strain', 'Rotator Cuff Strain'),
        (v_org_id, 'Ankle', 'Sprain', 'Lateral Ankle Sprain')
    ON CONFLICT (organization_id, region, injury_type, diagnosis) DO NOTHING;

    -- 5. Seed an Injury
    INSERT INTO public.injuries (organization_id, client_id, injury_date, region, injury_type, diagnosis, severity, status)
    VALUES (v_org_id, v_client_id, '2026-03-01', 'Knee', 'Ligament Tear', 'ACL Tear', 'Severe', 'Rehab')
    RETURNING id INTO v_injury_id;

    -- 6. Seed AMS Training Load
    INSERT INTO public.external_training_summary (organization_id, client_id, training_date, workout_name, training_load, readiness_score)
    VALUES 
        (v_org_id, v_client_id, '2026-03-05', 'Heavy Lifting', 450, 7),
        (v_org_id, v_client_id, '2026-03-06', 'Cardio Recovery', 210, 8),
        (v_org_id, v_client_id, '2026-03-07', 'Agility Drills', 380, 6);

    -- 7. Seed completed Sessions with SOAP Notes
    INSERT INTO public.sessions (organization_id, client_id, therapist_id, service_type, scheduled_start, scheduled_end, status)
    VALUES (v_org_id, v_client_id, v_consultant_id, 'Physiotherapy', '2026-03-05 10:00:00', '2026-03-05 11:00:00', 'Completed')
    RETURNING id INTO v_session_id;

    INSERT INTO public.physio_session_details (session_id, injury_id, pain_score, modality_used, treatment_type, clinical_notes)
    VALUES (v_session_id, v_injury_id, 6, ARRAY['IFT', 'HC'], 'Strength Training', 'Patient feeling better, early rehab phase.');

    -- Seed a second session
    INSERT INTO public.sessions (organization_id, client_id, therapist_id, service_type, scheduled_start, scheduled_end, status)
    VALUES (v_org_id, v_client_id, v_consultant_id, 'Physiotherapy', '2026-03-07 14:00:00', '2026-03-07 15:00:00', 'Completed')
    RETURNING id INTO v_session_id;

    INSERT INTO public.physio_session_details (session_id, injury_id, pain_score, modality_used, treatment_type, clinical_notes)
    VALUES (v_session_id, v_injury_id, 4, ARRAY['UST'], 'Mobility Work', 'Pain decreasing, range of motion improving.');

END $$;
