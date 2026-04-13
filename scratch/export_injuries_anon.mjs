import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envRows = envContent.split('\n');
const env = {};
envRows.forEach(row => {
    const [key, ...rest] = row.split('=');
    if (key && rest.length > 0) {
        env[key.trim()] = rest.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function exportInjuryData() {
    console.log('-- Attempting fetch with Anon Key');
    const { data, error } = await supabase
        .from('injury_master_data')
        .select('region, injury_type, diagnosis');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('-- No data found in injury_master_data (or RLS blocked it)');
        return;
    }

    console.log('-- SQL Query for injury_master_data');
    console.log('-- Total records:', data.length);
    console.log('INSERT INTO public.injury_master_data (organization_id, region, injury_type, diagnosis)');
    console.log('VALUES');

    const values = data.map((row, index) => {
        const line = `    (v_org_id, '${row.region.replace(/'/g, "''")}', '${row.injury_type.replace(/'/g, "''")}', '${row.diagnosis.replace(/'/g, "''")}')`;
        return line + (index === data.length - 1 ? '' : ',');
    });

    values.forEach(v => console.log(v));
    console.log('ON CONFLICT (organization_id, region, injury_type, diagnosis) DO NOTHING;');
}

exportInjuryData();
