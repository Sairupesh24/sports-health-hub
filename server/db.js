import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use DATABASE_URL if provided, otherwise fall back to individual Docker defaults
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5434', 10),
      user: process.env.PGUSER || 'skavuturi',
      password: process.env.PGPASSWORD || 'Ksr24rupesh',
      database: process.env.PGDATABASE || 'ishpo',
    });

// We wrap queries in a helper so we can keep the rest of the app's 'db.query' signature similar to SQLite if possible, or we just export the pool.
export const db = pool;

async function runMigrations() {
  try {
    // Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        org_code TEXT,
        slug TEXT,
        subscription_plan TEXT DEFAULT 'pro',
        status TEXT DEFAULT 'active',
        uhid_prefix TEXT,
        logo_url TEXT,
        official_name TEXT,
        official_address TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        clinic_latitude NUMERIC,
        clinic_longitude NUMERIC,
        geofence_radius NUMERIC,
        enable_geofencing BOOLEAN DEFAULT FALSE,
        enable_ip_locking BOOLEAN DEFAULT FALSE,
        allowed_ips TEXT,
        allow_custom_duration BOOLEAN DEFAULT FALSE,
        default_slot_duration INTEGER DEFAULT 60
      )
    `);

    // Safely add missing columns to organizations for existing installations
    const orgColumns = ['slug', 'subscription_plan', 'status'];
    for (const col of orgColumns) {
      try {
        await pool.query(`ALTER TABLE organizations ADD COLUMN ${col} TEXT;`);
        if (col === 'status') {
          await pool.query(`UPDATE organizations SET status = 'active' WHERE status IS NULL;`);
        }
        if (col === 'subscription_plan') {
          await pool.query(`UPDATE organizations SET subscription_plan = 'pro' WHERE subscription_plan IS NULL;`);
        }
      } catch (e) {
        // Column probably exists
      }
    }
    
    // Additional safe migrations for other types
    try {
      await pool.query(`ALTER TABLE organizations ADD COLUMN allow_custom_duration BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE organizations ADD COLUMN default_slot_duration INTEGER DEFAULT 60;`);
    } catch (e) {}

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add password_hash to existing users table if it doesn't exist
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
    } catch (e) {
      // Ignore error if column already exists
    }

    // Create profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        is_approved BOOLEAN DEFAULT FALSE,
        uhid TEXT,
        ams_role TEXT,
        profession TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to profiles
    try {
      await pool.query(`ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE profiles ADD COLUMN avatar_url TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE profiles ADD COLUMN mobile_no TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE profiles ADD COLUMN has_calendar_access BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}


    // Create authsessions table for OTP
    await pool.query(`
      CREATE TABLE IF NOT EXISTS authsessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        otp_code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // --- Client Management Tables ---

    // locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id),
        uhid TEXT NOT NULL UNIQUE,
        registered_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        honorific TEXT,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        gender TEXT,
        mobile_no TEXT NOT NULL,
        aadhaar_no TEXT,
        blood_group TEXT,
        dob DATE,
        age INT,
        email TEXT,
        alternate_mobile_no TEXT,
        occupation TEXT,
        sport TEXT,
        athlete_type TEXT,
        org_name TEXT,
        address TEXT,
        locality TEXT,
        pincode TEXT,
        city TEXT,
        district TEXT,
        state TEXT,
        country TEXT DEFAULT 'India',
        has_insurance BOOLEAN DEFAULT false,
        insurance_provider TEXT,
        insurance_policy_no TEXT,
        insurance_validity DATE,
        insurance_coverage_amount NUMERIC,
        is_vip BOOLEAN DEFAULT false,
        referral_source TEXT,
        referral_source_detail TEXT,
        assigned_consultant_id UUID REFERENCES users(id),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // enquiries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT,
        mobile_no TEXT NOT NULL,
        email TEXT,
        looking_for TEXT,
        preferred_call_time TEXT,
        referral_source TEXT,
        referral_details TEXT,
        work_place TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        linked_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        next_follow_up_at TIMESTAMPTZ,
        last_interaction_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enquiry Interactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enquiryinteractions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        enquiry_id UUID NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
        interaction_type TEXT NOT NULL,
        response_text TEXT,
        follow_up_required BOOLEAN DEFAULT false,
        follow_up_at TIMESTAMPTZ,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns for enquiries and interactions
    const enqCols = [
        ['enquiries', 'next_follow_up_at', 'TIMESTAMPTZ'],
        ['enquiries', 'last_interaction_at', 'TIMESTAMPTZ'],
        ['enquiryinteractions', 'follow_up_required', 'BOOLEAN DEFAULT false'],
        ['enquiryinteractions', 'follow_up_at', 'TIMESTAMPTZ']
    ];
    for (const [table, col, type] of enqCols) {
        try {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // Client Admin Notes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientadminnotes (
        client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        remarks TEXT NOT NULL,
        updated_by UUID REFERENCES users(id),
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Client Documents
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientdocuments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        document_name TEXT NOT NULL,
        category TEXT,
        document_type TEXT,
        file_path TEXT NOT NULL,
        uploaded_by UUID REFERENCES users(id),
        uploaded_by_role TEXT,
        notes TEXT,
        access_level TEXT DEFAULT 'Medical_Staff_Only',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to clientdocuments
    const docCols = ['category', 'uploaded_by_role', 'notes', 'access_level'];
    for (const col of docCols) {
        try {
            await pool.query(`ALTER TABLE clientdocuments ADD COLUMN ${col} TEXT;`);
        } catch (e) {}
    }

    // Safely add profile_id to clients
    try {
        await pool.query(`ALTER TABLE clients ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;`);
    } catch (e) {}

    // Safely add primary_scientist_id to clients
    try {
        await pool.query(`ALTER TABLE clients ADD COLUMN primary_scientist_id UUID REFERENCES profiles(id) ON DELETE SET NULL;`);
    } catch (e) {}

    // Safely add deleted_at to clients
    try {
        await pool.query(`ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMPTZ;`);
    } catch (e) {}

    // Safely add athlete_id to scientific_resources
    try {
        await pool.query(`ALTER TABLE scientific_resources ADD COLUMN athlete_id UUID REFERENCES clients(id) ON DELETE SET NULL;`);
    } catch (e) {}

    // UHID sequence tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uhidsequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        year_month TEXT NOT NULL,
        last_serial INT NOT NULL DEFAULT 0,
        UNIQUE(organization_id, year_month)
      )
    `);

    // Client organizations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Clientorganizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, name)
      )
    `);

    // Referral Sources
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referralsources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, name)
      )
    `);

    // services (Session Types)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add dynamic fields for Unified Session Types
    try {
      await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS min_duration INTEGER DEFAULT 30;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS max_duration INTEGER DEFAULT 120;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT TRUE;`);
    } catch (e) {}

    // Backwards compatibility for 'sessiontypes' name
    try {
        await pool.query('DROP VIEW IF EXISTS sessiontypes CASCADE');
        await pool.query('CREATE VIEW sessiontypes AS SELECT * FROM services');
    } catch (e) {}

    // packages (Header)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL DEFAULT 0,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, name)
      )
    `);

    // Backwards compatibility for 'servicepackages' name
    try {
        await pool.query('DROP TABLE IF EXISTS servicepackages CASCADE');
        await pool.query('CREATE VIEW servicepackages AS SELECT * FROM packages');
    } catch (e) {}

    // Package services (Mapping sessions to packages)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS packageservices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        sessions_included INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Repair broken constraints from previous migrations
    try {
        await pool.query('ALTER TABLE packageservices DROP CONSTRAINT IF EXISTS packageservices_package_id_fkey');
        await pool.query('ALTER TABLE packageservices ADD CONSTRAINT packageservices_package_id_fkey FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE');
    } catch (e) {}

    try {
        await pool.query('ALTER TABLE cliententitlements DROP CONSTRAINT IF EXISTS cliententitlements_package_id_fkey');
        await pool.query('ALTER TABLE cliententitlements ADD CONSTRAINT cliententitlements_package_id_fkey FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL');
    } catch (e) {}

    // Client Entitlements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cliententitlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        invoice_id UUID,
        package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        service_type TEXT NOT NULL,
        granted_sessions INTEGER NOT NULL,
        sessions_used INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        bill_item_id UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to cliententitlements
    const entCols = [
        ['service_id', 'UUID'],
        ['bill_item_id', 'UUID'],
        ['notes', 'TEXT']
    ];
    for (const [col, type] of entCols) {
        try {
            await pool.query(`ALTER TABLE cliententitlements ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // Sessions (Unified Appointments)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        therapist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        scientist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        entitlement_id UUID REFERENCES cliententitlements(id) ON DELETE SET NULL,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        service_type TEXT NOT NULL,
        session_mode TEXT DEFAULT 'Individual',
        scheduled_start TIMESTAMPTZ NOT NULL,
        scheduled_end TIMESTAMPTZ NOT NULL,
        actual_start TIMESTAMPTZ,
        actual_end TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'Planned',
        cancellation_reason TEXT,
        is_unentitled BOOLEAN DEFAULT false,
        preference_type TEXT DEFAULT 'Strict',
        is_flexible_routing BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to Sessions
    const sessionCols = [
        ['scientist_id', 'UUID'],
        ['service_id', 'UUID'],
        ['preference_type', "TEXT DEFAULT 'Strict'"],
        ['is_flexible_routing', 'BOOLEAN DEFAULT false'],
        ['group_name', 'TEXT'],
        ['session_location', 'TEXT'],
        ['session_notes', 'TEXT'],
        ['attachments', "JSONB DEFAULT '[]'::jsonb"],
        ['session_type_id', 'UUID REFERENCES services(id) ON DELETE SET NULL']
    ];
    for (const [col, type] of sessionCols) {
        try {
            await pool.query(`ALTER TABLE Sessions ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    try {
        await pool.query(`ALTER TABLE Sessions ALTER COLUMN client_id DROP NOT NULL;`);
    } catch (e) {}

    // Clinical - Injuries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Injuries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        diagnosis TEXT NOT NULL,
        injury_type TEXT NOT NULL,
        region TEXT NOT NULL,
        injury_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Rehab', 'RTP', 'Resolved'
        side TEXT, -- 'Left', 'Right', 'Bilateral'
        onset TEXT, -- 'Acute', 'Gradual'
        mechanism TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clinical - Rehab Progress
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rehab_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        injury_id UUID NOT NULL REFERENCES Injuries(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        notes TEXT,
        metrics JSONB DEFAULT '{}',
        recorded_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Physio Session Details
    await pool.query(`
      CREATE TABLE IF NOT EXISTS physiosessiondetails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID UNIQUE REFERENCES Sessions(id) ON DELETE CASCADE,
        injury_id UUID,
        pain_score INTEGER,
        modality_used TEXT,
        treatment_type TEXT,
        manual_therapy TEXT,
        exercise_given TEXT,
        range_of_motion TEXT,
        strength_progress TEXT,
        clinical_notes TEXT,
        next_plan TEXT,
        soreness_data JSONB,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to physiosessiondetails
    const physioCols = [
        ['soreness_data', 'JSONB'],
        ['injury_id', 'UUID']
    ];
    for (const [col, type] of physioCols) {
        try {
            await pool.query(`ALTER TABLE physiosessiondetails ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // Consultant Availability
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consultantavailability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        consultant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL, -- 0-6
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        slot_duration_interval INTEGER DEFAULT 30,
        buffer_time INTEGER DEFAULT 0,
        UNIQUE(consultant_id, day_of_week)
      )
    `);

    // Consultant Services Mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consultant_services (
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        consultant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        PRIMARY KEY (consultant_id, service_id)
      )
    `);

    // Safely add missing columns to consultantavailability
    const availCols = [
        ['organization_id', 'UUID'],
        ['slot_duration_interval', 'INTEGER DEFAULT 30'],
        ['buffer_time', 'INTEGER DEFAULT 0']
    ];
    for (const [col, type] of availCols) {
        try {
            await pool.query(`ALTER TABLE consultantavailability ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // Availability Exceptions (Leaves/Blocks)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availabilityexceptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        consultant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        exception_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        is_blocked BOOLEAN DEFAULT true,
        reason TEXT
      )
    `);

    // waitlist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        therapist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        service_id UUID REFERENCES services(id) ON DELETE SET NULL,
        preferred_date DATE NOT NULL,
        preferred_time_slot TEXT,
        preference_type TEXT,
        status TEXT DEFAULT 'Waiting',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Past Due', 'Suspended', 'Cancelled')),
        current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
        current_period_end DATE,
        billing_cycle TEXT NOT NULL,
        auto_pay BOOLEAN DEFAULT false,
        next_billing_date DATE,
        grace_period_end DATE,
        cancel_at_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to subscriptions
    const subCols = [
        ['dunning_step', 'INTEGER DEFAULT 0'],
        ['last_dunning_at', 'TIMESTAMPTZ'],
        ['last_billing_date', 'DATE']
    ];
    for (const [col, type] of subCols) {
        try {
            await pool.query(`ALTER TABLE subscriptions ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // subscription_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // bills
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        total NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'unpaid',
        referral_source_id UUID,
        notes TEXT,
        include_notes_in_invoice BOOLEAN DEFAULT false,
        discount_authorized_by TEXT,
        billed_by_id UUID REFERENCES users(id),
        billed_by_name TEXT,
        billing_staff_name TEXT,
        transaction_id TEXT,
        payment_method TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to bills
    const billCols = [
        ['amount', 'NUMERIC DEFAULT 0'],
        ['discount', 'NUMERIC DEFAULT 0'],
        ['referral_source_id', 'UUID'],
        ['include_notes_in_invoice', 'BOOLEAN DEFAULT false'],
        ['discount_authorized_by', 'TEXT'],
        ['billed_by_id', 'UUID'],
        ['billed_by_name', 'TEXT'],
        ['billing_staff_name', 'TEXT'],
        ['updated_at', 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP'],
        ['subscription_id', 'UUID REFERENCES subscriptions(id) ON DELETE SET NULL'],
        ['due_date', 'DATE']
    ];
    for (const [col, type] of billCols) {
        try {
            await pool.query(`ALTER TABLE bills ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // Bill Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billitems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        package_id UUID,
        amount NUMERIC NOT NULL DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        total NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bill Payments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS billpayments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        payment_method TEXT,
        transaction_id TEXT,
        recorded_by UUID,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to billpayments
    const payCols = [
        ['organization_id', 'UUID'],
        ['client_id', 'UUID'],
        ['transaction_id', 'TEXT'],
        ['recorded_by', 'UUID']
    ];
    for (const [col, type] of payCols) {
        try {
            await pool.query(`ALTER TABLE billpayments ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // refunds
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        refund_mode TEXT,
        transaction_id TEXT,
        refund_proof_url TEXT,
        reason TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        is_override BOOLEAN DEFAULT false,
        authorized_by TEXT,
        is_entitlement_reversed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to refunds
    const refundCols = [
        ['refund_mode', 'TEXT'],
        ['transaction_id', 'TEXT'],
        ['refund_proof_url', 'TEXT'],
        ['notes', 'TEXT'],
        ['is_override', 'BOOLEAN DEFAULT false'],
        ['authorized_by', 'TEXT'],
        ['is_entitlement_reversed', 'BOOLEAN DEFAULT false']
    ];
    for (const [col, type] of refundCols) {
        try {
            await pool.query(`ALTER TABLE refunds ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // HR Attendance Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hrattendancelogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        latitude NUMERIC,
        longitude NUMERIC,
        distance_from_center NUMERIC,
        is_within_geofence BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to hrattendancelogs
    const hrLogCols = [
        ['profile_id', 'UUID'],
        ['type', 'TEXT'],
        ['latitude', 'NUMERIC'],
        ['longitude', 'NUMERIC'],
        ['distance_from_center', 'NUMERIC'],
        ['is_within_geofence', 'BOOLEAN DEFAULT true'],
        ['metadata', 'JSONB']
    ];
    for (const [col, type] of hrLogCols) {
        try {
            await pool.query(`ALTER TABLE hrattendancelogs ADD COLUMN ${col} ${type};`);
        } catch (e) {}
    }

    // HR Leaves
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hrleaves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        leave_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'Requested',
        approved_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR Jobs (Positions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // HR Employees (Detailed Profile)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
        job_id UUID REFERENCES hr_jobs(id) ON DELETE SET NULL,
        date_of_joining DATE,
        employment_type TEXT,
        bank_name TEXT,
        bank_account_no TEXT,
        ifsc_code TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Emergency Alerts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'unresolved',
        reason TEXT,
        latitude NUMERIC,
        longitude NUMERIC,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        admin_decision TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- AMS Training & Logging ---

    // exercises
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        equipment_type TEXT,
        difficulty_level TEXT,
        muscle_groups TEXT[],
        body_region TEXT,
        equipment_required TEXT,
        instructions TEXT,
        video_url TEXT,
        is_rehabilitation BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, name)
      )
    `);

    // Safely add missing columns to exercises
    try {
      await pool.query(`ALTER TABLE exercises ALTER COLUMN organization_id DROP NOT NULL;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN description TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN equipment_type TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN difficulty_level TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN muscle_groups TEXT[];`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN body_region TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN equipment_required TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN instructions TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN video_url TEXT;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN is_rehabilitation BOOLEAN DEFAULT false;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN is_active BOOLEAN DEFAULT true;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE exercises ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`);
    } catch (e) {}

    // Training Programs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trainingprograms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        scientist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workout Days
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workoutdays (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL REFERENCES trainingprograms(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workout Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workoutitems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workout_day_id UUID NOT NULL REFERENCES workoutdays(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL, -- 'lift', 'saqc', 'circuit'
        display_order INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Lift Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS liftitems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workout_item_id UUID NOT NULL REFERENCES workoutitems(id) ON DELETE CASCADE,
        exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        sets INTEGER NOT NULL DEFAULT 1,
        reps TEXT,
        load_type TEXT DEFAULT 'kg', -- 'kg', 'percentage'
        load_value NUMERIC,
        tempo TEXT,
        rest_time_secs INTEGER,
        additional_info TEXT,
        workout_grouping TEXT
      )
    `);

    // Athlete Workout Completions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athlete_workout_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
        workout_day_id UUID REFERENCES workoutdays(id) ON DELETE SET NULL,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        overall_notes TEXT,
        completion_status TEXT DEFAULT 'completed',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Athlete Item Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athlete_item_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        workout_item_id UUID NOT NULL REFERENCES workoutitems(id) ON DELETE CASCADE,
        athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
        logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        sets_completed JSONB, -- [{load: 100, reps: 10}]
        rpe INTEGER,
        notes TEXT,
        skipped BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Performance Assessments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        athlete_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        test_name TEXT NOT NULL,
        metrics JSONB NOT NULL DEFAULT '{}',
        recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to performance_assessments
    try {
        await pool.query(`ALTER TABLE performance_assessments ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;`);
    } catch (e) {}

    // Max PR Records
    await pool.query(`
      CREATE TABLE IF NOT EXISTS max_pr_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
        exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
        value NUMERIC NOT NULL,
        is_current BOOLEAN DEFAULT true,
        recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Injury Master Data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS injury_master_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        region TEXT NOT NULL,
        injury_type TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely migrate existing injury_master_data table
    try {
        await pool.query(`ALTER TABLE injury_master_data ALTER COLUMN organization_id DROP NOT NULL;`);
    } catch (e) {}
    try {
        await pool.query(`ALTER TABLE injury_master_data DROP CONSTRAINT IF EXISTS injury_master_data_organization_id_region_injury_type_diagn_key;`);
    } catch (e) {}
    try {
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS injury_master_data_global_unique_idx ON injury_master_data (region, injury_type, diagnosis) WHERE organization_id IS NULL;`);
    } catch (e) {}
    try {
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS injury_master_data_org_unique_idx ON injury_master_data (organization_id, region, injury_type, diagnosis) WHERE organization_id IS NOT NULL;`);
    } catch (e) {}

    // Seed global injuries
    try {
        const checkRes = await pool.query('SELECT COUNT(*) FROM injury_master_data WHERE organization_id IS NULL');
        const count = parseInt(checkRes.rows[0].count, 10);
        if (count === 0) {
            console.log('[DB] Seeding global injury master data...');
            const seedPath = path.join(__dirname, '../supabase/seed_global_injuries.sql');
            let sql = await fs.readFile(seedPath, 'utf8');
            sql = sql.replace('DELETE FROM public.injury_master_data;', 'DELETE FROM public.injury_master_data WHERE organization_id IS NULL;');
            await pool.query(sql);
            console.log('[DB] Global injury master data seeded successfully.');
        }
    } catch (err) {
        console.error('[DB] Error seeding global injury master data:', err);
    }

    // Seed global exercises
    try {
        const checkRes = await pool.query('SELECT COUNT(*) FROM exercises WHERE organization_id IS NULL');
        const count = parseInt(checkRes.rows[0].count, 10);
        if (count === 0) {
            console.log('[DB] Seeding global exercise library...');
            const seedPath = path.join(__dirname, '../supabase/seed_exercises.sql');
            let sql = await fs.readFile(seedPath, 'utf8');
            sql = sql.replace(/DO\s+\$\s*BEGIN/i, '');
            sql = sql.replace(/END\s+\$\$;/i, '');
            sql = sql.replace(/RAISE\s+NOTICE\s+['"].*?['"]\s*;/gi, '');
            await pool.query(sql);
            console.log('[DB] Global exercise library seeded successfully.');
        }
    } catch (err) {
        console.error('[DB] Error seeding global exercise library:', err);
    }

    // Questionnaires (Templates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questionnaires (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        classification TEXT DEFAULT 'performance',
        questions JSONB NOT NULL DEFAULT '[]',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Program Assignments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS program_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
        program_id UUID NOT NULL REFERENCES trainingprograms(id) ON DELETE CASCADE,
        batch_id UUID, -- Placeholder if batches exist
        start_date DATE NOT NULL,
        status TEXT DEFAULT 'active',
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bulk Assignments (Questionnaire Distribution)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bulk_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        questionnaire_id UUID NOT NULL,
        specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        total_clients INTEGER NOT NULL DEFAULT 0,
        responded_count INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Wellness Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wellness_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sleep_score INTEGER,
        stress_level INTEGER,
        soreness_level INTEGER,
        fatigue_level INTEGER,
        soreness_data JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Form Responses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS form_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        form_id UUID NOT NULL,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        specialist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        bulk_assignment_id UUID REFERENCES bulk_assignments(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'pending',
        response_data JSONB,
        clinical_interpretation TEXT,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        target_role TEXT,
        target_user_id UUID,
        is_broadcast BOOLEAN DEFAULT false,
        priority TEXT DEFAULT 'normal',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safely add missing columns to notifications
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'in_app';`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_payload JSONB DEFAULT '{}'::jsonb;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_status TEXT DEFAULT 'pending';`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL;`);
    } catch (e) {}

    // PostgreSQL Trigger for notification updates
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_system_notification()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify('system_notifications', row_to_json(NEW)::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_system_notification ON notifications;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_system_notification
      AFTER INSERT ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION notify_system_notification();
    `);

    // Scientific Resources
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scientific_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        athlete_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL, -- 'Video', 'Article', 'Document', 'Guide'
        description TEXT,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        tags TEXT[],
        is_public BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Client Groups
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, name)
      )
    `);

    // Client Group Members
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_group_members (
        group_id UUID NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        added_by UUID REFERENCES users(id),
        added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, client_id)
      )
    `);

    // Group Attendance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES Sessions(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        attendance_status TEXT NOT NULL DEFAULT 'Present', -- 'Present', 'Absent', 'Excused'
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, client_id)
      )
    `);

    // Notification Reads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (notification_id, user_id)
      )
    `);

    // Organization Notification Settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_notification_settings (
        organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
        enable_email_notifications BOOLEAN DEFAULT true,
        enable_in_app_notifications BOOLEAN DEFAULT true,
        notify_signup_approval BOOLEAN DEFAULT true,
        notify_questionnaire_assigned BOOLEAN DEFAULT true,
        notify_questionnaire_completed BOOLEAN DEFAULT true,
        notify_emergency_leave BOOLEAN DEFAULT true,
        notify_outstanding_balance BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Report Templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Generate UHID Function
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_uhid_func(p_organization_id UUID)
      RETURNS TEXT
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
    `);

    // Create staff_schedules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        consultant_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
        shift_start TIME NOT NULL DEFAULT '08:00:00',
        shift_end TIME NOT NULL DEFAULT '17:00:00',
        breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create session_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scientist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        template_name TEXT NOT NULL,
        session_type_id UUID REFERENCES services(id) ON DELETE SET NULL,
        default_duration INTERVAL DEFAULT '1 hour',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Backwards compatibility for SessionTemplates name
    try {
        await pool.query('DROP TABLE IF EXISTS sessiontemplates CASCADE');
        await pool.query('CREATE OR REPLACE VIEW sessiontemplates AS SELECT * FROM session_templates');
    } catch (e) {}

    // Create external_training_summary table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_training_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        external_system TEXT NOT NULL DEFAULT 'TeamBuildr',
        training_date DATE NOT NULL,
        workout_name TEXT,
        duration_minutes INTEGER,
        training_load NUMERIC,
        completion_status TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create performance index for external_training_summary
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ext_training_client_date 
      ON external_training_summary(client_id, training_date DESC);
    `);


    // Create excel_diagnostic_reports table for parsed Excel diagnostic data exports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS excel_diagnostic_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_uhid TEXT,
        patient_name TEXT NOT NULL,
        dob DATE,
        test_history JSONB NOT NULL,
        latest_metrics JSONB NOT NULL,
        clinical_interpretation TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create client_assessment_reports table for saved interactive reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_assessment_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        test_index INTEGER NOT NULL,
        assessment_data JSONB NOT NULL,
        report_texts JSONB NOT NULL,
        pain_data JSONB NOT NULL,
        reassessment_date TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed super admin
    await seedSuperAdmin();
    // Seed default organization
    await seedOrganization();
    // Seed default services for all organizations
    await seedAllOrganizationServices();
    console.log('[DB] Run migrations completed.');
  } catch (err) {
    console.error('[DB] Migration error:', err);
    throw err;
  }
}

async function initializeDatabase() {
  const maxRetries = 10;
  const delayMs = 3000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log(`[DB] Successfully connected to database on attempt ${attempt}. Running migrations...`);
      await runMigrations();
      console.log('[DB] Database initialized successfully.');
      return;
    } catch (err) {
      console.error(`[DB] Database connection/initialization attempt ${attempt} failed:`, err.message);
      if (attempt === maxRetries) {
        console.error('[DB] Max retries reached. Database failed to initialize.');
        break;
      }
      console.log(`[DB] Retrying in ${delayMs / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function seedSuperAdmin() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@ishpo.local';
  
  const res = await pool.query('SELECT id FROM Users WHERE email = $1', [adminEmail]);
  
  if (res.rows.length === 0) {
    const adminId = crypto.randomUUID();
    await pool.query('INSERT INTO Users (id, email, role) VALUES ($1, $2, $3)', [adminId, adminEmail, 'super_admin']);
    console.log(`[DB] Seeded super admin user with email: ${adminEmail}`);
  } else {
    // Ensure role is super_admin
    await pool.query('UPDATE Users SET role = $1 WHERE email = $2', ['super_admin', adminEmail]);
  }
}

async function seedOrganization() {
  const defaultOrgName = 'Main Clinic';
  const defaultOrgCode = '123456';
  
  const res = await pool.query('SELECT id FROM Organizations WHERE org_code = $1', [defaultOrgCode]);
  
  if (res.rows.length === 0) {
    await pool.query('INSERT INTO Organizations (name, org_code) VALUES ($1, $2)', [defaultOrgName, defaultOrgCode]);
    console.log(`[DB] Seeded default organization: ${defaultOrgName} with code: ${defaultOrgCode}`);
  }
}

const DEFAULT_ROLE_SERVICES = {
  'sports scientist': [
    'Performance Assessment', 'Device Testing', 'Testing & Training', 'Training', 'Online session',
    'Physiotherapy', 'Studying/Research', 'Video Production/Video shooting/Video Editing',
    'Site Visit/Business Development', 'Meeting', 'Travelling', 'Athlete/Parent Counselling',
    'Initial Consultation', 'Guest Visits(at Center and Outside)', 'Off-site Testing',
    'Off-site Training', 'Group Session', 'Office Work', 'On-Court/On-Field Observations',
    'Report Making', 'Warmup/ cool down', 'Data work', 'Program Design/Program planning and sharing',
    'Match day/ Observation', 'Doctor consultation'
  ],
  'physiotherapist': [
    'Physiotherapy', 'Device Assessment'
  ],
  'sports physician': [
    'Consultation', 'Device Assessment', 'Physiotherapy'
  ],
  'nutritionist': [
    'Consultation'
  ],
  'massage therapist': [
    'Active recovery training'
  ]
};

export async function seedAllOrganizationServices(executor = pool) {
  try {
    const orgsRes = await executor.query(`SELECT id FROM organizations`);
    const orgIds = orgsRes.rows.map(r => r.id);

    const allServices = new Set();
    for (const names of Object.values(DEFAULT_ROLE_SERVICES)) {
      for (const name of names) {
        allServices.add(name);
      }
    }

    for (const orgId of orgIds) {
      for (const serviceName of allServices) {
        const existsRes = await executor.query(
          `SELECT id FROM services WHERE organization_id = $1 AND name = $2`,
          [orgId, serviceName]
        );
        if (existsRes.rows.length === 0) {
          let category = 'General';
          if (serviceName.includes('Assessment') || serviceName.includes('Testing') || serviceName.includes('Diagnostic') || serviceName.includes('Device')) {
            category = 'Diagnostics';
          } else if (serviceName.includes('Training') || serviceName.includes('S&C') || serviceName.includes('Warmup') || serviceName.includes('recovery')) {
            category = 'Training';
          } else if (serviceName.includes('Physiotherapy') || serviceName.includes('Rehab')) {
            category = 'Physiotherapy';
          } else if (serviceName.includes('Consultation') || serviceName.includes('Counselling') || serviceName.includes('Meeting')) {
            category = 'Consultation';
          }

          await executor.query(
            `INSERT INTO services (organization_id, name, category, is_active, base_price, min_duration, max_duration, is_universal)
             VALUES ($1, $2, $3, true, 0, 30, 120, false)`,
            [orgId, serviceName, category]
          );
        }
      }
    }
    console.log('[DB] Seeding default services completed.');
  } catch (error) {
    console.error('[DB] Error seeding organization services:', error);
  }
}

export async function autoAllocateStaffServices(userId, profession, orgId, clientExecutor = null) {
  const executor = clientExecutor || pool;
  if (!profession || !orgId) return;

  const cleanProf = profession.toLowerCase().trim().replace(/_/g, ' ');
  const serviceNames = DEFAULT_ROLE_SERVICES[cleanProf];
  if (!serviceNames || serviceNames.length === 0) return;

  try {
    const servicesRes = await executor.query(
      `SELECT id, name FROM services WHERE organization_id = $1 AND name = ANY($2)`,
      [orgId, serviceNames]
    );

    const foundServiceIds = servicesRes.rows.map(r => r.id);

    for (const serviceId of foundServiceIds) {
      await executor.query(
        `INSERT INTO consultant_services (organization_id, consultant_id, service_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (consultant_id, service_id) DO NOTHING`,
        [orgId, userId, serviceId]
      );
    }

    await logStaffServiceUpdate(orgId, userId, null, 'auto-allocate', { service_ids: foundServiceIds }, executor);
  } catch (error) {
    console.error(`[DB] Error in autoAllocateStaffServices for user ${userId}:`, error);
  }
}

export async function logStaffServiceUpdate(orgId, staffId, adminUserId, actionType, details, clientExecutor = null) {
  const executor = clientExecutor || pool;
  try {
    const staffRes = await executor.query(`SELECT first_name, last_name FROM profiles WHERE id = $1`, [staffId]);
    const staffName = staffRes.rows.length > 0 
      ? `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}` 
      : 'Unknown Staff';

    const title = 'Staff Service Mapping Updated';
    let content = '';
    if (actionType === 'auto-allocate') {
      content = `Default services auto-allocated for ${staffName} upon role update.`;
    } else {
      content = `Services overridden for ${staffName} by administrator.`;
    }

    await executor.query(`
      INSERT INTO notifications (
        organization_id, title, content, type, is_broadcast, category, action_payload, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      orgId,
      title,
      content,
      'info',
      true,
      'activity_ledger',
      JSON.stringify({ staff_id: staffId, action_type: actionType, details }),
      adminUserId || null
    ]);
  } catch (error) {
    console.error('[DB] Error in logStaffServiceUpdate:', error);
  }
}

// Run initialization
initializeDatabase();

export default pool;
