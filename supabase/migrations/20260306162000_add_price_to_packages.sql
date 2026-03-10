-- Add price column to service_packages for billing integration

ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0;
