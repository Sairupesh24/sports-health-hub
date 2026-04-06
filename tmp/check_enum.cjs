require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnum() {
  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'app_role' });
  
  if (error) {
    // If the RPC doesn't exist, try a direct query to pg_enum
    const { data: enumData, error: enumError } = await supabase.from('_pg_enum_check').select('*'); 
    // Wait, I can't query system tables easily via PostgREST unless exposed.
    // I'll try running a raw SQL via a custom function if available, or just try to insert a test value.
    console.error('Error checking enum:', error);
    
    // Alternative: Try to fetch the definition via a generic query if possible
    const { data: rawData, error: rawError } = await supabase.rpc('exec_sql', { 
      sql_query: "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'app_role';" 
    });
    
    if (rawError) {
      console.error('Error running raw SQL:', rawError);
    } else {
      console.log('Enum values:', rawData);
    }
    return;
  }

  console.log('Enum values:', data);
}

checkEnum();
