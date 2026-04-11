-- Migration for Multiple Packages per Invoice (Bill Items)

-- 1. Create bill_items table
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS and add basic policies
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org bill items" ON public.bill_items;
CREATE POLICY "Staff can view org bill items" ON public.bill_items
    FOR SELECT USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "Staff can insert org bill items" ON public.bill_items;
CREATE POLICY "Staff can insert org bill items" ON public.bill_items
    FOR INSERT WITH CHECK (organization_id = get_my_org_id());

-- 3. Migrate existing data from bills to bill_items
INSERT INTO public.bill_items (organization_id, bill_id, package_id, amount, discount, total, created_at)
SELECT organization_id, id, package_id, amount, discount, total, created_at
FROM public.bills
WHERE package_id IS NOT NULL;

-- 4. Update the entitlement trigger logic
-- Drop old trigger
DROP TRIGGER IF EXISTS trg_bills_to_entitlements ON public.bills;

-- New function for bill_items
CREATE OR REPLACE FUNCTION public.process_package_purchase_from_bill_item()
RETURNS TRIGGER AS $$
DECLARE
    v_purchase_id UUID;
    v_validity_days INTEGER;
    v_expiry_date DATE;
    v_client_id UUID;
BEGIN
    -- Get client_id from the parent bill
    SELECT client_id INTO v_client_id FROM public.bills WHERE id = NEW.bill_id;

    -- Get validity
    SELECT validity_days INTO v_validity_days FROM public.packages WHERE id = NEW.package_id;
    IF v_validity_days IS NOT NULL THEN
        v_expiry_date := CURRENT_DATE + v_validity_days;
    END IF;

    -- Create package purchase
    INSERT INTO public.package_purchases (organization_id, client_id, package_id, bill_id, expiry_date, status)
    VALUES (NEW.organization_id, v_client_id, NEW.package_id, NEW.bill_id, v_expiry_date, 'Active')
    RETURNING id INTO v_purchase_id;

    -- Map over package_services to client_service_entitlements
    INSERT INTO public.client_service_entitlements (organization_id, purchase_id, client_id, service_id, sessions_allowed)
    SELECT NEW.organization_id, v_purchase_id, v_client_id, ps.service_id, ps.sessions_included
    FROM public.package_services ps
    WHERE ps.package_id = NEW.package_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
DROP TRIGGER IF EXISTS trg_bill_items_to_entitlements ON public.bill_items;
CREATE TRIGGER trg_bill_items_to_entitlements
AFTER INSERT ON public.bill_items
FOR EACH ROW
EXECUTE FUNCTION public.process_package_purchase_from_bill_item();
