-- Migration: Membership Analytics
-- Date: 2026-04-28

-- 1. Get Monthly Recurring Revenue (MRR)
CREATE OR REPLACE FUNCTION public.get_mrr(p_org_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_mrr NUMERIC;
BEGIN
    SELECT SUM(
        CASE 
            WHEN s.billing_cycle = 'Monthly' THEN p.price
            WHEN s.billing_cycle = 'Quarterly' THEN p.price / 3
            WHEN s.billing_cycle = 'Annual' THEN p.price / 12
            ELSE 0
        END
    ) INTO v_mrr
    FROM public.subscriptions s
    JOIN public.packages p ON p.id = s.package_id
    WHERE s.organization_id = p_org_id 
      AND s.status = 'Active';
    
    RETURN COALESCE(v_mrr, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Churn Stats
CREATE OR REPLACE FUNCTION public.get_churn_stats(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    cancelled_count BIGINT,
    expired_count BIGINT,
    churn_rate NUMERIC
) AS $$
DECLARE
    v_total_active BIGINT;
    v_cancelled BIGINT;
    v_expired BIGINT;
BEGIN
    -- Current active count
    SELECT COUNT(*) INTO v_total_active FROM public.subscriptions WHERE organization_id = p_org_id AND status = 'Active';
    
    -- Cancelled in last P_DAYS
    SELECT COUNT(*) INTO v_cancelled 
    FROM public.subscriptions 
    WHERE organization_id = p_org_id 
      AND status = 'Cancelled' 
      AND updated_at >= now() - (p_days || ' days')::INTERVAL;

    -- Expired in last P_DAYS
    SELECT COUNT(*) INTO v_expired 
    FROM public.package_purchases 
    WHERE organization_id = p_org_id 
      AND status = 'Expired' 
      AND updated_at >= now() - (p_days || ' days')::INTERVAL;

    cancelled_count := v_cancelled;
    expired_count := v_expired;
    
    IF (v_total_active + v_cancelled + v_expired) > 0 THEN
        churn_rate := (v_cancelled + v_expired)::NUMERIC / (v_total_active + v_cancelled + v_expired)::NUMERIC * 100;
    ELSE
        churn_rate := 0;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Quiet Members (High Churn Risk)
-- Active members with no sessions in last 14 days
CREATE OR REPLACE FUNCTION public.get_quiet_members(p_org_id UUID, p_days_threshold INTEGER DEFAULT 14)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    package_name TEXT,
    last_session_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as client_id,
        (c.first_name || ' ' || c.last_name) as client_name,
        p.name as package_name,
        MAX(scl.consumed_on) as last_session_date
    FROM public.subscriptions s
    JOIN public.clients c ON c.id = s.client_id
    JOIN public.packages p ON p.id = s.package_id
    LEFT JOIN public.session_consumption_log scl ON scl.client_id = c.id
    WHERE s.organization_id = p_org_id 
      AND s.status = 'Active'
    GROUP BY c.id, c.first_name, c.last_name, p.name
    HAVING MAX(scl.consumed_on) IS NULL OR MAX(scl.consumed_on) < now() - (p_days_threshold || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
