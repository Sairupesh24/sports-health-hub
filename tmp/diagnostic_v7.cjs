const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let output = "Starting Diagnostic v7...\n";
    try {
        const { data: assignments } = await supabase
            .from('program_assignments')
            .select(`
                id, 
                start_date,
                program:training_programs(
                    name, 
                    days:workout_days(
                        id,
                        title, 
                        display_order,
                        day_number,
                        items:workout_items(id)
                    )
                )
            `)
            .eq('athlete_id', 'b961162a-99ac-41cc-9939-adba92a54af3');
        
        output += `Found ${assignments?.length || 0} assignments for b961162...:\n`;
        assignments.forEach(a => {
            output += `Assignment ID: ${a.id}, Start: ${a.start_date}, Program: ${a.program?.name}\n`;
            a.program?.days?.forEach(d => {
                output += `  - Day: ${d.title}, Order: ${d.display_order}, DayNum: ${d.day_number}, Items: ${d.items?.length || 0}\n`;
            });
        });

        fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/tmp/diagnostic_results_v7.txt', output);
        console.log("Results written to tmp/diagnostic_results_v7.txt");

    } catch (e) {
        console.error("Diagnostic Error:", e.message);
    }
}

check();
