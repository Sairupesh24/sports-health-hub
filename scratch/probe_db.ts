
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSchema() {
    console.log("Checking for bill_payments table...");
    const { data: tableExists, error: tableError } = await supabase.rpc('get_table_info', { table_name: 'bill_payments' });
    
    // Fallback: search for columns in bills
    const { data: billsColumns, error: columnsError } = await supabase.rpc('get_column_info', { table_name: 'bills' });
    
    console.log("Bills Columns:", billsColumns);
    
    const { data: sessionColumns } = await supabase.rpc('get_column_info', { table_name: 'sessions' });
    console.log("Session Columns:", sessionColumns);
}

// checkSchema();
// Since I can't easily run RPCs that might not exist, I'll just try to select 1 from the table.
async function probe() {
    const { error: billPaymentsError } = await supabase.from('bill_payments').select('id').limit(1);
    console.log("bill_payments table exists:", !billPaymentsError);
    if (billPaymentsError) console.log("Error:", billPaymentsError.message);

    const { data: sessionsData, error: sessionsError } = await supabase.from('sessions').select('*').limit(1);
    if (sessionsData && sessionsData.length > 0) {
        console.log("Sessions keys:", Object.keys(sessionsData[0]));
    }
}

probe();
