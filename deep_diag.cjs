const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);
let out = '';
function log(s) { out += s + '\n'; console.log(s); }

async function run() {
  // 1. Find a PLANNED session for the test client (John Doe)
  log('\n=== 1. Planned sessions ===');
  const { data: sessions, error: se } = await supabase
    .from('sessions')
    .select('id, client_id, service_type, service_id, status, is_unentitled, scheduled_start, therapist_id, organization_id')
    .eq('status', 'Planned')
    .order('scheduled_start', { ascending: true })
    .limit(5);

  if (se) { log('Error: ' + se.message); fs.writeFileSync('deep_diag.txt', out); return; }
  sessions?.forEach(s => log(JSON.stringify(s)));

  if (!sessions?.length) { log('No planned sessions found.'); fs.writeFileSync('deep_diag.txt', out); return; }

  const testSession = sessions[0];
  log('\n=== 2. Calling complete_session RPC for session ' + testSession.id + ' ===');
  log('service_type: ' + testSession.service_type);
  log('service_id (before): ' + testSession.service_id);
  log('organization_id: ' + testSession.organization_id);

  // 2. Check if services table has matching service
  log('\n=== 3. Services in org ===');
  const { data: svcList } = await supabase
    .from('services')
    .select('id, name, is_active')
    .eq('organization_id', testSession.organization_id);
  svcList?.forEach(s => log(JSON.stringify(s)));

  // 3. Check if name would match
  const matching = svcList?.find(s => s.name?.toLowerCase().trim() === testSession.service_type?.toLowerCase().trim());
  log('\nWould match: ' + JSON.stringify(matching));

  // 4. Check entitlement balance before
  log('\n=== 4. Entitlement balance BEFORE ===');
  const { data: b1 } = await supabase.rpc('fn_compute_entitlement_balance', { p_client_id: testSession.client_id });
  b1?.forEach(b => log(JSON.stringify(b)));

  // 5. Call the RPC
  log('\n=== 5. Calling complete_session ===');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('complete_session', {
    p_session_id: testSession.id,
    p_user_id: testSession.therapist_id
  });
  if (rpcErr) {
    log('RPC ERROR: ' + rpcErr.message + ' | Code: ' + rpcErr.code);
  } else {
    log('RPC SUCCESS: ' + JSON.stringify(rpcData));
  }

  // 6. Check session state AFTER
  log('\n=== 6. Session state AFTER ===');
  const { data: sessionAfter } = await supabase
    .from('sessions')
    .select('id, status, service_id, is_unentitled, entitlement_id')
    .eq('id', testSession.id)
    .single();
  log(JSON.stringify(sessionAfter));

  // 7. Check consumption log
  log('\n=== 7. Consumption log entries ===');
  const { data: logEntries } = await supabase
    .from('session_consumption_log')
    .select('*')
    .eq('session_id', testSession.id);
  log(JSON.stringify(logEntries));

  // 8. Check balance AFTER
  log('\n=== 8. Entitlement balance AFTER ===');
  const { data: b2 } = await supabase.rpc('fn_compute_entitlement_balance', { p_client_id: testSession.client_id });
  b2?.forEach(b => log(JSON.stringify(b)));

  fs.writeFileSync('deep_diag.txt', out);
  log('\nFull output saved to deep_diag.txt');
}

run();
