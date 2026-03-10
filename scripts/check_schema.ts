import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
    const data = await response.json();
    const props = data.definitions.injuries.properties;

    console.log("INJURIES TABLE COLUMNS:");
    for (const [key, val] of Object.entries(props)) {
        console.log(`- ${key}: ${JSON.stringify(val)}`);
    }
}

checkSchema().catch(console.error);
