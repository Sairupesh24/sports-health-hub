const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');
const emails = ['test_clinic_admin@ishpo.com','doctor3445@ishpo.com','client3445@ishpo.com','foe3445@ishpo.com'];
(async()=>{
  const { data: { users } } = await sb.auth.admin.listUsers();
  const { data: roles } = await sb.from('user_roles').select('user_id,role');
  const { data: profiles } = await sb.from('profiles').select('id,email,is_approved,organization_id');
  const { data: orgs } = await sb.from('organizations').select('id,name').ilike('name','%Test Clinic Fixed%');
  const orgId = orgs?.[0]?.id;
  const roleMap = {}; (roles||[]).forEach(r=>roleMap[r.user_id]=r.role);
  const profMap = {}; (profiles||[]).forEach(p=>profMap[p.id]=p);
  console.log('Test Clinic Fixed org:', orgId);
  emails.forEach(email => {
    const u = users.find(x=>x.email===email);
    if (!u) { console.log('❌ MISSING AUTH USER:', email); return; }
    const p = profMap[u.id]||{};
    console.log('✅',email,'| role='+(roleMap[u.id]||'NONE'),'| approved='+p.is_approved,'| org_match='+(p.organization_id===orgId));
  });
})();
