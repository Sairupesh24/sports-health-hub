import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
    const data = await response.json();

    console.log("CLIENTS table props:", Object.keys(data.definitions.clients?.properties || {}));
    console.log("INJURIES table client_id description:", data.definitions.injuries?.properties?.client_id?.description);
    console.log("SESSIONS table client_id description:", data.definitions.sessions?.properties?.client_id?.description);
}

check().catch(console.error);
