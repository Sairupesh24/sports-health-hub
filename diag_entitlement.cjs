const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);
let out = '';

function log(str) {
  out += str + '\n';
}

async function diagnose() {
  const today = '2026-03-13';
  
  log('\n=== 1. Sessions for today ===');
  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id, client_id, service_type, service_id, status, is_unentitled, scheduled_start')
    .gte('scheduled_start', today + 'T00:00:00')
    .lte('scheduled_start', today + 'T23:59:59')
    .order('scheduled_start');

  if (sessErr) { log('Sessions error: ' + sessErr.message); fs.writeFileSync('diag_out.txt', out); return; }
  sessions?.forEach(s => {
    log(JSON.stringify({
      id: s.id,
      client_id: s.client_id,
      service_type: s.service_type,
      service_id: s.service_id,
      status: s.status,
      is_unentitled: s.is_unentitled,
      time: s.scheduled_start?.substring(11, 16)
    }));
  });

  log('\n=== 2. All services in DB ===');
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('id, name, organization_id');
  if (svcErr) log('Services error: ' + svcErr.message);
  else services?.forEach(s => log(JSON.stringify({ id: s.id, name: s.name })));

  // Find completed unentitled session
  const unent = sessions?.find(s => s.is_unentitled === true);
  if (unent) {
    log('\n=== 3. Entitlement balance for the un-entitled session client ===');
    const { data: balance, error: balErr } = await supabase
      .rpc('fn_compute_entitlement_balance', { p_client_id: unent.client_id });
    if (balErr) log('Balance error: ' + balErr.message);
    else balance?.forEach(b => log(JSON.stringify(b)));

    log('\n=== 4. Client entitlements raw ===');
    const { data: ent, error: entErr } = await supabase
      .from('client_service_entitlements')
      .select('id, service_id, sessions_allowed, purchase_id')
      .eq('client_id', unent.client_id);
    if (entErr) log('Entitlements error: ' + entErr.message);
    else ent?.forEach(e => log(JSON.stringify(e)));
  }

  fs.writeFileSync('diag_out.txt', out);
  console.log('Output written to diag_out.txt');
}

diagnose();
