DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  trigger_handled BOOLEAN;
BEGIN
  -- Insert the user into auth.users with a pre-hashed password
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'masteradmin@ishpo.com', 
    crypt('superadmin123', gen_salt('bf')), now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"first_name":"Super","last_name":"Admin"}', 
    now(), now()
  );

  -- Explicitly wait a tiny bit or just assume trigger fires.
  -- The trigger `on_auth_user_created` inserts into `public.profiles`.

  -- Add the super_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'super_admin');

END $$;
