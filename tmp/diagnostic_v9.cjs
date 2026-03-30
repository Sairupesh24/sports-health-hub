const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let output = "Starting Diagnostic v9...\n";
    try {
        const { data: assignments, error } = await supabase
            .from('program_assignments')
            .select(`
                id, 
                start_date,
                program:training_programs(
                    id,
                    name
                )
            `)
            .eq('athlete_id', 'b961162a-99ac-41cc-9939-adba92a54af3');
        
        if (error) throw error;

        for (const a of (assignments || [])) {
            output += `Assignment: ${a.program?.name}, Start: ${a.start_date}\n`;
            if (a.program?.id) {
                const { data: days } = await supabase
                    .from('workout_days')
                    .select('*')
                    .eq('program_id', a.program.id);
                
                output += `  - Days: ${days?.length || 0}\n`;
                days?.forEach(d => {
                    output += `    * [${d.display_order}] ${d.title}\n`;
                });
            }
        }

        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results_v9.txt', output);
        console.log("Results written to tmp/diagnostic_results_v9.txt");

    } catch (e) {
        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results_v9.txt', "Error: " + e.message);
    }
}

check();
