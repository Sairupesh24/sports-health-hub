-- Master Console Schema Migration Part 1: Enum and Schema changes
-- 1. Add 'super_admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
COMMIT;

-- 2. Add columns to public.organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended'));

-- Set default slug for existing organizations to their ID if null
UPDATE public.organizations SET slug = id::text WHERE slug IS NULL;
ALTER TABLE public.organizations ALTER COLUMN slug SET NOT NULL;
