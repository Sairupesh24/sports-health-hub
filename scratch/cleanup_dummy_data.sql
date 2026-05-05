-- ============================================================
-- ISHPO Platform: Clean Slate Reset Script
-- ============================================================
-- PRESERVES:
--   1. exercises & exercise_categories (Exercise Library)
--   2. injury_master_data (Injury Cascading Dropdowns)
--   3. organizations (Org structure)
--   4. Super Admin user: masteradmin@ishpo.com
--
-- CLEARS: All transactional/test data + non-super_admin users
-- ============================================================

BEGIN;

-- =============================================
-- 1. CHILD / LEAF TABLES (no dependents)
-- =============================================

-- Billing & Financial
TRUNCATE TABLE public.bill_items CASCADE;
TRUNCATE TABLE public.bill_payments CASCADE;
TRUNCATE TABLE public.refunds CASCADE;
TRUNCATE TABLE public.bills CASCADE;
TRUNCATE TABLE public.org_invoice_sequences CASCADE;

-- Subscriptions & Memberships
TRUNCATE TABLE public.subscription_logs CASCADE;
TRUNCATE TABLE public.subscriptions CASCADE;

-- Session-related
TRUNCATE TABLE public.session_facts CASCADE;
TRUNCATE TABLE public.session_consumption_log CASCADE;
TRUNCATE TABLE public.physio_session_details CASCADE;
TRUNCATE TABLE public.session_templates CASCADE;
TRUNCATE TABLE public.session_types CASCADE;
TRUNCATE TABLE public.sessions CASCADE;
TRUNCATE TABLE public.training_sessions CASCADE;

-- Appointments & Waitlist
TRUNCATE TABLE public.appointment_history CASCADE;
TRUNCATE TABLE public.appointments CASCADE;
TRUNCATE TABLE public.waitlist CASCADE;

-- Clinical / Injury Records (NOT injury_master_data)
TRUNCATE TABLE public.injuries CASCADE;
TRUNCATE TABLE public.rehab_progress CASCADE;
TRUNCATE TABLE public.return_to_play CASCADE;

-- Enquiries & CRM
TRUNCATE TABLE public.enquiry_interactions CASCADE;
TRUNCATE TABLE public.enquiries CASCADE;
TRUNCATE TABLE public.crm_stages CASCADE;

-- Notifications
TRUNCATE TABLE public.notification_reads CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.emergency_alerts CASCADE;

-- Documents
TRUNCATE TABLE public.client_documents CASCADE;

-- Client Groups
TRUNCATE TABLE public.client_group_members CASCADE;
TRUNCATE TABLE public.client_groups CASCADE;

-- Client Admin / Config
TRUNCATE TABLE public.client_admin_notes CASCADE;
TRUNCATE TABLE public.client_field_config CASCADE;
TRUNCATE TABLE public.client_assignment_history CASCADE;

-- Client Organizations & Referral Sources
TRUNCATE TABLE public.client_organizations CASCADE;
TRUNCATE TABLE public.referral_sources CASCADE;

-- Clients (main table)
TRUNCATE TABLE public.clients CASCADE;

-- Entitlements & Packages
TRUNCATE TABLE public.client_service_entitlements CASCADE;
TRUNCATE TABLE public.client_entitlements CASCADE;
TRUNCATE TABLE public.package_purchases CASCADE;
TRUNCATE TABLE public.package_services CASCADE;
TRUNCATE TABLE public.service_package_items CASCADE;
TRUNCATE TABLE public.service_packages CASCADE;
TRUNCATE TABLE public.packages CASCADE;
TRUNCATE TABLE public.services CASCADE;

-- Consultant / Availability
TRUNCATE TABLE public.consultant_availability CASCADE;
TRUNCATE TABLE public.availability_exceptions CASCADE;

-- AMS / Athlete Management
TRUNCATE TABLE public.athlete_circuit_logs CASCADE;
TRUNCATE TABLE public.athlete_item_logs CASCADE;
TRUNCATE TABLE public.athlete_saqc_logs CASCADE;
TRUNCATE TABLE public.athlete_science_responses CASCADE;
TRUNCATE TABLE public.athlete_workout_completions CASCADE;
TRUNCATE TABLE public.athlete_external_mapping CASCADE;
TRUNCATE TABLE public.external_training_summary CASCADE;
TRUNCATE TABLE public.external_telemetry CASCADE;

-- Workout / Training (NOT exercises or exercise_categories)
TRUNCATE TABLE public.workout_sets CASCADE;
TRUNCATE TABLE public.workout_logs CASCADE;
TRUNCATE TABLE public.workout_items CASCADE;
TRUNCATE TABLE public.lift_items CASCADE;
TRUNCATE TABLE public.circuit_items CASCADE;
TRUNCATE TABLE public.saqc_items CASCADE;
TRUNCATE TABLE public.sport_science_items CASCADE;
TRUNCATE TABLE public.note_items CASCADE;
TRUNCATE TABLE public.warmup_items CASCADE;
TRUNCATE TABLE public.saved_warmups CASCADE;
TRUNCATE TABLE public.workout_days CASCADE;
TRUNCATE TABLE public.program_assignments CASCADE;
TRUNCATE TABLE public.training_programs CASCADE;
TRUNCATE TABLE public.max_pr_records CASCADE;
TRUNCATE TABLE public.wellness_logs CASCADE;

-- Batches & Groups
TRUNCATE TABLE public.batch_members CASCADE;
TRUNCATE TABLE public.batches CASCADE;
TRUNCATE TABLE public.group_attendance CASCADE;

-- Questionnaires & Forms
TRUNCATE TABLE public.form_responses CASCADE;
TRUNCATE TABLE public.bulk_assignments CASCADE;
TRUNCATE TABLE public.questionnaires CASCADE;

-- Reports
TRUNCATE TABLE public.report_favorites CASCADE;
TRUNCATE TABLE public.reports_run_history CASCADE;
TRUNCATE TABLE public.report_templates CASCADE;

-- Scientist Resources
TRUNCATE TABLE public.scientist_resources CASCADE;

-- HR Module
TRUNCATE TABLE public.hr_attendance_logs CASCADE;
TRUNCATE TABLE public.hr_leaves CASCADE;
TRUNCATE TABLE public.hr_contracts CASCADE;
TRUNCATE TABLE public.hr_jobs CASCADE;
TRUNCATE TABLE public.hr_employees CASCADE;

-- Locations
TRUNCATE TABLE public.locations CASCADE;

-- Organization Settings (keep orgs, clear settings)
TRUNCATE TABLE public.organization_settings CASCADE;

-- UHID Sequences (reset counters)
TRUNCATE TABLE public.uhid_sequences CASCADE;

-- =============================================
-- 2. REMOVE NON-SUPER-ADMIN USERS
-- =============================================

-- Delete ALL users (profiles, roles, auth)
DELETE FROM public.profiles;
DELETE FROM public.user_roles;
DELETE FROM auth.users;

-- =============================================
-- 3. RE-CREATE SUPER ADMIN
--    Email:    masteradmin@ishpo.com
--    Password: superadmin123
-- =============================================
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'masteradmin@ishpo.com',
    extensions.crypt('superadmin123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Master","last_name":"Admin"}',
    now(),
    now(),
    ''
  );

  INSERT INTO public.profiles (id, first_name, last_name, email, is_approved)
  VALUES (v_user_id, 'Master', 'Admin', 'masteradmin@ishpo.com', true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin');
END $$;

COMMIT;

-- ============================================================
-- VERIFICATION: Run after to confirm clean state
-- ============================================================
-- SELECT 'auth.users' AS tbl, COUNT(*) FROM auth.users
-- UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
-- UNION ALL SELECT 'user_roles', COUNT(*) FROM public.user_roles
-- UNION ALL SELECT 'clients', COUNT(*) FROM public.clients
-- UNION ALL SELECT 'sessions', COUNT(*) FROM public.sessions
-- UNION ALL SELECT 'exercises', COUNT(*) FROM public.exercises
-- UNION ALL SELECT 'injury_master_data', COUNT(*) FROM public.injury_master_data;
