-- Migration: Admin Billing Stats Function
-- Date: 2026-04-28

CREATE OR REPLACE FUNCTION public.fn_get_admin_billing_stats(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_revenue NUMERIC;
    v_mrr NUMERIC;
    v_active_members BIGINT;
    v_outstanding NUMERIC;
BEGIN
    -- 1. Total Revenue (all time collections)
    SELECT SUM(amount) INTO v_total_revenue 
    FROM public.bill_payments 
    WHERE organization_id = p_org_id;

    -- 2. MRR (using existing helper)
    v_mrr := public.get_mrr(p_org_id);

    -- 3. Active Members
    SELECT COUNT(*) INTO v_active_members 
    FROM public.subscriptions 
    WHERE organization_id = p_org_id AND status = 'Active';

    -- 4. Outstanding Balance
    SELECT SUM(total - COALESCE((SELECT SUM(amount) FROM public.bill_payments bp WHERE bp.bill_id = b.id), 0))
    INTO v_outstanding
    FROM public.bills b
    WHERE b.organization_id = p_org_id AND b.status != 'Paid';

    RETURN jsonb_build_object(
        'total_revenue', COALESCE(v_total_revenue, 0),
        'mrr', COALESCE(v_mrr, 0),
        'active_members', COALESCE(v_active_members, 0),
        'outstanding', COALESCE(v_outstanding, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
