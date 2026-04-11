DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- Only proceed if user doesn't already exist
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'saikavuturi24@gmail.com') THEN
        RAISE NOTICE 'User already exists. Updating password and ensuring superadmin role instead.';
        
        SELECT id INTO new_user_id FROM auth.users WHERE email = 'saikavuturi24@gmail.com' LIMIT 1;
        
        -- Update password
        UPDATE auth.users 
        SET encrypted_password = crypt('Svrforever24@', gen_salt('bf'))
        WHERE id = new_user_id;
    ELSE
        -- 1. Create auth user
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, 
            email_confirmed_at, created_at, updated_at, confirmation_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', 
            new_user_id, 
            'authenticated', 
            'authenticated', 
            'saikavuturi24@gmail.com', 
            crypt('Svrforever24@', gen_salt('bf')), 
            now(), now(), now(),
            ''
        );

        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), new_user_id, new_user_id::text,
            format('{"sub":"%s","email":"%s"}', new_user_id::text, 'saikavuturi24@gmail.com')::jsonb,
            'email', now(), now(), now()
        );
    END IF;

    -- 2. Create the profile (if trigger hasn't already)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new_user_id) THEN
        INSERT INTO public.profiles (id, first_name, last_name, email)
        VALUES (new_user_id, 'Sai (Super Admin)', 'Kavuturi', 'saikavuturi24@gmail.com');
    ELSE 
        -- Update profile name if trigger created one with empty names
        UPDATE public.profiles SET first_name = 'Sai (Super Admin)', last_name = 'Kavuturi', email = 'saikavuturi24@gmail.com' WHERE id = new_user_id;
    END IF;

    -- 3. Assign super_admin role
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = new_user_id AND role = 'super_admin') THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_user_id, 'super_admin');
    END IF;
    
    RAISE NOTICE 'Superadmin user seeded successfully.';
END $$;
