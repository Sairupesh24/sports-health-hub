-- Migration: Setup Recurring Billing Cron
-- Date: 2026-04-28

-- Enable pg_cron if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the recurring billing process to run every day at midnight
SELECT cron.schedule(
    'process-recurring-billing-daily',
    '0 0 * * *',
    $$ SELECT public.fn_process_recurring_billing() $$
);

-- Also add a function to manually trigger for testing/immediate runs
CREATE OR REPLACE FUNCTION public.fn_manual_trigger_recurring_billing()
RETURNS JSON AS $$
DECLARE
    v_results JSON;
BEGIN
    SELECT json_agg(t) INTO v_results FROM public.fn_process_recurring_billing() t;
    RETURN jsonb_build_object(
        'success', true,
        'timestamp', now(),
        'renewals_processed', COALESCE(v_results, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
