-- Seed Session Types for Sports Science
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    IF v_org_id IS NULL THEN RETURN; END IF;

    INSERT INTO public.session_types (organization_id, name, description, category)
    VALUES 
        (v_org_id, 'Speed Training', 'Sprint mechanics and top speed development', 'Speed'),
        (v_org_id, 'Strength Training', 'Resistance training for force production', 'Strength'),
        (v_org_id, 'Performance Testing', 'KPI monitoring and testing protocols', 'Testing'),
        (v_org_id, 'Movement Screening', 'FMS or similar assessment protocols', 'Screening'),
        (v_org_id, 'Rehab Conditioning', 'Sports-specific conditioning during rehab', 'Rehab'),
        (v_org_id, 'Group Conditioning', 'Team or group based aerobic/anaerobic work', 'Group')
    ON CONFLICT (organization_id, name) DO NOTHING;
END $$;
