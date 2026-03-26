const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRpc(name, params = { sql_query: 'SELECT 1' }) {
    console.log(`Checking RPC: ${name}...`);
    const { data, error } = await supabase.rpc(name, params);
    if (error) {
        if (error.code === 'PGRST202') {
            return false;
        } else {
            console.log(`- FOUND ${name}! (But error: ${error.message})`);
            return true;
        }
    } else {
        console.log(`- SUCCESS: ${name} works!`);
        return true;
    }
}

async function run() {
    const list = [
        { name: 'exec_sql', params: { sql_string: 'SELECT 1' } },
        { name: 'exec_sql', params: { sql_query: 'SELECT 1' } },
        { name: 'exec_sql', params: { query: 'SELECT 1' } },
        { name: 'sql_query', params: { sql_query: 'SELECT 1' } },
        { name: 'sql_query', params: { query: 'SELECT 1' } },
        { name: 'execute_sql', params: { sql: 'SELECT 1' } },
        { name: 'run_sql', params: { sql: 'SELECT 1' } },
    ];

    
    for (const item of list) {
        if (await checkRpc(item.name, item.params)) {
            console.log(`\nVerified RPC: ${item.name} with params ${JSON.stringify(item.params)}`);
            break;
        }
    }
}

run();
