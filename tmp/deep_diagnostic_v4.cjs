const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Deep Diagnostic Starting...");

    // 1. Check all assignments
    const { data: assignments } = await supabase
        .from('program_assignments')
        .select('*, athlete:profiles!athlete_id(first_name, last_name)');
    
    console.log("Total Program Assignments:", assignments?.length || 0);
    assignments?.forEach(a => {
        console.log(`- ID: ${a.id}, Start: ${a.start_date}, Athlete: ${a.athlete?.first_name} ${a.athlete?.last_name}, Batch: ${a.batch_id}`);
    });

    // 2. Check all workout days
    const { data: days } = await supabase
        .from('workout_days')
        .select('*, program:training_programs(name)');
    
    console.log("Total Workout Days:", days?.length || 0);
    days?.filter(d => d.program?.name?.includes("Quick")).forEach(d => {
        console.log(`- Day Title: ${d.title}, Program: ${d.program?.name}, Order: ${d.display_order}`);
    });

    // 3. Search for "Kavuturi" in ALL profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .ilike('last_name', '%Kavuturi%');
    
    console.log("Matching Profiles:", profiles?.length || 0);
    profiles?.forEach(p => {
        console.log(`- ${p.first_name} ${p.last_name} ID: ${p.id}`);
    });

    // 4. Specifically look for 2026-03-27 assignments
    const { data: today } = await supabase
        .from('program_assignments')
        .select('*, program:training_programs(name)')
        .eq('start_date', '2026-03-27');
    
    if (today?.length) {
        console.log("Assignments starting today (27th):");
        today.forEach(a => console.log(`- ${a.program?.name} (Assignment ID: ${a.id})`));
    }

    // 5. Check if some other table stores "Quick Assign"
    // e.g. maybe just training_sessions?
    const { data: sessions } = await supabase
        .from('sessions' as any)
        .select('*')
        .limit(5);
    console.log("Recent Sessions Sample:", JSON.stringify(sessions, null, 2));
}

check();
