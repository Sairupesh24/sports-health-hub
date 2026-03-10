-- Migration for Multi-Service Packages (Part 2)

-- 1. Remove specific service constraints and default_sessions from service_packages
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS service_type;
ALTER TABLE public.service_packages DROP COLUMN IF EXISTS default_sessions;

-- 2. Create the child table for Package Items
CREATE TABLE IF NOT EXISTS public.service_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('Physiotherapy', 'Strength & Conditioning', 'Active Recovery Training', 'Consultation', 'Nutrition')),
    default_sessions INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(package_id, service_type)
);

-- Index for faster lookups when resolving a package's contents
CREATE INDEX idx_service_package_items_package ON public.service_package_items(package_id);

-- RLS for new table
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;

-- Allow super_admin or org admin to manage the items. We join back to service_packages to get the organization_id.
CREATE POLICY "Users can view org service package items" ON public.service_package_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.service_packages sp 
        WHERE sp.id = service_package_items.package_id 
        AND sp.organization_id = public.get_my_org_id()
    )
    OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can manage service package items" ON public.service_package_items FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin')
    OR
    EXISTS (
        SELECT 1 FROM public.service_packages sp 
        WHERE sp.id = service_package_items.package_id 
        AND sp.organization_id = public.get_my_org_id()
        AND public.has_role(auth.uid(), 'admin')
    )
);

-- Note: client_entitlements doesn't need schema changes because we just 
-- generate a separate row per service_type mapped to the same invoice_id/package_id.
