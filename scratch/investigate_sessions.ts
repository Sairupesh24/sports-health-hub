
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function investigate() {
    const targetId = 'fb2a359a-6914-4a48-907f-5a4475e3172f';
    console.log(`Investigating dependencies for Scientist ID: ${targetId}`);
    
    const tables = ['sessions', 'clinical_notes', 'patient_records', 'patient_appointments'];
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`Table ${table} check failed: ${error.message}`);
                continue;
            }
            if (data && data.length > 0) {
                const columns = Object.keys(data[0]);
                for (const col of columns) {
                    if (col.includes('id') || col.includes('scientist')) {
                        const { data: matches } = await supabase.from(table).select('*').eq(col, targetId);
                        if (matches && matches.length > 0) {
                            console.log(`Found ${matches.length} matches in ${table}.${col}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`Error checking table ${table}`);
        }
    }
}

investigate();
