-- Migration to make Service Types Dynamic

-- 1. Drop the check constraint on service_package_items
-- We need to find the name of the constraint and drop it.
-- Since the schema was created with: service_type TEXT NOT NULL CHECK (service_type IN (...))
-- Supabase automatically names it something like service_package_items_service_type_check.

ALTER TABLE public.service_package_items DROP CONSTRAINT IF EXISTS service_package_items_service_type_check;

-- Note: Depending on postgres auto-naming, it may be exactly that. 
-- Just in case we created an ENUM earlier, we ensure it's TEXT (which it already is).
