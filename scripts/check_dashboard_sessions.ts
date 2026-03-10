import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSessions() {
    const { data, error } = await supabase
        .from('sessions')
        .select('id, scheduled_start, status, client_id, therapist_id');

    if (error) {
        console.error("Error fetching sessions:", error);
    } else {
        console.log(`Found ${data.length} sessions.`);
        data.forEach(s => {
            console.log(`Session: temp... start: ${s.scheduled_start}, status: ${s.status}, therapist: ${s.therapist_id}`);
        });
    }
}

checkSessions();
