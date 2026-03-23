const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);
let out = '';
function log(s) { out += s + '\n'; console.log(s); }

async function run() {
  // 1. Find a PLANNED session for the test client
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_id, service_type, service_id, status, is_unentitled, scheduled_start, therapist_id, organization_id')
    .eq('status', 'Planned')
    .order('scheduled_start', { ascending: true })
    .limit(1);

  if (!sessions?.length) { log('No planned sessions found.'); fs.writeFileSync('deep_diag2.txt', out); return; }

  const testSession = sessions[0];
  log('Testing session: ' + testSession.id);
  log('service_type: ' + testSession.service_type);

  // STEP 1: Set actual_start and actual_end FIRST (mirrors what the frontend does)
  log('\n=== Step 1: Setting actual times ===');
  const now = new Date().toISOString();
  const { error: timesErr } = await supabase
    .from('sessions')
    .update({ actual_start: now, actual_end: now })
    .eq('id', testSession.id);
  if (timesErr) { log('Times error: ' + timesErr.message); fs.writeFileSync('deep_diag2.txt', out); return; }
  log('Times set successfully.');

  // STEP 2: Call complete_session RPC
  log('\n=== Step 2: Calling complete_session RPC ===');
  const { error: rpcErr } = await supabase.rpc('complete_session', {
    p_session_id: testSession.id,
    p_user_id: testSession.therapist_id
  });
  if (rpcErr) { log('RPC ERROR: ' + rpcErr.message); }
  else { log('RPC SUCCESS!'); }

  // STEP 3: Verify session state
  log('\n=== Step 3: Session state after ===');
  const { data: sessionAfter } = await supabase
    .from('sessions')
    .select('id, status, service_id, is_unentitled, entitlement_id')
    .eq('id', testSession.id)
    .single();
  log(JSON.stringify(sessionAfter));

  // STEP 4: Verify consumption log
  log('\n=== Step 4: Consumption log ===');
  const { data: logEntries } = await supabase
    .from('session_consumption_log')
    .select('*')
    .eq('session_id', testSession.id);
  log(JSON.stringify(logEntries));

  // STEP 5: Check balance after
  log('\n=== Step 5: Entitlement balance AFTER ===');
  const { data: b2 } = await supabase.rpc('fn_compute_entitlement_balance', { p_client_id: testSession.client_id });
  b2?.forEach(b => log(JSON.stringify(b)));

  fs.writeFileSync('deep_diag2.txt', out);
  log('\nSaved to deep_diag2.txt');
}

run();
