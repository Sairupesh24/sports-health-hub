-- Migration to fix RLS for Super Admin Package Management

-- 15. Fix RLS on Entitlement Schema to explicitly allow 'super_admin' 
-- Since `public.get_my_org_id()` restricts management to the admin's own org,
-- Super Admins (who typically belong to a platform org) would fail the org check.
-- We must make the super_admin check parallel to the org check.

-- Service Packages
DROP POLICY IF EXISTS "Admins can manage service packages" ON public.service_packages;
CREATE POLICY "Admins can manage service packages" ON public.service_packages FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin')
    OR
    (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'))
);

-- Client Entitlements
DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.client_entitlements;
CREATE POLICY "Admins can manage entitlements" ON public.client_entitlements FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin')
    OR
    (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'))
);
