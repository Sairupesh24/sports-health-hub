// Diagnose exactly why auth user creation fails
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

const PG_URL = 'postgresql://postgres.fbjlgepxbyoyradaacvd:ISHPOSecure2024!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function diagnose() {
  // 1. Check if trigger exists via direct pg
  console.log('=== TRIGGER DIAGNOSTIC ===');
  const pg = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pg.connect();
    console.log('✅ Postgres connected');

    // Check for existing triggers on auth.users
    const { rows: triggers } = await pg.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth' AND event_object_table = 'users'
    `);
    console.log('Auth.users triggers:', JSON.stringify(triggers, null, 2));

    // Check handle_new_user function 
    const { rows: funcs } = await pg.query(`
      SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user'
    `);
    if (funcs.length > 0) {
      console.log('handle_new_user EXISTS. Body:\n', funcs[0].prosrc.substring(0, 400));
    } else {
      console.log('handle_new_user does NOT exist!');
    }

    // Check for unique constraints on profiles
    const { rows: constraints } = await pg.query(`
      SELECT conname, contype, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
    `);
    console.log('\nProfiles constraints:', JSON.stringify(constraints, null, 2));

    await pg.end();
  } catch (err) {
    console.error('PG error:', err.message);
    try { await pg.end(); } catch (e) {}
  }

  // 2. Try to create a simple test auth user
  console.log('\n=== TEST USER CREATION ===');
  const testEmail = `test_diag_${Date.now()}@ishpo.com`;
  const { data, error } = await sb.auth.admin.createUser({
    email: testEmail,
    password: 'password123',
    email_confirm: true,
  });
  if (error) {
    console.log(`❌ Creation of ${testEmail} failed:`, error.message);
  } else {
    console.log(`✅ Test user created: ${data.user.id}`);
    // Clean up
    await sb.auth.admin.deleteUser(data.user.id);
    console.log('Test user deleted.');
  }
}

diagnose().catch(console.error);
