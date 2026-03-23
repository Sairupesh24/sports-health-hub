-- System-wide fix to ensure all clinical and entitlement tables reference public.clients(id)
-- Some tables were created referencing public.profiles(id) which causes FK violations
-- since sessions.client_id now references the clients table.

DO $$
BEGIN
    -- 1. package_purchases
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'package_purchases_client_id_fkey') THEN
        ALTER TABLE public.package_purchases DROP CONSTRAINT package_purchases_client_id_fkey;
    END IF;
    ALTER TABLE public.package_purchases ADD CONSTRAINT package_purchases_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

    -- 2. client_service_entitlements
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'client_service_entitlements_client_id_fkey') THEN
        ALTER TABLE public.client_service_entitlements DROP CONSTRAINT client_service_entitlements_client_id_fkey;
    END IF;
    ALTER TABLE public.client_service_entitlements ADD CONSTRAINT client_service_entitlements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

    -- 3. session_consumption_log
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'session_consumption_log_client_id_fkey') THEN
        ALTER TABLE public.session_consumption_log DROP CONSTRAINT session_consumption_log_client_id_fkey;
    END IF;
    ALTER TABLE public.session_consumption_log ADD CONSTRAINT session_consumption_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

    -- 4. group_attendance
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'group_attendance_client_id_fkey') THEN
        ALTER TABLE public.group_attendance DROP CONSTRAINT group_attendance_client_id_fkey;
    END IF;
    ALTER TABLE public.group_attendance ADD CONSTRAINT group_attendance_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

    -- 5. session_facts
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'session_facts_client_id_fkey') THEN
        ALTER TABLE public.session_facts DROP CONSTRAINT session_facts_client_id_fkey;
    END IF;
    ALTER TABLE public.session_facts ADD CONSTRAINT session_facts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

END $$;
