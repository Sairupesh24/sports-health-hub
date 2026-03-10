import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('profiles').select('id, email, first_name, last_name, role, organization_id');
    if (error) console.error(error);
    console.log(JSON.stringify(data, null, 2));
}
check();
