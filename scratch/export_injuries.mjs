import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function exportInjuryData() {
    console.log('-- Exporting injury_master_data from dev database');
    
    const { data, error } = await supabase
        .from('injury_master_data')
        .select('region, injury_type, diagnosis');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('-- No data found in injury_master_data');
        return;
    }

    console.log('-- Total records found:', data.length);
    console.log('INSERT INTO public.injury_master_data (organization_id, region, injury_type, diagnosis)');
    console.log('VALUES');

    const values = data.map((row, index) => {
        const line = `    (v_org_id, '${row.region.replace(/'/g, "''")}', '${row.injury_type.replace(/'/g, "''")}', '${row.diagnosis.replace(/'/g, "''")}')`;
        return line + (index === data.length - 1 ? ';' : ',');
    });

    values.forEach(v => console.log(v));
    console.log('ON CONFLICT (organization_id, region, injury_type, diagnosis) DO NOTHING;');
}

exportInjuryData();
