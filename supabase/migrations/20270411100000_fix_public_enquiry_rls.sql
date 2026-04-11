-- Migration: 20270411100000_fix_public_enquiry_rls.sql
-- Goal: Allow public access for enquiry form branding and submissions.

-- 1. Enable RLS on enquiries if not already enabled
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- 2. Organizations: Allow public (anon) read access to branding and form config
-- This policy allows guests to see minimal info needed to brand the enquiry form.
DROP POLICY IF EXISTS "Public can view organization branding" ON public.organizations;
CREATE POLICY "Public can view organization branding" ON public.organizations
  FOR SELECT TO anon
  USING (true);

-- 3. Enquiries: Allow public (anon) insert access for lead generation
DROP POLICY IF EXISTS "Public can submit enquiries" ON public.enquiries;
CREATE POLICY "Public can submit enquiries" ON public.enquiries
  FOR INSERT TO anon
  WITH CHECK (true);

-- 4. Enquiries: Ensure staff (authenticated) can view and manage enquiries for their organization
DROP POLICY IF EXISTS "Staff can view org enquiries" ON public.enquiries;
CREATE POLICY "Staff can view org enquiries" ON public.enquiries
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Staff can update org enquiries" ON public.enquiries;
CREATE POLICY "Staff can update org enquiries" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Set a friendly slug for the default clinic to make URLs cleaner
UPDATE public.organizations SET slug = 'test-clinic-fixed' WHERE name = 'Test Clinic Fixed';
