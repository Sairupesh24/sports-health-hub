-- Migration: Manual Subscription Invoice Generation
-- Date: 2026-04-28

CREATE OR REPLACE FUNCTION public.fn_generate_subscription_invoice(p_subscription_id UUID)
RETURNS UUID AS $$
DECLARE
    v_sub RECORD;
    v_new_bill_id UUID;
    v_invoice_num TEXT;
    v_next_date DATE;
BEGIN
    -- Get subscription details
    SELECT s.*, p.name as package_name, p.price as package_price
    INTO v_sub
    FROM public.subscriptions s
    JOIN public.packages p ON p.id = s.package_id
    WHERE s.id = p_subscription_id AND s.status = 'Active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active subscription not found';
    END IF;

    -- Calculate next billing date (relative to the CURRENT next_billing_date)
    v_next_date := public.fn_calculate_next_billing_date(v_sub.next_billing_date, v_sub.billing_cycle);
    
    -- Create a new Bill
    INSERT INTO public.bills (
        organization_id,
        client_id,
        package_id,
        subscription_id,
        amount,
        discount,
        total,
        status,
        notes,
        due_date
    ) VALUES (
        v_sub.organization_id,
        v_sub.client_id,
        v_sub.package_id,
        v_sub.id,
        v_sub.package_price,
        0,
        v_sub.package_price,
        'Pending',
        'Early renewal for ' || v_sub.package_name,
        v_sub.next_billing_date -- Due on the actual next billing date
    ) RETURNING id INTO v_new_bill_id;

    -- Create Bill Items
    INSERT INTO public.bill_items (
        organization_id,
        bill_id,
        package_id,
        amount,
        discount,
        total
    ) VALUES (
        v_sub.organization_id,
        v_new_bill_id,
        v_sub.package_id,
        v_sub.package_price,
        0,
        v_sub.package_price
    );

    -- Update Subscription to move the period forward
    UPDATE public.subscriptions SET 
        current_period_start = v_sub.next_billing_date,
        current_period_end = v_next_date,
        next_billing_date = v_next_date,
        last_billing_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = v_sub.id;

    -- Log the manual renewal
    INSERT INTO public.subscription_logs (
        organization_id,
        subscription_id,
        event,
        details
    ) VALUES (
        v_sub.organization_id,
        v_sub.id,
        'MANUAL_RENEWAL_GENERATED',
        jsonb_build_object(
            'bill_id', v_new_bill_id,
            'amount', v_sub.package_price,
            'next_billing_date', v_next_date,
            'triggered_by', auth.uid()
        )
    );

    RETURN v_new_bill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
