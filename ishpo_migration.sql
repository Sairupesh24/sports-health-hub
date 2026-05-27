--
-- PostgreSQL database dump
--

\restrict qOIxbVypbv0GNDiMLlgnbYCU6eymVXpS097YPCq6TwH52WqsiI1BPtXSle5gCCG

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: generate_uhid_func(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_uhid_func(p_organization_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
      DECLARE
        v_month TEXT;
        v_year TEXT;
        v_year_month TEXT;
        v_serial INT;
        v_prefix TEXT;
        v_uhid TEXT;
      BEGIN
        v_month := LPAD(EXTRACT(MONTH FROM now())::TEXT, 2, '0');
        v_year := LPAD((EXTRACT(YEAR FROM now())::INT % 100)::TEXT, 2, '0');
        v_year_month := v_month || v_year;

        SELECT COALESCE(uhid_prefix, 'CSH') INTO v_prefix FROM organizations WHERE id = p_organization_id;

        INSERT INTO uhidsequences (organization_id, year_month, last_serial)
        VALUES (p_organization_id, v_year_month, 1)
        ON CONFLICT (organization_id, year_month)
        DO UPDATE SET last_serial = uhidsequences.last_serial + 1
        RETURNING last_serial INTO v_serial;

        v_uhid := v_prefix || v_year_month || LPAD(v_serial::TEXT, 4, '0');
        RETURN v_uhid;
      END;
      $$;


--
-- Name: notify_system_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_system_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        PERFORM pg_notify('system_notifications', row_to_json(NEW)::text);
        RETURN NEW;
      END;
      $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: athlete_item_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_item_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    workout_item_id uuid NOT NULL,
    athlete_id uuid,
    logged_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sets_completed jsonb,
    rpe integer,
    notes text,
    skipped boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: athlete_workout_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_workout_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid,
    workout_day_id uuid,
    organization_id uuid,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    overall_notes text,
    completion_status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: authsessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authsessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: availabilityexceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availabilityexceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    consultant_id uuid NOT NULL,
    exception_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    is_blocked boolean DEFAULT true,
    reason text
);


--
-- Name: billitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billitems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    bill_id uuid NOT NULL,
    package_id uuid,
    amount numeric DEFAULT 0 NOT NULL,
    discount numeric DEFAULT 0,
    total numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: billpayments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billpayments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    bill_id uuid NOT NULL,
    client_id uuid,
    amount numeric NOT NULL,
    payment_method text,
    transaction_id text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    discount numeric DEFAULT 0,
    total numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'unpaid'::text NOT NULL,
    referral_source_id uuid,
    notes text,
    include_notes_in_invoice boolean DEFAULT false,
    discount_authorized_by text,
    billed_by_id uuid,
    billed_by_name text,
    billing_staff_name text,
    transaction_id text,
    payment_method text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subscription_id uuid,
    due_date date
);


--
-- Name: bulk_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    questionnaire_id uuid NOT NULL,
    specialist_id uuid NOT NULL,
    total_clients integer DEFAULT 0 NOT NULL,
    responded_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: client_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_group_members (
    group_id uuid NOT NULL,
    client_id uuid NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: client_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clientadminnotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientadminnotes (
    client_id uuid NOT NULL,
    remarks text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clientdocuments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientdocuments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    document_name text NOT NULL,
    category text,
    document_type text,
    file_path text NOT NULL,
    uploaded_by uuid,
    uploaded_by_role text,
    notes text,
    access_level text DEFAULT 'Medical_Staff_Only'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cliententitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliententitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    invoice_id uuid,
    package_id uuid,
    service_id uuid,
    service_type text NOT NULL,
    granted_sessions integer NOT NULL,
    sessions_used integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    bill_item_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clientorganizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientorganizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    uhid text NOT NULL,
    registered_on timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    honorific text,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    gender text,
    mobile_no text NOT NULL,
    aadhaar_no text,
    blood_group text,
    dob date,
    age integer,
    email text,
    alternate_mobile_no text,
    occupation text,
    sport text,
    athlete_type text,
    org_name text,
    address text,
    locality text,
    pincode text,
    city text,
    district text,
    state text,
    country text DEFAULT 'India'::text,
    has_insurance boolean DEFAULT false,
    insurance_provider text,
    insurance_policy_no text,
    insurance_validity date,
    insurance_coverage_amount numeric,
    is_vip boolean DEFAULT false,
    referral_source text,
    referral_source_detail text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    profile_id uuid,
    assigned_consultant_id uuid
);


--
-- Name: consultant_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultant_services (
    organization_id uuid NOT NULL,
    consultant_id uuid NOT NULL,
    service_id uuid NOT NULL
);


--
-- Name: consultantavailability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultantavailability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    consultant_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_duration_interval integer DEFAULT 30,
    buffer_time integer DEFAULT 0
);


--
-- Name: emergency_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    status text DEFAULT 'unresolved'::text,
    reason text,
    latitude numeric,
    longitude numeric,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text,
    mobile_no text NOT NULL,
    email text,
    looking_for text,
    preferred_call_time text,
    referral_source text,
    referral_details text,
    work_place text,
    notes text,
    status text DEFAULT 'pending'::text,
    linked_client_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    next_follow_up_at timestamp with time zone,
    last_interaction_at timestamp with time zone
);


--
-- Name: enquiryinteractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiryinteractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enquiry_id uuid NOT NULL,
    interaction_type text NOT NULL,
    response_text text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    follow_up_required boolean DEFAULT false,
    follow_up_at timestamp with time zone
);


--
-- Name: exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: form_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    form_id uuid NOT NULL,
    client_id uuid NOT NULL,
    specialist_id uuid,
    bulk_assignment_id uuid,
    status text DEFAULT 'pending'::text,
    response_data jsonb,
    clinical_interpretation text,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: group_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    client_id uuid NOT NULL,
    attendance_status text DEFAULT 'Present'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    job_id uuid,
    date_of_joining date,
    employment_type text,
    bank_name text,
    bank_account_no text,
    ifsc_code text,
    emergency_contact_name text,
    emergency_contact_phone text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hrattendancelogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hrattendancelogs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    type text NOT NULL,
    latitude numeric,
    longitude numeric,
    distance_from_center numeric,
    is_within_geofence boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hrleaves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hrleaves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status text DEFAULT 'Requested'::text,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: injuries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.injuries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    diagnosis text NOT NULL,
    injury_type text NOT NULL,
    region text NOT NULL,
    injury_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status text DEFAULT 'Active'::text NOT NULL,
    side text,
    onset text,
    mechanism text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: injury_master_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.injury_master_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    region text NOT NULL,
    injury_type text NOT NULL,
    diagnosis text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: liftitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.liftitems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_item_id uuid NOT NULL,
    exercise_id uuid NOT NULL,
    sets integer DEFAULT 1 NOT NULL,
    reps text,
    load_type text DEFAULT 'kg'::text,
    load_value numeric,
    tempo text,
    rest_time_secs integer,
    additional_info text,
    workout_grouping text
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: max_pr_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.max_pr_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid,
    exercise_id uuid,
    value numeric NOT NULL,
    is_current boolean DEFAULT true,
    recorded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_reads (
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'info'::text,
    target_role text,
    target_user_id uuid,
    is_broadcast boolean DEFAULT false,
    priority text DEFAULT 'normal'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    category text DEFAULT 'in_app'::text,
    action_payload jsonb DEFAULT '{}'::jsonb,
    action_status text DEFAULT 'pending'::text,
    is_vip boolean DEFAULT false,
    sender_id uuid
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    org_code text,
    slug text,
    subscription_plan text DEFAULT 'pro'::text,
    status text DEFAULT 'active'::text,
    uhid_prefix text,
    logo_url text,
    official_name text,
    official_address text,
    contact_email text,
    contact_phone text,
    clinic_latitude numeric,
    clinic_longitude numeric,
    geofence_radius numeric,
    enable_geofencing boolean DEFAULT false,
    enable_ip_locking boolean DEFAULT false,
    allowed_ips text,
    allow_custom_duration boolean DEFAULT false,
    default_slot_duration integer DEFAULT 60
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: packageservices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packageservices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_id uuid NOT NULL,
    service_id uuid NOT NULL,
    sessions_included integer DEFAULT 1 NOT NULL
);


--
-- Name: performance_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    athlete_id uuid NOT NULL,
    category text NOT NULL,
    test_name text NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: physiosessiondetails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physiosessiondetails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    injury_id uuid,
    pain_score integer,
    modality_used text,
    treatment_type text,
    manual_therapy text,
    exercise_given text,
    range_of_motion text,
    strength_progress text,
    clinical_notes text,
    next_plan text,
    soreness_data jsonb,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    organization_id uuid,
    is_approved boolean DEFAULT false,
    uhid text,
    ams_role text,
    profession text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    avatar_url text,
    mobile_no text
);


--
-- Name: program_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    athlete_id uuid,
    program_id uuid NOT NULL,
    batch_id uuid,
    start_date date NOT NULL,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: questionnaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questionnaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    classification text DEFAULT 'performance'::text,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: referralsources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referralsources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    bill_id uuid,
    amount numeric NOT NULL,
    refund_mode text,
    transaction_id text,
    refund_proof_url text,
    reason text,
    notes text,
    status text DEFAULT 'pending'::text,
    is_override boolean DEFAULT false,
    authorized_by text,
    is_entitlement_reversed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rehab_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rehab_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    injury_id uuid NOT NULL,
    status text NOT NULL,
    notes text,
    metrics jsonb DEFAULT '{}'::jsonb,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    file_path text NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scientific_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scientific_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    athlete_id uuid,
    title text NOT NULL,
    category text NOT NULL,
    type text NOT NULL,
    description text,
    url text NOT NULL,
    thumbnail_url text,
    tags text[],
    is_public boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: servicepackages; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.servicepackages AS
 SELECT id,
    organization_id,
    name,
    description,
    price,
    deleted_at,
    created_at,
    updated_at
   FROM public.packages;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'General'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    therapist_id uuid,
    scientist_id uuid,
    entitlement_id uuid,
    service_id uuid,
    service_type text NOT NULL,
    session_mode text DEFAULT 'Individual'::text,
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    status text DEFAULT 'Planned'::text NOT NULL,
    cancellation_reason text,
    is_unentitled boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    preference_type text DEFAULT 'Strict'::text,
    is_flexible_routing boolean DEFAULT false
);


--
-- Name: sessiontypes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sessiontypes AS
 SELECT id,
    organization_id,
    name,
    category,
    is_active,
    created_at
   FROM public.services;


--
-- Name: staff_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    consultant_id uuid NOT NULL,
    shift_start time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    shift_end time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
    breaks jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subscription_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    event text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    package_id uuid NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    current_period_start date DEFAULT CURRENT_DATE NOT NULL,
    current_period_end date,
    billing_cycle text NOT NULL,
    auto_pay boolean DEFAULT false,
    next_billing_date date,
    grace_period_end date,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    dunning_step integer DEFAULT 0,
    last_dunning_at timestamp with time zone,
    last_billing_date date,
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Past Due'::text, 'Suspended'::text, 'Cancelled'::text])))
);


--
-- Name: trainingprograms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainingprograms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    scientist_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: uhidsequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uhidsequences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    year_month text NOT NULL,
    last_serial integer DEFAULT 0 NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    therapist_id uuid,
    service_id uuid,
    preferred_date date NOT NULL,
    preferred_time_slot text,
    preference_type text,
    status text DEFAULT 'Waiting'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: wellness_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellness_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    athlete_id uuid NOT NULL,
    sleep_score integer,
    stress_level integer,
    soreness_level integer,
    fatigue_level integer,
    soreness_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: workoutdays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workoutdays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    organization_id uuid,
    title text NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: workoutitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workoutitems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workout_day_id uuid NOT NULL,
    item_type text NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: athlete_item_logs athlete_item_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_item_logs
    ADD CONSTRAINT athlete_item_logs_pkey PRIMARY KEY (id);


--
-- Name: athlete_workout_completions athlete_workout_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_workout_completions
    ADD CONSTRAINT athlete_workout_completions_pkey PRIMARY KEY (id);


--
-- Name: authsessions authsessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authsessions
    ADD CONSTRAINT authsessions_pkey PRIMARY KEY (id);


--
-- Name: availabilityexceptions availabilityexceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availabilityexceptions
    ADD CONSTRAINT availabilityexceptions_pkey PRIMARY KEY (id);


--
-- Name: billitems billitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billitems
    ADD CONSTRAINT billitems_pkey PRIMARY KEY (id);


--
-- Name: billpayments billpayments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billpayments
    ADD CONSTRAINT billpayments_pkey PRIMARY KEY (id);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: bulk_assignments bulk_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_assignments
    ADD CONSTRAINT bulk_assignments_pkey PRIMARY KEY (id);


--
-- Name: client_group_members client_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_group_members
    ADD CONSTRAINT client_group_members_pkey PRIMARY KEY (group_id, client_id);


--
-- Name: client_groups client_groups_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: client_groups client_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_pkey PRIMARY KEY (id);


--
-- Name: clientadminnotes clientadminnotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientadminnotes
    ADD CONSTRAINT clientadminnotes_pkey PRIMARY KEY (client_id);


--
-- Name: clientdocuments clientdocuments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientdocuments
    ADD CONSTRAINT clientdocuments_pkey PRIMARY KEY (id);


--
-- Name: cliententitlements cliententitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliententitlements
    ADD CONSTRAINT cliententitlements_pkey PRIMARY KEY (id);


--
-- Name: clientorganizations clientorganizations_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientorganizations
    ADD CONSTRAINT clientorganizations_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: clientorganizations clientorganizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientorganizations
    ADD CONSTRAINT clientorganizations_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: clients clients_uhid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_uhid_key UNIQUE (uhid);


--
-- Name: consultant_services consultant_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_services
    ADD CONSTRAINT consultant_services_pkey PRIMARY KEY (consultant_id, service_id);


--
-- Name: consultantavailability consultantavailability_consultant_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultantavailability
    ADD CONSTRAINT consultantavailability_consultant_id_day_of_week_key UNIQUE (consultant_id, day_of_week);


--
-- Name: consultantavailability consultantavailability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultantavailability
    ADD CONSTRAINT consultantavailability_pkey PRIMARY KEY (id);


--
-- Name: emergency_alerts emergency_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: enquiryinteractions enquiryinteractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiryinteractions
    ADD CONSTRAINT enquiryinteractions_pkey PRIMARY KEY (id);


--
-- Name: exercises exercises_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- Name: group_attendance group_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_attendance
    ADD CONSTRAINT group_attendance_pkey PRIMARY KEY (id);


--
-- Name: group_attendance group_attendance_session_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_attendance
    ADD CONSTRAINT group_attendance_session_id_client_id_key UNIQUE (session_id, client_id);


--
-- Name: hr_employees hr_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_pkey PRIMARY KEY (id);


--
-- Name: hr_employees hr_employees_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_profile_id_key UNIQUE (profile_id);


--
-- Name: hr_jobs hr_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_jobs
    ADD CONSTRAINT hr_jobs_pkey PRIMARY KEY (id);


--
-- Name: hrattendancelogs hrattendancelogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrattendancelogs
    ADD CONSTRAINT hrattendancelogs_pkey PRIMARY KEY (id);


--
-- Name: hrleaves hrleaves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrleaves
    ADD CONSTRAINT hrleaves_pkey PRIMARY KEY (id);


--
-- Name: injuries injuries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injuries
    ADD CONSTRAINT injuries_pkey PRIMARY KEY (id);


--
-- Name: injury_master_data injury_master_data_organization_id_region_injury_type_diagn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injury_master_data
    ADD CONSTRAINT injury_master_data_organization_id_region_injury_type_diagn_key UNIQUE (organization_id, region, injury_type, diagnosis);


--
-- Name: injury_master_data injury_master_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injury_master_data
    ADD CONSTRAINT injury_master_data_pkey PRIMARY KEY (id);


--
-- Name: liftitems liftitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liftitems
    ADD CONSTRAINT liftitems_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: max_pr_records max_pr_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.max_pr_records
    ADD CONSTRAINT max_pr_records_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (notification_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: packages packages_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: packageservices packageservices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packageservices
    ADD CONSTRAINT packageservices_pkey PRIMARY KEY (id);


--
-- Name: performance_assessments performance_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_assessments
    ADD CONSTRAINT performance_assessments_pkey PRIMARY KEY (id);


--
-- Name: physiosessiondetails physiosessiondetails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physiosessiondetails
    ADD CONSTRAINT physiosessiondetails_pkey PRIMARY KEY (id);


--
-- Name: physiosessiondetails physiosessiondetails_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physiosessiondetails
    ADD CONSTRAINT physiosessiondetails_session_id_key UNIQUE (session_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: program_assignments program_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_assignments
    ADD CONSTRAINT program_assignments_pkey PRIMARY KEY (id);


--
-- Name: questionnaires questionnaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_pkey PRIMARY KEY (id);


--
-- Name: referralsources referralsources_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referralsources
    ADD CONSTRAINT referralsources_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: referralsources referralsources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referralsources
    ADD CONSTRAINT referralsources_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: rehab_progress rehab_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rehab_progress
    ADD CONSTRAINT rehab_progress_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: scientific_resources scientific_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scientific_resources
    ADD CONSTRAINT scientific_resources_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: staff_schedules staff_schedules_consultant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_consultant_id_key UNIQUE (consultant_id);


--
-- Name: staff_schedules staff_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_pkey PRIMARY KEY (id);


--
-- Name: subscription_logs subscription_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_logs
    ADD CONSTRAINT subscription_logs_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: trainingprograms trainingprograms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainingprograms
    ADD CONSTRAINT trainingprograms_pkey PRIMARY KEY (id);


--
-- Name: uhidsequences uhidsequences_organization_id_year_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uhidsequences
    ADD CONSTRAINT uhidsequences_organization_id_year_month_key UNIQUE (organization_id, year_month);


--
-- Name: uhidsequences uhidsequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uhidsequences
    ADD CONSTRAINT uhidsequences_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);


--
-- Name: wellness_logs wellness_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_logs
    ADD CONSTRAINT wellness_logs_pkey PRIMARY KEY (id);


--
-- Name: workoutdays workoutdays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workoutdays
    ADD CONSTRAINT workoutdays_pkey PRIMARY KEY (id);


--
-- Name: workoutitems workoutitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workoutitems
    ADD CONSTRAINT workoutitems_pkey PRIMARY KEY (id);


--
-- Name: notifications trigger_system_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_system_notification AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.notify_system_notification();


--
-- Name: athlete_item_logs athlete_item_logs_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_item_logs
    ADD CONSTRAINT athlete_item_logs_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: athlete_item_logs athlete_item_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_item_logs
    ADD CONSTRAINT athlete_item_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: athlete_item_logs athlete_item_logs_workout_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_item_logs
    ADD CONSTRAINT athlete_item_logs_workout_item_id_fkey FOREIGN KEY (workout_item_id) REFERENCES public.workoutitems(id) ON DELETE CASCADE;


--
-- Name: athlete_workout_completions athlete_workout_completions_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_workout_completions
    ADD CONSTRAINT athlete_workout_completions_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: athlete_workout_completions athlete_workout_completions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_workout_completions
    ADD CONSTRAINT athlete_workout_completions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: athlete_workout_completions athlete_workout_completions_workout_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_workout_completions
    ADD CONSTRAINT athlete_workout_completions_workout_day_id_fkey FOREIGN KEY (workout_day_id) REFERENCES public.workoutdays(id) ON DELETE SET NULL;


--
-- Name: authsessions authsessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authsessions
    ADD CONSTRAINT authsessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: availabilityexceptions availabilityexceptions_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availabilityexceptions
    ADD CONSTRAINT availabilityexceptions_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: availabilityexceptions availabilityexceptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availabilityexceptions
    ADD CONSTRAINT availabilityexceptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: billitems billitems_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billitems
    ADD CONSTRAINT billitems_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;


--
-- Name: billitems billitems_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billitems
    ADD CONSTRAINT billitems_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: billpayments billpayments_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billpayments
    ADD CONSTRAINT billpayments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;


--
-- Name: billpayments billpayments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billpayments
    ADD CONSTRAINT billpayments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: billpayments billpayments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billpayments
    ADD CONSTRAINT billpayments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bills bills_billed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_billed_by_id_fkey FOREIGN KEY (billed_by_id) REFERENCES public.users(id);


--
-- Name: bills bills_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: bills bills_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bills bills_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: bulk_assignments bulk_assignments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_assignments
    ADD CONSTRAINT bulk_assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bulk_assignments bulk_assignments_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_assignments
    ADD CONSTRAINT bulk_assignments_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: client_group_members client_group_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_group_members
    ADD CONSTRAINT client_group_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: client_group_members client_group_members_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_group_members
    ADD CONSTRAINT client_group_members_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_group_members client_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_group_members
    ADD CONSTRAINT client_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.client_groups(id) ON DELETE CASCADE;


--
-- Name: client_groups client_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: client_groups client_groups_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: clientadminnotes clientadminnotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientadminnotes
    ADD CONSTRAINT clientadminnotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clientadminnotes clientadminnotes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientadminnotes
    ADD CONSTRAINT clientadminnotes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: clientdocuments clientdocuments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientdocuments
    ADD CONSTRAINT clientdocuments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clientdocuments clientdocuments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientdocuments
    ADD CONSTRAINT clientdocuments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: clientdocuments clientdocuments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientdocuments
    ADD CONSTRAINT clientdocuments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: cliententitlements cliententitlements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliententitlements
    ADD CONSTRAINT cliententitlements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: cliententitlements cliententitlements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliententitlements
    ADD CONSTRAINT cliententitlements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: cliententitlements cliententitlements_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliententitlements
    ADD CONSTRAINT cliententitlements_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- Name: cliententitlements cliententitlements_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliententitlements
    ADD CONSTRAINT cliententitlements_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: clientorganizations clientorganizations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientorganizations
    ADD CONSTRAINT clientorganizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: clients clients_assigned_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_assigned_consultant_id_fkey FOREIGN KEY (assigned_consultant_id) REFERENCES public.users(id);


--
-- Name: clients clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: clients clients_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: clients clients_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: clients clients_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: consultant_services consultant_services_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_services
    ADD CONSTRAINT consultant_services_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: consultant_services consultant_services_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_services
    ADD CONSTRAINT consultant_services_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: consultant_services consultant_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_services
    ADD CONSTRAINT consultant_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: consultantavailability consultantavailability_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultantavailability
    ADD CONSTRAINT consultantavailability_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: consultantavailability consultantavailability_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultantavailability
    ADD CONSTRAINT consultantavailability_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: emergency_alerts emergency_alerts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: emergency_alerts emergency_alerts_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_alerts
    ADD CONSTRAINT emergency_alerts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_linked_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_linked_client_id_fkey FOREIGN KEY (linked_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: enquiries enquiries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: enquiryinteractions enquiryinteractions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiryinteractions
    ADD CONSTRAINT enquiryinteractions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: enquiryinteractions enquiryinteractions_enquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiryinteractions
    ADD CONSTRAINT enquiryinteractions_enquiry_id_fkey FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id) ON DELETE CASCADE;


--
-- Name: exercises exercises_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: form_responses form_responses_bulk_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_bulk_assignment_id_fkey FOREIGN KEY (bulk_assignment_id) REFERENCES public.bulk_assignments(id) ON DELETE SET NULL;


--
-- Name: form_responses form_responses_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: form_responses form_responses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: form_responses form_responses_specialist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_specialist_id_fkey FOREIGN KEY (specialist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: group_attendance group_attendance_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_attendance
    ADD CONSTRAINT group_attendance_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: group_attendance group_attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_attendance
    ADD CONSTRAINT group_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: hr_employees hr_employees_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.hr_jobs(id) ON DELETE SET NULL;


--
-- Name: hr_employees hr_employees_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: hr_employees hr_employees_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: hr_jobs hr_jobs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_jobs
    ADD CONSTRAINT hr_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: hrattendancelogs hrattendancelogs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrattendancelogs
    ADD CONSTRAINT hrattendancelogs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: hrattendancelogs hrattendancelogs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrattendancelogs
    ADD CONSTRAINT hrattendancelogs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: hrleaves hrleaves_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrleaves
    ADD CONSTRAINT hrleaves_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: hrleaves hrleaves_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrleaves
    ADD CONSTRAINT hrleaves_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: hrleaves hrleaves_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hrleaves
    ADD CONSTRAINT hrleaves_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: injuries injuries_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injuries
    ADD CONSTRAINT injuries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: injuries injuries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injuries
    ADD CONSTRAINT injuries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: injury_master_data injury_master_data_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.injury_master_data
    ADD CONSTRAINT injury_master_data_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: liftitems liftitems_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liftitems
    ADD CONSTRAINT liftitems_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;


--
-- Name: liftitems liftitems_workout_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liftitems
    ADD CONSTRAINT liftitems_workout_item_id_fkey FOREIGN KEY (workout_item_id) REFERENCES public.workoutitems(id) ON DELETE CASCADE;


--
-- Name: locations locations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: max_pr_records max_pr_records_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.max_pr_records
    ADD CONSTRAINT max_pr_records_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: max_pr_records max_pr_records_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.max_pr_records
    ADD CONSTRAINT max_pr_records_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: packages packages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: packageservices packageservices_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packageservices
    ADD CONSTRAINT packageservices_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: packageservices packageservices_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packageservices
    ADD CONSTRAINT packageservices_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: performance_assessments performance_assessments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_assessments
    ADD CONSTRAINT performance_assessments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: performance_assessments performance_assessments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_assessments
    ADD CONSTRAINT performance_assessments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: performance_assessments performance_assessments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_assessments
    ADD CONSTRAINT performance_assessments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: physiosessiondetails physiosessiondetails_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physiosessiondetails
    ADD CONSTRAINT physiosessiondetails_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: program_assignments program_assignments_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_assignments
    ADD CONSTRAINT program_assignments_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: program_assignments program_assignments_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_assignments
    ADD CONSTRAINT program_assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.trainingprograms(id) ON DELETE CASCADE;


--
-- Name: questionnaires questionnaires_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: questionnaires questionnaires_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: referralsources referralsources_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referralsources
    ADD CONSTRAINT referralsources_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_bill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: rehab_progress rehab_progress_injury_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rehab_progress
    ADD CONSTRAINT rehab_progress_injury_id_fkey FOREIGN KEY (injury_id) REFERENCES public.injuries(id) ON DELETE CASCADE;


--
-- Name: rehab_progress rehab_progress_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rehab_progress
    ADD CONSTRAINT rehab_progress_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);


--
-- Name: report_templates report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: report_templates report_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: scientific_resources scientific_resources_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scientific_resources
    ADD CONSTRAINT scientific_resources_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: scientific_resources scientific_resources_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scientific_resources
    ADD CONSTRAINT scientific_resources_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: scientific_resources scientific_resources_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scientific_resources
    ADD CONSTRAINT scientific_resources_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: services services_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sessions sessions_entitlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_entitlement_id_fkey FOREIGN KEY (entitlement_id) REFERENCES public.cliententitlements(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_scientist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_scientist_id_fkey FOREIGN KEY (scientist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: staff_schedules staff_schedules_consultant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: staff_schedules staff_schedules_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_schedules
    ADD CONSTRAINT staff_schedules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscription_logs subscription_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_logs
    ADD CONSTRAINT subscription_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscription_logs subscription_logs_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_logs
    ADD CONSTRAINT subscription_logs_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: trainingprograms trainingprograms_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainingprograms
    ADD CONSTRAINT trainingprograms_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: trainingprograms trainingprograms_scientist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainingprograms
    ADD CONSTRAINT trainingprograms_scientist_id_fkey FOREIGN KEY (scientist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: uhidsequences uhidsequences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uhidsequences
    ADD CONSTRAINT uhidsequences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: waitlist waitlist_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: waitlist waitlist_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: waitlist waitlist_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: waitlist waitlist_therapist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: wellness_logs wellness_logs_athlete_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_logs
    ADD CONSTRAINT wellness_logs_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wellness_logs wellness_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellness_logs
    ADD CONSTRAINT wellness_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: workoutdays workoutdays_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workoutdays
    ADD CONSTRAINT workoutdays_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: workoutdays workoutdays_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workoutdays
    ADD CONSTRAINT workoutdays_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.trainingprograms(id) ON DELETE CASCADE;


--
-- Name: workoutitems workoutitems_workout_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workoutitems
    ADD CONSTRAINT workoutitems_workout_day_id_fkey FOREIGN KEY (workout_day_id) REFERENCES public.workoutdays(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict qOIxbVypbv0GNDiMLlgnbYCU6eymVXpS097YPCq6TwH52WqsiI1BPtXSle5gCCG

