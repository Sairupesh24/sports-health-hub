DO $$
DECLARE
  existing_id UUID;
  new_user_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = 'masteradmin@ishpo.com';
  
  IF existing_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'masteradmin@ishpo.com', 
      extensions.crypt('superadmin123', extensions.gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', 
      '{"first_name":"Master","last_name":"Admin"}', 
      now(), now()
    );
    existing_id := new_user_id;
  ELSE
    UPDATE auth.users SET encrypted_password = extensions.crypt('superadmin123', extensions.gen_salt('bf')) WHERE id = existing_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = existing_id AND role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (existing_id, 'super_admin');
  END IF;

END $$;
