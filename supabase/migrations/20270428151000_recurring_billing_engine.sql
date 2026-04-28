-- Migration: Recurring Billing Engine
-- Date: 2026-04-28

-- 1. Helper function to calculate next billing date
CREATE OR REPLACE FUNCTION public.fn_calculate_next_billing_date(p_start_date DATE, p_cycle TEXT)
RETURNS DATE AS $$
BEGIN
    RETURN CASE 
        WHEN p_cycle = 'Monthly' THEN p_start_date + INTERVAL '1 month'
        WHEN p_cycle = 'Quarterly' THEN p_start_date + INTERVAL '3 months'
        WHEN p_cycle = 'Annual' THEN p_start_date + INTERVAL '1 year'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Core Recurring Billing Engine Function
CREATE OR REPLACE FUNCTION public.fn_process_recurring_billing(p_org_id UUID DEFAULT NULL)
RETURNS TABLE (
    subscription_id UUID,
    bill_id UUID,
    invoice_number TEXT
) AS $$
DECLARE
    v_sub RECORD;
    v_new_bill_id UUID;
    v_invoice_num TEXT;
    v_total NUMERIC;
    v_package RECORD;
    v_next_date DATE;
BEGIN
    -- Loop through active subscriptions that need renewal
    FOR v_sub IN 
        SELECT s.*, p.name as package_name, p.price as package_price
        FROM public.subscriptions s
        JOIN public.packages p ON p.id = s.package_id
        WHERE s.status = 'Active' 
          AND s.next_billing_date <= CURRENT_DATE
          AND (p_org_id IS NULL OR s.organization_id = p_org_id)
    LOOP
        -- Calculate next billing date
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
            'Automated renewal for ' || v_sub.package_name,
            CURRENT_DATE + INTERVAL '3 days' -- 3 days grace period by default
        ) RETURNING id, invoice_number INTO v_new_bill_id, v_invoice_num;

        -- Create Bill Items (copying from package_services)
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

        -- Update Subscription
        UPDATE public.subscriptions SET 
            current_period_start = v_sub.next_billing_date,
            current_period_end = v_next_date,
            next_billing_date = v_next_date,
            last_billing_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = v_sub.id;

        -- Log the renewal
        INSERT INTO public.subscription_logs (
            organization_id,
            subscription_id,
            event,
            details
        ) VALUES (
            v_sub.organization_id,
            v_sub.id,
            'RENEWAL_GENERATED',
            jsonb_build_object(
                'bill_id', v_new_bill_id,
                'invoice_number', v_invoice_num,
                'amount', v_sub.package_price,
                'next_billing_date', v_next_date
            )
        );

        subscription_id := v_sub.id;
        bill_id := v_new_bill_id;
        invoice_number := v_invoice_num;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to handle manual subscription start
CREATE OR REPLACE FUNCTION public.fn_start_subscription(
    p_org_id UUID,
    p_client_id UUID,
    p_package_id UUID,
    p_auto_pay BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
    v_package RECORD;
    v_sub_id UUID;
    v_next_date DATE;
BEGIN
    SELECT * INTO v_package FROM public.packages WHERE id = p_package_id;
    
    IF NOT v_package.is_recurring THEN
        RAISE EXCEPTION 'Package is not recurring';
    END IF;

    v_next_date := public.fn_calculate_next_billing_date(CURRENT_DATE, v_package.billing_cycle);

    INSERT INTO public.subscriptions (
        organization_id,
        client_id,
        package_id,
        status,
        current_period_start,
        current_period_end,
        billing_cycle,
        auto_pay,
        next_billing_date
    ) VALUES (
        p_org_id,
        p_client_id,
        p_package_id,
        'Active',
        CURRENT_DATE,
        v_next_date,
        v_package.billing_cycle,
        p_auto_pay,
        v_next_date
    ) RETURNING id INTO v_sub_id;

    -- Initial Invoice is usually handled by the checkout flow, 
    -- but we can log the subscription start.
    INSERT INTO public.subscription_logs (
        organization_id,
        subscription_id,
        event,
        details
    ) VALUES (
        p_org_id,
        v_sub_id,
        'SUBSCRIPTION_STARTED',
        jsonb_build_object(
            'package_id', p_package_id,
            'package_name', v_package.name,
            'billing_cycle', v_package.billing_cycle
        )
    );

    RETURN v_sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
