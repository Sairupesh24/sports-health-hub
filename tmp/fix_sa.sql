UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'::jsonb), 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
    is_super_admin = COALESCE(is_super_admin, false)
WHERE email = 'saikavuturi24@gmail.com';
