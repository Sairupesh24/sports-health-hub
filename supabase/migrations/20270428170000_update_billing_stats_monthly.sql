-- Migration: Updated Admin Billing Stats (Monthly)
-- Date: 2026-04-28

CREATE OR REPLACE FUNCTION public.fn_get_admin_billing_stats(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_revenue_month NUMERIC;
    v_mrr NUMERIC;
    v_active_members BIGINT;
    v_outstanding NUMERIC;
    v_start_of_month DATE;
BEGIN
    v_start_of_month := date_trunc('month', CURRENT_DATE)::DATE;

    -- 1. Total Revenue for CURRENT MONTH
    SELECT SUM(amount) INTO v_total_revenue_month 
    FROM public.bill_payments 
    WHERE organization_id = p_org_id
      AND created_at >= v_start_of_month;

    -- 2. MRR
    v_mrr := public.get_mrr(p_org_id);

    -- 3. Active Members (Count all active subscriptions for this org)
    SELECT COUNT(*) INTO v_active_members 
    FROM public.subscriptions 
    WHERE organization_id = p_org_id 
      AND status = 'Active';

    -- 4. Outstanding Balance (Total due on non-paid bills)
    SELECT SUM(total - COALESCE((SELECT SUM(amount) FROM public.bill_payments bp WHERE bp.bill_id = b.id), 0))
    INTO v_outstanding
    FROM public.bills b
    WHERE b.organization_id = p_org_id AND b.status != 'Paid';

    RETURN jsonb_build_object(
        'total_revenue', COALESCE(v_total_revenue_month, 0),
        'mrr', COALESCE(v_mrr, 0),
        'active_members', COALESCE(v_active_members, 0),
        'outstanding', COALESCE(v_outstanding, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
