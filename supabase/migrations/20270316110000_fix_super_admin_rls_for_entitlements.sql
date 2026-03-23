-- Migration to fix RLS for Super Admin management of Services and Packages
-- This allows Super Admins to manage these entities across all organizations.
-- Uses explicit policies for each operation to avoid any ambiguity.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY['services', 'packages', 'package_services', 'package_purchases', 'client_service_entitlements', 'session_consumption_log'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Super admins manage %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Super admins manage all %I" ON public.%I', t, t);
        
        -- SELECT
        EXECUTE format('DROP POLICY IF EXISTS "Super admins select %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Super admins select %I" ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''super_admin''))', t, t);
        
        -- INSERT
        EXECUTE format('DROP POLICY IF EXISTS "Super admins insert %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Super admins insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''super_admin''))', t, t);
        
        -- UPDATE
        EXECUTE format('DROP POLICY IF EXISTS "Super admins update %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Super admins update %I" ON public.%I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''super_admin''))', t, t);
        
        -- DELETE
        EXECUTE format('DROP POLICY IF EXISTS "Super admins delete %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Super admins delete %I" ON public.%I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''super_admin''))', t, t);
    END LOOP;
END $$;
