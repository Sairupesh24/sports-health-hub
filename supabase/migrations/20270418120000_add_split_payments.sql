-- Migration: Add Split Payments support and Ensure Entitlement flags
-- Date: 2026-04-18

-- 1. Ensure is_unentitled exists in sessions (it should, but just in case)
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS is_unentitled BOOLEAN DEFAULT false;

-- 2. Create bill_payments table for tracking split payments
CREATE TABLE IF NOT EXISTS public.bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Online Bank Transfer', 'Clinic Credit')),
    transaction_id TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Add RLS to bill_payments
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to bill_payments" 
ON public.bill_payments FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE organization_id = bill_payments.organization_id));

-- 4. Function to auto-sum payments and update bill status
CREATE OR REPLACE FUNCTION public.fn_sync_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_amount DECIMAL(12,2);
    v_total_paid DECIMAL(12,2);
BEGIN
    -- Get original bill total
    SELECT total INTO v_total_amount FROM public.bills WHERE id = NEW.bill_id;
    
    -- Sum all payments for this bill
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
    FROM public.bill_payments 
    WHERE bill_id = NEW.bill_id;
    
    -- Update bill status
    IF v_total_paid >= v_total_amount THEN
        UPDATE public.bills 
        SET status = 'Paid', 
            updated_at = now() 
        WHERE id = NEW.bill_id;
    ELSIF v_total_paid > 0 THEN
        -- Optionally add 'Partially Paid' status if your UI supports it, 
        -- but keeping it 'Pending' for now as per current UI logic
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_bill_status
AFTER INSERT OR UPDATE OR DELETE ON public.bill_payments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_bill_status();

-- 5. Add is_vip to profiles if missing (for UI consistency)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
