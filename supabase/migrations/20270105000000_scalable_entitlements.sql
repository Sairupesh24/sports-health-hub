-- Migration for Scalable Package-Based Entitlements
-- Adds Services, updates Packages and Sessions, creates Entitlement computation functions.

-- 1. Services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    default_session_duration INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Alter Packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS validity_days INTEGER;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Package Services
CREATE TABLE IF NOT EXISTS public.package_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    sessions_included INTEGER NOT NULL CHECK (sessions_included > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(package_id, service_id)
);

-- 4. Package Purchases
CREATE TABLE IF NOT EXISTS public.package_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Client Service Entitlements
CREATE TABLE IF NOT EXISTS public.client_service_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES public.package_purchases(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    sessions_allowed INTEGER NOT NULL CHECK (sessions_allowed > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Session Consumption Log
CREATE TABLE IF NOT EXISTS public.session_consumption_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    entitlement_id UUID NOT NULL REFERENCES public.client_service_entitlements(id) ON DELETE CASCADE,
    consumed_on TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    consumed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Alter Sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'Standard' CHECK (session_type IN ('Standard', 'Free', 'Trial', 'Consultation'));

-- Fix entitlement_id constraint to point to new table
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_entitlement_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_entitlement_id_fkey FOREIGN KEY (entitlement_id) REFERENCES public.client_service_entitlements(id) ON DELETE SET NULL;


-- 8. RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_service_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_consumption_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org services" ON public.services FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Admins manage org services" ON public.services FOR ALL USING (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view package services" ON public.package_services FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.packages WHERE packages.id = package_services.package_id AND packages.organization_id = public.get_my_org_id())
);
CREATE POLICY "Admins manage package services" ON public.package_services FOR ALL USING (
    EXISTS (SELECT 1 FROM public.packages WHERE packages.id = package_services.package_id AND packages.organization_id = public.get_my_org_id()) AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users view package purchases" ON public.package_purchases FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Admins manage package purchases" ON public.package_purchases FOR ALL USING (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view entitlements" ON public.client_service_entitlements FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Admins manage entitlements" ON public.client_service_entitlements FOR ALL USING (organization_id = public.get_my_org_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view consumption logs" ON public.session_consumption_log FOR SELECT USING (organization_id = public.get_my_org_id());
-- System logic inserts logs, but let's allow service role or admins to view them

-- 9. Functions & Triggers

-- Compute Balances Dynamically
CREATE OR REPLACE FUNCTION public.fn_compute_entitlement_balance(p_client_id UUID)
RETURNS TABLE (
    service_id UUID,
    service_name TEXT,
    total_purchased BIGINT,
    sessions_used BIGINT,
    sessions_remaining BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH purchased AS (
        SELECT 
            cse.service_id, 
            SUM(cse.sessions_allowed) as total_allowed
        FROM public.client_service_entitlements cse
        JOIN public.package_purchases pp ON pp.id = cse.purchase_id
        WHERE cse.client_id = p_client_id 
          AND pp.status = 'Active'
          AND (pp.expiry_date IS NULL OR pp.expiry_date >= CURRENT_DATE)
        GROUP BY cse.service_id
    ),
    used AS (
        SELECT 
            scl.service_id, 
            COUNT(scl.id) as total_used
        FROM public.session_consumption_log scl
        WHERE scl.client_id = p_client_id
        GROUP BY scl.service_id
    )
    SELECT 
        s.id as service_id,
        s.name as service_name,
        COALESCE(p.total_allowed, 0)::BIGINT as total_purchased,
        COALESCE(u.total_used, 0)::BIGINT as sessions_used,
        (COALESCE(p.total_allowed, 0) - COALESCE(u.total_used, 0))::BIGINT as sessions_remaining
    FROM public.services s
    LEFT JOIN purchased p ON p.service_id = s.id
    LEFT JOIN used u ON u.service_id = s.id
    WHERE COALESCE(p.total_allowed, 0) > 0 OR COALESCE(u.total_used, 0) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Invoice generated trigger (bills table)
CREATE OR REPLACE FUNCTION public.process_package_purchase_from_bill()
RETURNS TRIGGER AS $$
DECLARE
    v_purchase_id UUID;
    v_validity_days INTEGER;
    v_expiry_date DATE;
BEGIN
    -- Only process if package_id is present
    IF NEW.package_id IS NOT NULL THEN
        -- Get validity
        SELECT validity_days INTO v_validity_days FROM public.packages WHERE id = NEW.package_id;
        IF v_validity_days IS NOT NULL THEN
            v_expiry_date := CURRENT_DATE + v_validity_days;
        END IF;

        -- Create package purchase
        INSERT INTO public.package_purchases (organization_id, client_id, package_id, bill_id, expiry_date, status)
        VALUES (NEW.organization_id, NEW.client_id, NEW.package_id, NEW.id, v_expiry_date, 'Active')
        RETURNING id INTO v_purchase_id;

        -- Map over package_services to client_service_entitlements
        INSERT INTO public.client_service_entitlements (organization_id, purchase_id, client_id, service_id, sessions_allowed)
        SELECT NEW.organization_id, v_purchase_id, NEW.client_id, ps.service_id, ps.sessions_included
        FROM public.package_services ps
        WHERE ps.package_id = NEW.package_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bills_to_entitlements ON public.bills;
CREATE TRIGGER trg_bills_to_entitlements
AFTER INSERT ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.process_package_purchase_from_bill();


-- RPC to Complete a Session
CREATE OR REPLACE FUNCTION public.complete_session(p_session_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session RECORD;
    v_remaining BIGINT;
    v_entitlement_id UUID;
BEGIN
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_session.status = 'Completed' THEN
        RAISE EXCEPTION 'Session is already completed';
    END IF;

    -- If the session is Free, Trial, or Consultation, skip deduction
    IF v_session.session_type IN ('Free', 'Trial', 'Consultation') THEN
        UPDATE public.sessions SET status = 'Completed', updated_at = NOW() WHERE id = p_session_id;
        RETURN;
    END IF;

    IF v_session.service_id IS NULL THEN
        RAISE EXCEPTION 'Session must have a service attached to consume entitlements';
    END IF;

    -- Check balance dynamically
    SELECT sessions_remaining INTO v_remaining
    FROM public.fn_compute_entitlement_balance(v_session.client_id)
    WHERE service_id = v_session.service_id;

    IF v_remaining IS NULL OR v_remaining <= 0 THEN
        RAISE EXCEPTION 'No remaining sessions available for this service (%s)', v_session.service_id;
    END IF;

    -- Find an active entitlement id to consume against (earliest expiring active)
    SELECT cse.id INTO v_entitlement_id
    FROM public.client_service_entitlements cse
    JOIN public.package_purchases pp ON pp.id = cse.purchase_id
    WHERE cse.client_id = v_session.client_id 
      AND cse.service_id = v_session.service_id
      AND pp.status = 'Active'
      AND (pp.expiry_date IS NULL OR pp.expiry_date >= CURRENT_DATE)
      AND (
          cse.sessions_allowed > (
              SELECT COUNT(*) FROM public.session_consumption_log scl WHERE scl.entitlement_id = cse.id
          )
      )
    ORDER BY pp.purchase_date ASC
    LIMIT 1;

    IF v_entitlement_id IS NULL THEN
        RAISE EXCEPTION 'Could not find a valid entitlement bucket to deduct from, despite having a positive balance. Data anomaly.';
    END IF;

    -- Mark session completed and log consumption
    UPDATE public.sessions SET 
        status = 'Completed', 
        entitlement_id = v_entitlement_id,
        updated_at = NOW() 
    WHERE id = p_session_id;

    INSERT INTO public.session_consumption_log (
        organization_id, session_id, client_id, service_id, entitlement_id, consumed_by
    ) VALUES (
        v_session.organization_id, p_session_id, v_session.client_id, v_session.service_id, v_entitlement_id, p_user_id
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
