-- Robust Admin Setup Migration
-- This migration updates the handle_new_user trigger to handle first-time admin setup automatically
-- without requiring an immediate session (useful when email confirmation is enabled)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_initial_admin BOOLEAN;
  v_admin_exists BOOLEAN;
  v_org_id UUID;
BEGIN
  -- Get is_initial_admin flag from metadata
  v_is_initial_admin := COALESCE((NEW.raw_user_meta_data->>'is_initial_admin')::boolean, false);
  
  -- Determine organization_id from metadata
  v_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  
  -- Default to fallback if not provided
  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000001';
  END IF;

  -- Create profile with is_approved = true if initial admin
  INSERT INTO public.profiles (id, email, first_name, last_name, organization_id, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_org_id,
    v_is_initial_admin
  );

  -- If this is the initial admin signup
  IF v_is_initial_admin THEN
    -- Check if ANY admin already exists in the system
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'admin'
    ) INTO v_admin_exists;

    -- Only grant admin role if no other admin exists to prevent unauthorized elevation
    IF NOT v_admin_exists THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
