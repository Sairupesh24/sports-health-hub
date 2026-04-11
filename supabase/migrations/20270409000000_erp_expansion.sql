-- Migration: 20270409000000_erp_expansion.sql

-- Add HR Manager role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_manager';
COMMIT;

--------------------------------------------------------------------------------
-- 1. CRM MODULE
--------------------------------------------------------------------------------

-- Base tables that might be missing from previous migrations
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    looking_for TEXT NOT NULL,
    preferred_call_time TEXT,
    referral_source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    linked_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    next_follow_up_at TIMESTAMP WITH TIME ZONE,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    referral_details TEXT,
    work_place TEXT
);

CREATE TABLE IF NOT EXISTS public.enquiry_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_id UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    response_text TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enquiry table expansion (already exists but adding ERP logic)
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS expected_revenue NUMERIC DEFAULT 0;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS source TEXT;

-- CRM Stages
CREATE TABLE IF NOT EXISTS public.crm_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0,
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Default stages for each organization
INSERT INTO public.crm_stages (organization_id, name, sequence)
SELECT id, 'New Inquiry', 10 FROM public.organizations
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_stages (organization_id, name, sequence)
SELECT id, 'Initial Assessment', 20 FROM public.organizations
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_stages (organization_id, name, sequence)
SELECT id, 'Proposal Sent', 30 FROM public.organizations
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_stages (organization_id, name, sequence, is_won)
SELECT id, 'Won', 100, true FROM public.organizations
ON CONFLICT DO NOTHING;

-- Map enquiries to stages
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.crm_stages(id);

--------------------------------------------------------------------------------
-- 2. HR MODULE
--------------------------------------------------------------------------------

-- Job Positions
CREATE TABLE IF NOT EXISTS public.hr_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee details
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.hr_jobs(id),
    date_of_joining DATE,
    employment_type TEXT CHECK (employment_type IN ('Full-time', 'Part-time', 'Consultant')),
    bank_name TEXT,
    bank_account_no TEXT,
    ifsc_code TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(profile_id)
);

-- Contracts (Fixed Salary)
CREATE TABLE IF NOT EXISTS public.hr_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    wage NUMERIC NOT NULL DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT CHECK (status IN ('Draft', 'Active', 'Expired', 'Cancelled')) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Leave Management
CREATE TABLE IF NOT EXISTS public.hr_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    leave_type TEXT CHECK (leave_type IN ('Annual', 'Sick', 'Casual', 'Unpaid', 'Other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('Draft', 'Requested', 'Approved', 'Rejected')) DEFAULT 'Requested',
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--------------------------------------------------------------------------------
-- 4. RLS POLICIES
--------------------------------------------------------------------------------

-- CRM
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view org crm stages" ON public.crm_stages;
CREATE POLICY "Staff can view org crm stages" ON public.crm_stages FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- HR
ALTER TABLE public.hr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org jobs" ON public.hr_jobs;
CREATE POLICY "Staff can view org jobs" ON public.hr_jobs FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Staff can view org employees" ON public.hr_employees;
CREATE POLICY "Staff can view org employees" ON public.hr_employees FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Employee can view own contract" ON public.hr_contracts;
CREATE POLICY "Employee can view own contract" ON public.hr_contracts FOR SELECT USING (employee_id IN (SELECT id FROM public.hr_employees WHERE profile_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage HR" ON public.hr_employees;
CREATE POLICY "Admins can manage HR" ON public.hr_employees FOR ALL USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')));
DROP POLICY IF EXISTS "Admins can manage HR Jobs" ON public.hr_jobs;
CREATE POLICY "Admins can manage HR Jobs" ON public.hr_jobs FOR ALL USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')));
DROP POLICY IF EXISTS "Admins can manage HR Contracts" ON public.hr_contracts;
CREATE POLICY "Admins can manage HR Contracts" ON public.hr_contracts FOR ALL USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')));
DROP POLICY IF EXISTS "Admins can manage HR Leaves" ON public.hr_leaves;
CREATE POLICY "Admins can manage HR Leaves" ON public.hr_leaves FOR ALL USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr_manager')));


--------------------------------------------------------------------------------
-- 5. AUTOMATION TRIGGERS
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- 5. AUTOMATION TRIGGERS
--------------------------------------------------------------------------------


