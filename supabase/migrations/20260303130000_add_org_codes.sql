-- Migration to add org_codes and related functions

-- 1. Create a function to generate a 6-character random alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_org_code()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  new_code VARCHAR;
  done BOOL;
BEGIN
  done := false;
  WHILE NOT done LOOP
    new_code := UPPER(substring(md5(random()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE org_code = new_code) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 2. Add the column (nullable first to backfill)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS org_code VARCHAR(10) UNIQUE;

-- 3. Backfill existing rows
UPDATE public.organizations 
SET org_code = public.generate_org_code() 
WHERE org_code IS NULL;

-- 4. Set NOT NULL and default
ALTER TABLE public.organizations ALTER COLUMN org_code SET NOT NULL;
ALTER TABLE public.organizations ALTER COLUMN org_code SET DEFAULT public.generate_org_code();

-- 5. Create a secure RPC function so unauthenticated users can validate a code during signup
CREATE OR REPLACE FUNCTION public.get_org_by_code(p_code TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE org_code = UPPER(p_code);
  RETURN v_org_id;
END;
$$;

-- 6. Update the handle_new_user trigger to use the organization_id from user metadata if provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'organization_id')::uuid, '00000000-0000-0000-0000-000000000001')
  );
  RETURN NEW;
END;
$$;
