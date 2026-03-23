
import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc(name) {
    console.log(`Testing RPC: ${name}...`);
    const { data, error } = await supabase.rpc(name, { query: 'SELECT 1' });
    if (error) {
        if (error.code === 'PGRST202') {
            console.log(`RPC ${name} NOT FOUND.`);
        } else {
            console.log(`RPC ${name} found but error:`, error.message);
            return true;
        }
    } else {
        console.log(`RPC ${name} FOUND AND WORKED!`);
        return true;
    }
    return false;
}

async function run() {
    const list = ['exec_sql', 'exec_query', 'execute_sql', 'run_sql', 'query', 'sql'];
    for (const name of list) {
        if (await testRpc(name)) break;
    }
}

run();
