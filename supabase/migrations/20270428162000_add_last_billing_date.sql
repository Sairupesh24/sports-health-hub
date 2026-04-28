-- Migration: Add Last Billing Date to Subscriptions
-- Date: 2026-04-28

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS last_billing_date DATE;
