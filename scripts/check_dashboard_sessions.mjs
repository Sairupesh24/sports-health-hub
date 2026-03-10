import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkSessions() {
    const { data, error } = await supabase
        .from('sessions')
        .select('id, scheduled_start, status, client_id, therapist_id')
        .order('scheduled_start', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching sessions:", error);
    } else {
        console.log(`Found ${data.length} most recent sessions in DB:`);
        data.forEach(s => {
            console.log(`- Start (UTC): ${s.scheduled_start} | Local: ${new Date(s.scheduled_start).toLocaleString()} | Status: ${s.status} | client: ${s.client_id}`);
        });
        console.log("Current System Local Time:", new Date().toString());
        console.log("Current System UTC Time:", new Date().toISOString());
    }
}

checkSessions();
