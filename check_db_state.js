
import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSystem() {
    let output = "";
    const log = (msg) => {
        console.log(msg);
        output += msg + "\n";
    };

    log("--- Checking Constraints for session_facts ---");
    const { data: constraints, error: cError } = await supabase.rpc('fn_execute_query', {
        query: `
            SELECT
                tc.constraint_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name='session_facts' AND tc.table_schema='public';
        `
    });

    if (cError) log("Constraint Error: " + JSON.stringify(cError));
    else log(JSON.stringify(constraints, null, 2));

    log("\n--- Checking Sample Sessions Content ---");
    const { data: sessions, error: sError } = await supabase
        .from('sessions')
        .select('id, client_id, status')
        .limit(5);

    if (sError) log("Session Fetch Error: " + JSON.stringify(sError));
    else log("Sessions Samples: " + JSON.stringify(sessions, null, 2));

    if (sessions && sessions.length > 0) {
        const firstClientId = sessions[0].client_id;
        log(`\n--- Checking if Client ID ${firstClientId} exists in clients table ---`);
        const { data: client, error: clError } = await supabase
            .from('clients')
            .select('id')
            .eq('id', firstClientId)
            .maybeSingle();
        
        if (clError) log("Client Check Error: " + JSON.stringify(clError));
        else log("Client found in clients table: " + !!client);

        log(`\n--- Checking if Client ID ${firstClientId} exists in profiles table ---`);
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', firstClientId)
            .maybeSingle();
        log("Client found in profiles table: " + !!profile);
    }
    
    fs.writeFileSync('db_check_result.txt', output);
}

checkSystem();
