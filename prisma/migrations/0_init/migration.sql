-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "athlete_item_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "workout_item_id" UUID NOT NULL,
    "athlete_id" UUID,
    "logged_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "sets_completed" JSONB,
    "rpe" INTEGER,
    "notes" TEXT,
    "skipped" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_item_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_workout_completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "athlete_id" UUID,
    "workout_day_id" UUID,
    "organization_id" UUID,
    "completed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "overall_notes" TEXT,
    "completion_status" TEXT DEFAULT 'completed',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_workout_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authsessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "otp_code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "authsessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilityexceptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "consultant_id" UUID NOT NULL,
    "exception_date" DATE NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "is_blocked" BOOLEAN DEFAULT true,
    "reason" TEXT,

    CONSTRAINT "availabilityexceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billitems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "package_id" UUID,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billitems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billpayments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "client_id" UUID,
    "amount" DECIMAL NOT NULL,
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billpayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "referral_source_id" UUID,
    "notes" TEXT,
    "include_notes_in_invoice" BOOLEAN DEFAULT false,
    "discount_authorized_by" TEXT,
    "billed_by_id" UUID,
    "billed_by_name" TEXT,
    "billing_staff_name" TEXT,
    "transaction_id" TEXT,
    "payment_method" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" UUID,
    "due_date" DATE,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "total_clients" INTEGER NOT NULL DEFAULT 0,
    "responded_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_assessment_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "test_index" INTEGER NOT NULL,
    "assessment_data" JSONB NOT NULL,
    "report_texts" JSONB NOT NULL,
    "pain_data" JSONB NOT NULL,
    "reassessment_date" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_assessment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_group_members" (
    "group_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "added_by" UUID,
    "added_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_group_members_pkey" PRIMARY KEY ("group_id","client_id")
);

-- CreateTable
CREATE TABLE "client_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_soreness_reports" (
    "report_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" VARCHAR(50) NOT NULL,
    "client_uhid" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_staff_id" UUID NOT NULL,
    "soreness_data" JSONB NOT NULL,
    "global_clinical_interpretation" TEXT NOT NULL,

    CONSTRAINT "client_soreness_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "clientadminnotes" (
    "client_id" UUID NOT NULL,
    "remarks" TEXT NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientadminnotes_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "clientdocuments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "document_name" TEXT NOT NULL,
    "category" TEXT,
    "document_type" TEXT,
    "file_path" TEXT NOT NULL,
    "uploaded_by" UUID,
    "uploaded_by_role" TEXT,
    "notes" TEXT,
    "access_level" TEXT DEFAULT 'Medical_Staff_Only',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientdocuments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliententitlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "invoice_id" UUID,
    "package_id" UUID,
    "service_id" UUID,
    "service_type" TEXT NOT NULL,
    "granted_sessions" INTEGER NOT NULL,
    "sessions_used" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'active',
    "bill_item_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliententitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientorganizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientorganizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "location_id" UUID,
    "uhid" TEXT NOT NULL,
    "registered_on" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "honorific" TEXT,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "gender" TEXT,
    "mobile_no" TEXT NOT NULL,
    "aadhaar_no" TEXT,
    "blood_group" TEXT,
    "dob" DATE,
    "age" INTEGER,
    "email" TEXT,
    "alternate_mobile_no" TEXT,
    "occupation" TEXT,
    "sport" TEXT,
    "athlete_type" TEXT,
    "org_name" TEXT,
    "address" TEXT,
    "locality" TEXT,
    "pincode" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "has_insurance" BOOLEAN DEFAULT false,
    "insurance_provider" TEXT,
    "insurance_policy_no" TEXT,
    "insurance_validity" DATE,
    "insurance_coverage_amount" DECIMAL,
    "is_vip" BOOLEAN DEFAULT false,
    "referral_source" TEXT,
    "referral_source_detail" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "profile_id" UUID,
    "assigned_consultant_id" UUID,
    "primary_scientist_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_services" (
    "organization_id" UUID NOT NULL,
    "consultant_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "consultant_services_pkey" PRIMARY KEY ("consultant_id","service_id")
);

-- CreateTable
CREATE TABLE "consultantavailability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "consultant_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "slot_duration_interval" INTEGER DEFAULT 30,
    "buffer_time" INTEGER DEFAULT 0,

    CONSTRAINT "consultantavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "status" TEXT DEFAULT 'unresolved',
    "reason" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "mobile_no" TEXT NOT NULL,
    "email" TEXT,
    "looking_for" TEXT,
    "preferred_call_time" TEXT,
    "referral_source" TEXT,
    "referral_details" TEXT,
    "work_place" TEXT,
    "notes" TEXT,
    "status" TEXT DEFAULT 'pending',
    "linked_client_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "next_follow_up_at" TIMESTAMPTZ(6),
    "last_interaction_at" TIMESTAMPTZ(6),

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiryinteractions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enquiry_id" UUID NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "response_text" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "follow_up_required" BOOLEAN DEFAULT false,
    "follow_up_at" TIMESTAMPTZ(6),

    CONSTRAINT "enquiryinteractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excel_diagnostic_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_uhid" TEXT,
    "patient_name" TEXT NOT NULL,
    "dob" DATE,
    "test_history" JSONB NOT NULL,
    "latest_metrics" JSONB NOT NULL,
    "clinical_interpretation" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excel_diagnostic_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "equipment_type" TEXT,
    "difficulty_level" TEXT,
    "muscle_groups" TEXT[],
    "body_region" TEXT,
    "equipment_required" TEXT,
    "instructions" TEXT,
    "video_url" TEXT,
    "is_rehabilitation" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_training_summary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "external_system" TEXT NOT NULL DEFAULT 'TeamBuildr',
    "training_date" DATE NOT NULL,
    "workout_name" TEXT,
    "duration_minutes" INTEGER,
    "training_load" DECIMAL,
    "completion_status" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_training_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "form_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "specialist_id" UUID,
    "bulk_assignment_id" UUID,
    "status" TEXT DEFAULT 'pending',
    "response_data" JSONB,
    "clinical_interpretation" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "attendance_status" TEXT NOT NULL DEFAULT 'Present',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "job_id" UUID,
    "date_of_joining" DATE,
    "employment_type" TEXT,
    "bank_name" TEXT,
    "bank_account_no" TEXT,
    "ifsc_code" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hrattendancelogs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "distance_from_center" DECIMAL,
    "is_within_geofence" BOOLEAN DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hrattendancelogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hrleaves" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "status" TEXT DEFAULT 'Requested',
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hrleaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "injuries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "injury_type" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "injury_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "side" TEXT,
    "onset" TEXT,
    "mechanism" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "injuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "injury_master_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "region" TEXT NOT NULL,
    "injury_type" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "injury_master_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liftitems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workout_item_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 1,
    "reps" TEXT,
    "load_type" TEXT DEFAULT 'kg',
    "load_value" DECIMAL,
    "tempo" TEXT,
    "rest_time_secs" INTEGER,
    "additional_info" TEXT,
    "workout_grouping" TEXT,

    CONSTRAINT "liftitems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "max_pr_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "athlete_id" UUID,
    "exercise_id" UUID,
    "value" DECIMAL NOT NULL,
    "is_current" BOOLEAN DEFAULT true,
    "recorded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "max_pr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_reads" (
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT DEFAULT 'info',
    "target_role" TEXT,
    "target_user_id" UUID,
    "is_broadcast" BOOLEAN DEFAULT false,
    "priority" TEXT DEFAULT 'normal',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT DEFAULT 'in_app',
    "action_payload" JSONB DEFAULT '{}',
    "action_status" TEXT DEFAULT 'pending',
    "is_vip" BOOLEAN DEFAULT false,
    "sender_id" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_notification_settings" (
    "organization_id" UUID NOT NULL,
    "enable_email_notifications" BOOLEAN DEFAULT true,
    "enable_in_app_notifications" BOOLEAN DEFAULT true,
    "notify_signup_approval" BOOLEAN DEFAULT true,
    "notify_questionnaire_assigned" BOOLEAN DEFAULT true,
    "notify_questionnaire_completed" BOOLEAN DEFAULT true,
    "notify_emergency_leave" BOOLEAN DEFAULT true,
    "notify_outstanding_balance" BOOLEAN DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_notification_settings_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "org_code" TEXT,
    "slug" TEXT,
    "subscription_plan" TEXT DEFAULT 'pro',
    "status" TEXT DEFAULT 'active',
    "uhid_prefix" TEXT,
    "logo_url" TEXT,
    "official_name" TEXT,
    "official_address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "clinic_latitude" DECIMAL,
    "clinic_longitude" DECIMAL,
    "geofence_radius" DECIMAL,
    "enable_geofencing" BOOLEAN DEFAULT false,
    "enable_ip_locking" BOOLEAN DEFAULT false,
    "allowed_ips" TEXT,
    "allow_custom_duration" BOOLEAN DEFAULT false,
    "default_slot_duration" INTEGER DEFAULT 60,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packageservices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "package_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "sessions_included" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "packageservices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "athlete_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "test_name" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physiosessiondetails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID,
    "injury_id" UUID,
    "pain_score" INTEGER,
    "modality_used" TEXT,
    "treatment_type" TEXT,
    "manual_therapy" TEXT,
    "exercise_given" TEXT,
    "range_of_motion" TEXT,
    "strength_progress" TEXT,
    "clinical_notes" TEXT,
    "next_plan" TEXT,
    "soreness_data" JSONB,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physiosessiondetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "organization_id" UUID,
    "is_approved" BOOLEAN DEFAULT false,
    "uhid" TEXT,
    "ams_role" TEXT,
    "profession" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "avatar_url" TEXT,
    "mobile_no" TEXT,
    "has_calendar_access" BOOLEAN DEFAULT false,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "athlete_id" UUID,
    "program_id" UUID NOT NULL,
    "batch_id" UUID,
    "start_date" DATE NOT NULL,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "classification" TEXT DEFAULT 'performance',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referralsources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referralsources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "bill_id" UUID,
    "amount" DECIMAL NOT NULL,
    "refund_mode" TEXT,
    "transaction_id" TEXT,
    "refund_proof_url" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT DEFAULT 'pending',
    "is_override" BOOLEAN DEFAULT false,
    "authorized_by" TEXT,
    "is_entitlement_reversed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehab_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "injury_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "metrics" JSONB DEFAULT '{}',
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rehab_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scientific_resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "athlete_id" UUID,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "tags" TEXT[],
    "is_public" BOOLEAN DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scientific_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT DEFAULT 'General',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "base_price" DECIMAL DEFAULT 0,
    "min_duration" INTEGER DEFAULT 30,
    "max_duration" INTEGER DEFAULT 120,
    "is_universal" BOOLEAN DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scientist_id" UUID NOT NULL,
    "template_name" TEXT NOT NULL,
    "session_type_id" UUID,
    "default_duration" interval DEFAULT '01:00:00'::interval,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID,
    "therapist_id" UUID,
    "scientist_id" UUID,
    "entitlement_id" UUID,
    "service_id" UUID,
    "service_type" TEXT NOT NULL,
    "session_mode" TEXT DEFAULT 'Individual',
    "scheduled_start" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_end" TIMESTAMPTZ(6) NOT NULL,
    "actual_start" TIMESTAMPTZ(6),
    "actual_end" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "cancellation_reason" TEXT,
    "is_unentitled" BOOLEAN DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "preference_type" TEXT DEFAULT 'Strict',
    "is_flexible_routing" BOOLEAN DEFAULT false,
    "group_name" TEXT,
    "session_location" TEXT,
    "session_notes" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "session_type_id" UUID,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "consultant_id" UUID NOT NULL,
    "shift_start" TIME(6) NOT NULL DEFAULT '08:00:00'::time without time zone,
    "shift_end" TIME(6) NOT NULL DEFAULT '17:00:00'::time without time zone,
    "breaks" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "current_period_start" DATE NOT NULL DEFAULT CURRENT_DATE,
    "current_period_end" DATE,
    "billing_cycle" TEXT NOT NULL,
    "auto_pay" BOOLEAN DEFAULT false,
    "next_billing_date" DATE,
    "grace_period_end" DATE,
    "cancel_at_period_end" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "dunning_step" INTEGER DEFAULT 0,
    "last_dunning_at" TIMESTAMPTZ(6),
    "last_billing_date" DATE,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainingprograms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scientist_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainingprograms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uhidsequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "year_month" TEXT NOT NULL,
    "last_serial" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "uhidsequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "therapist_id" UUID,
    "service_id" UUID,
    "preferred_date" DATE NOT NULL,
    "preferred_time_slot" TEXT,
    "preference_type" TEXT,
    "status" TEXT DEFAULT 'Waiting',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wellness_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "sleep_score" INTEGER,
    "stress_level" INTEGER,
    "soreness_level" INTEGER,
    "fatigue_level" INTEGER,
    "soreness_data" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wellness_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workoutdays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "organization_id" UUID,
    "title" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workoutdays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workoutitems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workout_day_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workoutitems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_groups_organization_id_name_key" ON "client_groups"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clientorganizations_organization_id_name_key" ON "clientorganizations"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_uhid_key" ON "clients"("uhid");

-- CreateIndex
CREATE UNIQUE INDEX "consultantavailability_consultant_id_day_of_week_key" ON "consultantavailability"("consultant_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_organization_id_name_key" ON "exercises"("organization_id", "name");

-- CreateIndex
CREATE INDEX "idx_ext_training_client_date" ON "external_training_summary"("client_id", "training_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "group_attendance_session_id_client_id_key" ON "group_attendance"("session_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_profile_id_key" ON "hr_employees"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "injury_master_data_global_unique_idx" ON "injury_master_data"("region", "injury_type", "diagnosis") WHERE (organization_id IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "injury_master_data_org_unique_idx" ON "injury_master_data"("organization_id", "region", "injury_type", "diagnosis") WHERE (organization_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "packages_organization_id_name_key" ON "packages"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "physiosessiondetails_session_id_key" ON "physiosessiondetails"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "referralsources_organization_id_name_key" ON "referralsources"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_schedules_consultant_id_key" ON "staff_schedules"("consultant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uhidsequences_organization_id_year_month_key" ON "uhidsequences"("organization_id", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "athlete_item_logs" ADD CONSTRAINT "athlete_item_logs_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "athlete_item_logs" ADD CONSTRAINT "athlete_item_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "athlete_item_logs" ADD CONSTRAINT "athlete_item_logs_workout_item_id_fkey" FOREIGN KEY ("workout_item_id") REFERENCES "workoutitems"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "athlete_workout_completions" ADD CONSTRAINT "athlete_workout_completions_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "athlete_workout_completions" ADD CONSTRAINT "athlete_workout_completions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "athlete_workout_completions" ADD CONSTRAINT "athlete_workout_completions_workout_day_id_fkey" FOREIGN KEY ("workout_day_id") REFERENCES "workoutdays"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "authsessions" ADD CONSTRAINT "authsessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "availabilityexceptions" ADD CONSTRAINT "availabilityexceptions_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "availabilityexceptions" ADD CONSTRAINT "availabilityexceptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billitems" ADD CONSTRAINT "billitems_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billitems" ADD CONSTRAINT "billitems_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billpayments" ADD CONSTRAINT "billpayments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billpayments" ADD CONSTRAINT "billpayments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billpayments" ADD CONSTRAINT "billpayments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_billed_by_id_fkey" FOREIGN KEY ("billed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bulk_assignments" ADD CONSTRAINT "bulk_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bulk_assignments" ADD CONSTRAINT "bulk_assignments_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_assessment_reports" ADD CONSTRAINT "client_assessment_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_assessment_reports" ADD CONSTRAINT "client_assessment_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_assessment_reports" ADD CONSTRAINT "client_assessment_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_group_members" ADD CONSTRAINT "client_group_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_group_members" ADD CONSTRAINT "client_group_members_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_group_members" ADD CONSTRAINT "client_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "client_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "client_groups" ADD CONSTRAINT "client_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientadminnotes" ADD CONSTRAINT "clientadminnotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientadminnotes" ADD CONSTRAINT "clientadminnotes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientdocuments" ADD CONSTRAINT "clientdocuments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientdocuments" ADD CONSTRAINT "clientdocuments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientdocuments" ADD CONSTRAINT "clientdocuments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cliententitlements" ADD CONSTRAINT "cliententitlements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cliententitlements" ADD CONSTRAINT "cliententitlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cliententitlements" ADD CONSTRAINT "cliententitlements_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cliententitlements" ADD CONSTRAINT "cliententitlements_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientorganizations" ADD CONSTRAINT "clientorganizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_consultant_id_fkey" FOREIGN KEY ("assigned_consultant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_primary_scientist_id_fkey" FOREIGN KEY ("primary_scientist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultant_services" ADD CONSTRAINT "consultant_services_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultant_services" ADD CONSTRAINT "consultant_services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultant_services" ADD CONSTRAINT "consultant_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultantavailability" ADD CONSTRAINT "consultantavailability_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultantavailability" ADD CONSTRAINT "consultantavailability_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_linked_client_id_fkey" FOREIGN KEY ("linked_client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enquiryinteractions" ADD CONSTRAINT "enquiryinteractions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enquiryinteractions" ADD CONSTRAINT "enquiryinteractions_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "excel_diagnostic_reports" ADD CONSTRAINT "excel_diagnostic_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "excel_diagnostic_reports" ADD CONSTRAINT "excel_diagnostic_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_training_summary" ADD CONSTRAINT "external_training_summary_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_training_summary" ADD CONSTRAINT "external_training_summary_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_bulk_assignment_id_fkey" FOREIGN KEY ("bulk_assignment_id") REFERENCES "bulk_assignments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_attendance" ADD CONSTRAINT "group_attendance_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "group_attendance" ADD CONSTRAINT "group_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "hr_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_jobs" ADD CONSTRAINT "hr_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrattendancelogs" ADD CONSTRAINT "hrattendancelogs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrattendancelogs" ADD CONSTRAINT "hrattendancelogs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrleaves" ADD CONSTRAINT "hrleaves_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrleaves" ADD CONSTRAINT "hrleaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hrleaves" ADD CONSTRAINT "hrleaves_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "injury_master_data" ADD CONSTRAINT "injury_master_data_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liftitems" ADD CONSTRAINT "liftitems_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "liftitems" ADD CONSTRAINT "liftitems_workout_item_id_fkey" FOREIGN KEY ("workout_item_id") REFERENCES "workoutitems"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "max_pr_records" ADD CONSTRAINT "max_pr_records_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "max_pr_records" ADD CONSTRAINT "max_pr_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_notification_settings" ADD CONSTRAINT "organization_notification_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "packageservices" ADD CONSTRAINT "packageservices_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "packageservices" ADD CONSTRAINT "packageservices_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "physiosessiondetails" ADD CONSTRAINT "physiosessiondetails_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "trainingprograms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referralsources" ADD CONSTRAINT "referralsources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rehab_progress" ADD CONSTRAINT "rehab_progress_injury_id_fkey" FOREIGN KEY ("injury_id") REFERENCES "injuries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rehab_progress" ADD CONSTRAINT "rehab_progress_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scientific_resources" ADD CONSTRAINT "scientific_resources_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scientific_resources" ADD CONSTRAINT "scientific_resources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scientific_resources" ADD CONSTRAINT "scientific_resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_scientist_id_fkey" FOREIGN KEY ("scientist_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_templates" ADD CONSTRAINT "session_templates_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "cliententitlements"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_scientist_id_fkey" FOREIGN KEY ("scientist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_session_type_id_fkey" FOREIGN KEY ("session_type_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscription_logs" ADD CONSTRAINT "subscription_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trainingprograms" ADD CONSTRAINT "trainingprograms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trainingprograms" ADD CONSTRAINT "trainingprograms_scientist_id_fkey" FOREIGN KEY ("scientist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "uhidsequences" ADD CONSTRAINT "uhidsequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wellness_logs" ADD CONSTRAINT "wellness_logs_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wellness_logs" ADD CONSTRAINT "wellness_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workoutdays" ADD CONSTRAINT "workoutdays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workoutdays" ADD CONSTRAINT "workoutdays_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "trainingprograms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workoutitems" ADD CONSTRAINT "workoutitems_workout_day_id_fkey" FOREIGN KEY ("workout_day_id") REFERENCES "workoutdays"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
