-- Migration to split the generic 'consultant' role into specialized roles.
-- For now, these roles will share the same dashboard and base permissions.

-- 1. Add 'sports_physician' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sports_physician';

-- 2. Add 'physiotherapist' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'physiotherapist';

-- 3. Add 'nutritionist' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nutritionist';
