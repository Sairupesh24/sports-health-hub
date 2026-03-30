const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let output = "Starting Diagnostic v8...\n";
    try {
        const { data: assignments, error } = await supabase
            .from('program_assignments')
            .select(`
                id, 
                start_date,
                athlete_id,
                program:training_programs(
                    id,
                    name
                )
            `)
            .eq('athlete_id', 'b961162a-99ac-41cc-9939-adba92a54af3');
        
        if (error) throw error;

        output += `Found ${assignments?.length || 0} assignments for b961162a:\n`;
        
        for (const a of (assignments || [])) {
            output += `Assignment ID: ${a.id}, Start: ${a.start_date}, Program: ${a.program?.name}\n`;
            
            if (a.program?.id) {
                const { data: days } = await supabase
                    .from('workout_days')
                    .select('*')
                    .eq('training_program_id', a.program.id);
                
                output += `  - Workout Days Count: ${days?.length || 0}\n`;
                days?.forEach(d => {
                    output += `    * Day: ${d.title || 'Untitled'}, Order: ${d.display_order}, DayNum: ${d.day_number}\n`;
                });
            }
        }

        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results_v8.txt', output);
        console.log("Results written to tmp/diagnostic_results_v8.txt");

    } catch (e) {
        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results_v8.txt', "Error: " + e.message);
        console.error("Diagnostic Error:", e.message);
    }
}

check();
