const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
        return;
    }

    console.log("Profile keys:", Object.keys(profile));
}

check();
