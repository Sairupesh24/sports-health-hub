require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["consultant", "sports_physician", "physiotherapist", "nutritionist", "sports_scientist", "massage_therapist"]);
        
    console.log("roleData:", roleData);
    if(roleError) console.error(roleError);

    const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, profession, user_roles(role)")
        .limit(10);
    console.log("profiles:", JSON.stringify(prof, null, 2));
}

check();
