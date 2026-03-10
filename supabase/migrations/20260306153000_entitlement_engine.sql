-- Migration for ISHPO Entitlement Engine & Integrated Clinical Schema (Part 1)

-- 1. Service Packages
CREATE TABLE IF NOT EXISTS public.service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('Physiotherapy', 'Strength & Conditioning', 'Active Recovery Training', 'Consultation')),
    default_sessions INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client Entitlements (Generated from Invoices)
-- Note: Reuses the existing app's billing invoice table if present, or acts standalone based on the billing integration.
CREATE TABLE IF NOT EXISTS public.client_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id TEXT, -- Logical link to external/internal billing system invoice
    package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL,
    default_sessions INTEGER NOT NULL,
    granted_sessions INTEGER NOT NULL,
    sessions_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for entitlement lookups
CREATE INDEX idx_client_entitlements_client ON public.client_entitlements(client_id);
CREATE INDEX idx_client_entitlements_status ON public.client_entitlements(status);

-- RLS
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_entitlements ENABLE ROW LEVEL SECURITY;

-- Shared function public.get_my_org_id() exists
CREATE POLICY "Users can view org service packages" ON public.service_packages FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Admins can manage service packages" ON public.service_packages FOR ALL USING (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view org entitlements" ON public.client_entitlements FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Admins can manage entitlements" ON public.client_entitlements FOR ALL USING (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'));
-- Therapists cannot INSERT/UPDATE/DELETE entitlements, ensuring governance.
