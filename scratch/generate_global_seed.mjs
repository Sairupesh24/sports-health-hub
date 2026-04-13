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
const serviceRoleKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function exportToSeedFile() {
    console.log('Fetching injury_master_data...');
    const { data, error } = await supabase
        .from('injury_master_data')
        .select('region, injury_type, diagnosis')
        .limit(5000);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data found.');
        return;
    }

    // Deduplicate data before generating SQL
    const uniqueMap = new Map();
    data.forEach(row => {
        const cleanRegion = row.region.replace(/\u00A0/g, ' ').trim();
        const cleanType = row.injury_type.replace(/\u00A0/g, ' ').trim();
        const cleanDiagnosis = row.diagnosis.replace(/\u00A0/g, ' ').trim();
        
        const key = `${cleanRegion}|${cleanType}|${cleanDiagnosis}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, { 
                region: cleanRegion.replace(/'/g, "''"), 
                type: cleanType.replace(/'/g, "''"), 
                diagnosis: cleanDiagnosis.replace(/'/g, "''") 
            });
        }
    });

    const uniqueData = Array.from(uniqueMap.values());
    console.log(`Found ${uniqueData.length} unique rows.`);

    let sql = '-- Global Injury Master Data Seed\n';
    sql += '-- 1. Delete existing data (as requested)\n';
    sql += 'DELETE FROM public.injury_master_data;\n\n';
    sql += 'INSERT INTO public.injury_master_data (organization_id, region, injury_type, diagnosis)\n';
    sql += 'VALUES\n';

    const values = uniqueData.map((row, index) => {
        const line = `    (NULL, '${row.region}', '${row.type}', '${row.diagnosis}')`;
        return line + (index === uniqueData.length - 1 ? '' : ',');
    });

    sql += values.join('\n');
    sql += '\nON CONFLICT (region, injury_type, diagnosis) WHERE organization_id IS NULL DO NOTHING;\n';
    sql += '\n-- Finished seeding ' + uniqueData.length + ' global records (deduplicated from ' + data.length + ').';

    const outputPath = path.resolve(process.cwd(), 'supabase', 'seed_global_injuries.sql');
    fs.writeFileSync(outputPath, sql);
    console.log('Successfully wrote ' + data.length + ' records to ' + outputPath);
}

exportToSeedFile();
