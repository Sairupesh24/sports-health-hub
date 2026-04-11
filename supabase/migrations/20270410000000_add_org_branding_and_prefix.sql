-- Migration: 20270410000000_add_org_branding_and_prefix.sql
-- Goal: Add organization branding, immutable prefixes, and update identity generation.

-- 1. Add new columns to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS uhid_prefix TEXT UNIQUE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS official_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS official_address TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2. Add constraint for UHID Prefix (3-4 alphabets)
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS uhid_prefix_length_check;
ALTER TABLE public.organizations ADD CONSTRAINT uhid_prefix_length_check 
  CHECK (uhid_prefix IS NULL OR (uhid_prefix ~ '^[A-Z]{3,4}$'));

-- 3. Trigger to prevent UHID Prefix update once set
CREATE OR REPLACE FUNCTION public.check_uhid_prefix_immutable() 
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.uhid_prefix IS NOT NULL AND NEW.uhid_prefix IS DISTINCT FROM OLD.uhid_prefix THEN
    RAISE EXCEPTION 'UHID Prefix is permanent and cannot be changed once assigned.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_uhid_prefix_immutable ON public.organizations;
CREATE TRIGGER tr_ensure_uhid_prefix_immutable
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.check_uhid_prefix_immutable();

-- 4. Update generate_uhid to pull dynamic prefix
CREATE OR REPLACE FUNCTION public.generate_uhid(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
  v_year TEXT;
  v_year_month TEXT;
  v_serial INT;
  v_uhid TEXT;
  v_prefix TEXT;
BEGIN
  -- Fetch the locked prefix for this organization
  SELECT uhid_prefix INTO v_prefix FROM public.organizations WHERE id = p_organization_id;
  
  -- Fallback to 'GEN' if no prefix is set (safeguard)
  IF v_prefix IS NULL THEN
    v_prefix := 'GEN';
  END IF;

  v_month := LPAD(EXTRACT(MONTH FROM now())::TEXT, 2, '0');
  v_year := LPAD((EXTRACT(YEAR FROM now())::INT % 100)::TEXT, 2, '0');
  v_year_month := v_month || v_year;

  INSERT INTO public.uhid_sequences (organization_id, year_month, last_serial)
  VALUES (p_organization_id, v_year_month, 1)
  ON CONFLICT (organization_id, year_month)
  DO UPDATE SET last_serial = uhid_sequences.last_serial + 1
  RETURNING last_serial INTO v_serial;

  v_uhid := v_prefix || v_month || v_year || LPAD(v_serial::TEXT, 4, '0');
  RETURN v_uhid;
END;
$$;

-- 5. Pre-lock existing organizations as requested
UPDATE public.organizations SET uhid_prefix = 'CSH' WHERE name = 'Center for Spine and Sports Health' AND uhid_prefix IS NULL;
UPDATE public.organizations SET uhid_prefix = 'TCF' WHERE name = 'test clinic fixed' AND uhid_prefix IS NULL;

-- 6. Create storage bucket for clinic logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS for clinic-logos
DROP POLICY IF EXISTS "Public Access for logos" ON storage.objects;
CREATE POLICY "Public Access for logos" ON storage.objects FOR SELECT USING (bucket_id = 'clinic-logos');

DROP POLICY IF EXISTS "Super Admins can manage logos" ON storage.objects;
CREATE POLICY "Super Admins can manage logos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'clinic-logos' AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (bucket_id = 'clinic-logos' AND public.has_role(auth.uid(), 'super_admin'));
