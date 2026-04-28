-- Migration: Improved Subscription Invoicing Notes
-- Date: 2026-04-28

-- 1. Update Automated Billing Engine
CREATE OR REPLACE FUNCTION public.fn_process_recurring_billing(p_org_id UUID DEFAULT NULL)
RETURNS TABLE (
    processed_subscription_id UUID,
    generated_bill_id UUID,
    generated_invoice_number TEXT
) AS $$
DECLARE
    v_sub RECORD;
    v_new_bill_id UUID;
    v_invoice_num TEXT;
    v_next_date DATE;
    v_billing_month TEXT;
BEGIN
    FOR v_sub IN 
        SELECT s.*, p.name as package_name, p.price as package_price
        FROM public.subscriptions s
        JOIN public.packages p ON p.id = s.package_id
        WHERE s.status = 'Active' 
          AND s.next_billing_date <= CURRENT_DATE
          AND (p_org_id IS NULL OR s.organization_id = p_org_id)
    LOOP
        v_next_date := public.fn_calculate_next_billing_date(v_sub.next_billing_date, v_sub.billing_cycle);
        v_billing_month := to_char(v_sub.next_billing_date, 'Month YYYY');
        
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
            'Membership renewal for ' || v_billing_month,
            v_sub.next_billing_date
        ) RETURNING id, invoice_number INTO v_new_bill_id, v_invoice_num;

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

        UPDATE public.subscriptions SET 
            current_period_start = v_sub.next_billing_date,
            current_period_end = v_next_date,
            next_billing_date = v_next_date,
            last_billing_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = v_sub.id;

        INSERT INTO public.subscription_logs (
            organization_id,
            subscription_id,
            event,
            details
        ) VALUES (
            v_sub.organization_id,
            v_sub.id,
            'RENEWAL_GENERATED',
            jsonb_build_object('bill_id', v_new_bill_id, 'month', v_billing_month)
        );

        processed_subscription_id := v_sub.id;
        generated_bill_id := v_new_bill_id;
        generated_invoice_number := v_invoice_num;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Manual Invoicing Function
CREATE OR REPLACE FUNCTION public.fn_generate_subscription_invoice(p_subscription_id UUID)
RETURNS UUID AS $$
DECLARE
    v_sub RECORD;
    v_new_bill_id UUID;
    v_billing_month TEXT;
    v_next_date DATE;
BEGIN
    SELECT s.*, p.name as package_name, p.price as package_price
    INTO v_sub
    FROM public.subscriptions s
    JOIN public.packages p ON p.id = s.package_id
    WHERE s.id = p_subscription_id AND s.status = 'Active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active subscription not found';
    END IF;

    v_next_date := public.fn_calculate_next_billing_date(v_sub.next_billing_date, v_sub.billing_cycle);
    v_billing_month := to_char(v_sub.next_billing_date, 'Month YYYY');
    
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
        'Membership renewal for ' || v_billing_month,
        v_sub.next_billing_date
    ) RETURNING id INTO v_new_bill_id;

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

    UPDATE public.subscriptions SET 
        current_period_start = v_sub.next_billing_date,
        current_period_end = v_next_date,
        next_billing_date = v_next_date,
        last_billing_date = CURRENT_DATE,
        updated_at = now()
    WHERE id = v_sub.id;

    RETURN v_new_bill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
