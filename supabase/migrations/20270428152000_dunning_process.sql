-- Migration: Dunning Process
-- Date: 2026-04-28

-- 1. Add dunning state to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS dunning_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dunning_at TIMESTAMP WITH TIME ZONE;

-- 2. Dunning Process Function
CREATE OR REPLACE FUNCTION public.fn_process_dunning()
RETURNS TABLE (
    subscription_id UUID,
    client_id UUID,
    dunning_step INTEGER,
    action_taken TEXT
) AS $$
DECLARE
    v_bill RECORD;
BEGIN
    -- Loop through unpaid bills past due date
    FOR v_bill IN 
        SELECT b.*, s.dunning_step as current_step, c.first_name, c.last_name, s.id as sub_id
        FROM public.bills b
        JOIN public.subscriptions s ON s.id = b.subscription_id
        JOIN public.clients c ON c.id = b.client_id
        WHERE b.status = 'Pending' 
          AND b.due_date < CURRENT_DATE
          AND s.status = 'Active'
    LOOP
        -- Calculate days past due
        DECLARE
            v_days_past_due INTEGER := (CURRENT_DATE - v_bill.due_date);
        BEGIN
            -- Day 1 Dunning
            IF v_days_past_due = 1 AND v_bill.current_step < 1 THEN
                UPDATE public.subscriptions SET dunning_step = 1, last_dunning_at = now() WHERE id = v_bill.sub_id;
                INSERT INTO public.subscription_logs (organization_id, subscription_id, event, details)
                VALUES (v_bill.organization_id, v_bill.sub_id, 'DUNNING_STEP_1', jsonb_build_object('bill_id', v_bill.id, 'days_past_due', 1));
                
                subscription_id := v_bill.sub_id;
                client_id := v_bill.client_id;
                dunning_step := 1;
                action_taken := 'REMINDER_1_SENT';
                RETURN NEXT;
            END IF;

            -- Day 3 Dunning
            IF v_days_past_due = 3 AND v_bill.current_step < 2 THEN
                UPDATE public.subscriptions SET dunning_step = 2, last_dunning_at = now() WHERE id = v_bill.sub_id;
                INSERT INTO public.subscription_logs (organization_id, subscription_id, event, details)
                VALUES (v_bill.organization_id, v_bill.sub_id, 'DUNNING_STEP_2', jsonb_build_object('bill_id', v_bill.id, 'days_past_due', 3));
                
                subscription_id := v_bill.sub_id;
                client_id := v_bill.client_id;
                dunning_step := 2;
                action_taken := 'REMINDER_2_SENT';
                RETURN NEXT;
            END IF;

            -- Day 5 Dunning: Suspend
            IF v_days_past_due >= 5 AND v_bill.current_step < 3 THEN
                UPDATE public.subscriptions SET status = 'Suspended', dunning_step = 3, last_dunning_at = now() WHERE id = v_bill.sub_id;
                INSERT INTO public.subscription_logs (organization_id, subscription_id, event, details)
                VALUES (v_bill.organization_id, v_bill.sub_id, 'SUBSCRIPTION_SUSPENDED', jsonb_build_object('bill_id', v_bill.id, 'days_past_due', v_days_past_due));
                
                subscription_id := v_bill.sub_id;
                client_id := v_bill.client_id;
                dunning_step := 3;
                action_taken := 'SUBSCRIPTION_SUSPENDED';
                RETURN NEXT;
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to reset dunning on payment
CREATE OR REPLACE FUNCTION public.fn_on_bill_paid_reset_dunning()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Paid' AND OLD.status != 'Paid' AND NEW.subscription_id IS NOT NULL THEN
        UPDATE public.subscriptions 
        SET status = 'Active', 
            dunning_step = 0, 
            last_dunning_at = NULL 
        WHERE id = NEW.subscription_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bill_paid_reset_dunning
AFTER UPDATE ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_bill_paid_reset_dunning();
