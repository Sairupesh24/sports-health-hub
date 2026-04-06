import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fix() {
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users.find(u => u.email === 'test_clinic_admin@ishpo.com');
  if (!adminUser) return;
  
  const { data: insertRes, error: iErr } = await supabase.from('user_roles').insert([
    { user_id: adminUser.id, role: 'admin' }
  ]);
  console.log("INSERT ROLE RESULT:", insertRes, iErr);
}

fix();
