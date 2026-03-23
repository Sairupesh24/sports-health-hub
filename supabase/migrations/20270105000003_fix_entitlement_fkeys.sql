-- Fix `package_purchases`, `client_service_entitlements`, and `session_consumption_log` fkeys
-- They were incorrectly referencing `profiles(id)` instead of `clients(id)` for the `client_id` column.

-- 1. package_purchases
ALTER TABLE public.package_purchases DROP CONSTRAINT IF EXISTS package_purchases_client_id_fkey;
ALTER TABLE public.package_purchases ADD CONSTRAINT package_purchases_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- 2. client_service_entitlements
ALTER TABLE public.client_service_entitlements DROP CONSTRAINT IF EXISTS client_service_entitlements_client_id_fkey;
ALTER TABLE public.client_service_entitlements ADD CONSTRAINT client_service_entitlements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- 3. session_consumption_log
ALTER TABLE public.session_consumption_log DROP CONSTRAINT IF EXISTS session_consumption_log_client_id_fkey;
ALTER TABLE public.session_consumption_log ADD CONSTRAINT session_consumption_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
