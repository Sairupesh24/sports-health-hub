-- Migration: Recurring Billing Schema
-- Date: 2026-04-28

-- 1. Update Packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'One-Time' CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Annual', 'One-Time')),
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Standard',
ADD COLUMN IF NOT EXISTS perks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- 2. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Past Due', 'Suspended', 'Cancelled')),
    current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end DATE,
    billing_cycle TEXT NOT NULL,
    auto_pay BOOLEAN DEFAULT false,
    next_billing_date DATE,
    grace_period_end DATE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Update Bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS due_date DATE;

-- 4. Create Subscription Logs table
CREATE TABLE IF NOT EXISTS public.subscription_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. RLS Policies

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;

-- Subscriptions Policies
DROP POLICY IF EXISTS "Org staff can view subscriptions" ON public.subscriptions;
CREATE POLICY "Org staff can view subscriptions" ON public.subscriptions
    FOR SELECT USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Admins and Sports Scientists manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and Sports Scientists manage subscriptions" ON public.subscriptions
    FOR ALL USING (
        organization_id = get_my_org_id() AND 
        (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sports_scientist') OR has_role(auth.uid(), 'super_admin'))
    );

-- Subscription Logs Policies
DROP POLICY IF EXISTS "Org staff can view sub logs" ON public.subscription_logs;
CREATE POLICY "Org staff can view sub logs" ON public.subscription_logs
    FOR SELECT USING (organization_id = get_my_org_id());

-- Update Packages RLS to allow Sports Scientist
DROP POLICY IF EXISTS "Admins and Sports Scientists manage packages" ON public.packages;
CREATE POLICY "Admins and Sports Scientists manage packages" ON public.packages
    FOR ALL USING (
        organization_id = get_my_org_id() AND 
        (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sports_scientist') OR has_role(auth.uid(), 'super_admin'))
    );

-- Update Package Services RLS to allow Sports Scientist
DROP POLICY IF EXISTS "Admins and Sports Scientists manage package services" ON public.package_services;
CREATE POLICY "Admins and Sports Scientists manage package services" ON public.package_services
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.packages WHERE packages.id = package_services.package_id AND packages.organization_id = get_my_org_id()) AND 
        (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sports_scientist') OR has_role(auth.uid(), 'super_admin'))
    );

-- 6. Updated At Trigger
CREATE OR REPLACE FUNCTION public.fn_update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_subscription_updated_at();
