const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to load env from .env if it exists
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    // Fallback or read from common locations if needed
    console.error("VITE_SUPABASE_URL not found in env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: assignments, error } = await supabase
        .from('program_assignments')
        .select(`
            *,
            athlete:profiles!athlete_id(first_name, last_name, ams_role),
            program:training_programs(
                id, 
                name, 
                days:workout_days(id, title, display_order, day_number)
            )
        `)
        .eq('status', 'active');

    if (error) {
        console.error("Error fetching assignments:", error);
        return;
    }

    console.log(JSON.stringify(assignments, null, 2));
}

check();
