-- Migration: Auto-update membership status on payment
-- Date: 2026-04-28

-- 1. Trigger function to react to bill status changes
CREATE OR REPLACE FUNCTION public.fn_on_bill_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If a bill linked to a subscription is updated
    IF NEW.subscription_id IS NOT NULL AND OLD.status <> NEW.status THEN
        -- Trigger the global status update logic
        -- This will move Overdue -> Active if pending bills are cleared
        -- and Active -> Overdue if a bill becomes old (though that usually happens via cron)
        PERFORM public.fn_update_subscription_statuses();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_on_bill_status_change ON public.bills;
CREATE TRIGGER tr_on_bill_status_change
AFTER UPDATE OF status ON public.bills
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_bill_status_change();
