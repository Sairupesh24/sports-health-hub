const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        console.log("Starting Diagnostic v5...");

        // 1. Get all program_assignments
        const { data: assignments, error: err1 } = await supabase
            .from('program_assignments')
            .select('*, athlete:profiles!athlete_id(first_name, last_name), program:training_programs(name)');
        
        if (err1) throw err1;

        console.log(`Found ${assignments.length} assignments:`);
        assignments.forEach(a => {
            const athleteName = a.athlete ? `${a.athlete.first_name} ${a.athlete.last_name}` : "null";
            console.log(`- ID: ${a.id}, Start: ${a.start_date}, Athlete: ${athleteName}, Program: ${a.program?.name}, Status: ${a.status}`);
        });

        // 2. Search for "Kavuturi" profiles
        const { data: profiles, error: err2 } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .ilike('last_name', '%Kavuturi%');
        
        if (err2) throw err2;
        console.log(`Found ${profiles.length} profiles matching Kavuturi:`);
        profiles.forEach(p => console.log(`- ${p.first_name} ${p.last_name}: ${p.id}`));

    } catch (e) {
        console.error("Diagnostic Error:", e.message);
    }
}

check();
