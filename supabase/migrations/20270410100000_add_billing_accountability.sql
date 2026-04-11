-- Migration for Accountability & Sequential Invoices

-- 1. Add columns to bills table
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS billed_by_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS billed_by_name TEXT;

-- 2. Create table for tracking invoice sequences per organization
CREATE TABLE IF NOT EXISTS public.org_invoice_sequences (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    last_sequence INTEGER NOT NULL DEFAULT 0,
    prefix TEXT NOT NULL DEFAULT 'INV-',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Function to get next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(v_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_prefix TEXT;
BEGIN
    INSERT INTO public.org_invoice_sequences (organization_id, last_sequence, prefix)
    VALUES (v_org_id, 1, 'INV-')
    ON CONFLICT (organization_id) 
    DO UPDATE SET last_sequence = org_invoice_sequences.last_sequence + 1, updated_at = now()
    RETURNING last_sequence, prefix INTO v_seq, v_prefix;
    
    RETURN v_prefix || LPAD(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger Function to auto-assign metadata and sequence
CREATE OR REPLACE FUNCTION public.fn_bills_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_name TEXT;
BEGIN
    -- Assign billed_by_id if not provided
    IF NEW.billed_by_id IS NULL THEN
        NEW.billed_by_id := auth.uid();
    END IF;

    -- Assign billed_by_name from profiles if not provided
    IF NEW.billed_by_name IS NULL AND NEW.billed_by_id IS NOT NULL THEN
        SELECT (first_name || ' ' || last_name) INTO v_staff_name 
        FROM public.profiles 
        WHERE id = NEW.billed_by_id;
        
        NEW.billed_by_name := v_staff_name;
    END IF;

    -- Always assign billing_staff_name for backward compatibility if it exists in schema
    NEW.billing_staff_name := COALESCE(NEW.billed_by_name, 'System');

    -- Assign invoice_number
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := public.get_next_invoice_number(NEW.organization_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bills_before_insert ON public.bills;
CREATE TRIGGER trg_bills_before_insert
BEFORE INSERT ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.fn_bills_before_insert();

-- 5. Trigger Function to protect metadata (Immutability)
CREATE OR REPLACE FUNCTION public.fn_bills_protect_metadata()
RETURNS TRIGGER AS $$
DECLARE
    v_role app_role;
BEGIN
    -- Get caller's role
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

    -- If not Super Admin or Admin, block updates to sensitive fields
    IF v_role NOT IN ('super_admin', 'admin') THEN
        IF (OLD.invoice_number IS DISTINCT FROM NEW.invoice_number) OR
           (OLD.billed_by_id IS DISTINCT FROM NEW.billed_by_id) OR
           (OLD.billed_by_name IS DISTINCT FROM NEW.billed_by_name) THEN
            RAISE EXCEPTION 'This field is immutable and can only be edited by an Administrator for audit purposes.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bills_protect_metadata ON public.bills;
CREATE TRIGGER trg_bills_protect_metadata
BEFORE UPDATE ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.fn_bills_protect_metadata();

-- 6. Add Check Constraint for Payment Method (Restricted list)
-- We check if the column exists first (it should based on previous analysis)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'payment_method') THEN
        ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS check_payment_method;
        ALTER TABLE public.bills ADD CONSTRAINT check_payment_method 
        CHECK (payment_method IS NULL OR payment_method IN ('Cash', 'UPI', 'Card', 'Online Bank Transfer', 'Clinic Credit'));
    END IF;
END
$$;

-- 7. Initialize sequences for existing orgs
INSERT INTO public.org_invoice_sequences (organization_id, last_sequence)
SELECT id, 
       COALESCE((SELECT count(*) FROM public.bills b2 WHERE b2.organization_id = o.id), 0)
FROM public.organizations o
ON CONFLICT DO NOTHING;
