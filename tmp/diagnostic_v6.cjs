const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let output = "Starting Diagnostic v6...\n";
    try {
        const { data: assignments, error: err1 } = await supabase
            .from('program_assignments')
            .select('*, athlete:profiles!athlete_id(first_name, last_name, id), program:training_programs(name)');
        
        if (err1) throw err1;

        output += `Found ${assignments.length} assignments:\n`;
        assignments.forEach(a => {
            const athleteName = a.athlete ? `${a.athlete.first_name} ${a.athlete.last_name}` : "null";
            const athleteId = a.athlete ? a.athlete.id : "null";
            output += `- ID: ${a.id}, Start: ${a.start_date}, Athlete: ${athleteName} (ID: ${athleteId}), Program: ${a.program?.name}, Status: ${a.status}, Batch: ${a.batch_id}\n`;
        });

        const { data: profiles, error: err2 } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .ilike('last_name', '%Kavuturi%');
        
        if (err2) throw err2;
        output += `\nFound ${profiles.length} profiles matching Kavuturi:\n`;
        profiles.forEach(p => output += `- ${p.first_name} ${p.last_name}: ${p.id}\n`);

        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results.txt', output);
        console.log("Results written to tmp/diagnostic_results.txt");

    } catch (e) {
        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results.txt', "Error: " + e.message);
        console.error("Diagnostic Error:", e.message);
    }
}

check();
