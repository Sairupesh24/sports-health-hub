-- Migration: Membership Management (Stop & Overdue)
-- Date: 2026-04-28

-- 1. Ensure status column can handle Overdue/Cancelled
-- (Assuming it's a text column or has these values)

-- 2. Function to update membership statuses based on payment age
CREATE OR REPLACE FUNCTION public.fn_update_subscription_statuses()
RETURNS void AS $$
BEGIN
    -- Mark as Overdue if there is a Pending bill older than 10 days
    UPDATE public.subscriptions s
    SET status = 'Overdue',
        updated_at = now()
    FROM public.bills b
    WHERE b.subscription_id = s.id
      AND b.status = 'Pending'
      AND b.created_at < now() - INTERVAL '10 days'
      AND s.status = 'Active';

    -- Mark as Active again if all bills are paid (optional but good for recovery)
    UPDATE public.subscriptions s
    SET status = 'Active',
        updated_at = now()
    WHERE s.status = 'Overdue'
      AND NOT EXISTS (
          SELECT 1 FROM public.bills b 
          WHERE b.subscription_id = s.id AND b.status = 'Pending'
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to cancel a subscription
CREATE OR REPLACE FUNCTION public.fn_cancel_subscription(p_subscription_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.subscriptions 
    SET status = 'Cancelled',
        updated_at = now()
    WHERE id = p_subscription_id;

    INSERT INTO public.subscription_logs (
        organization_id,
        subscription_id,
        event,
        details
    ) 
    SELECT organization_id, id, 'CANCELLED', '{"reason": "Manual cancellation"}'
    FROM public.subscriptions
    WHERE id = p_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
