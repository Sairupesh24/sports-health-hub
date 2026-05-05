import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugJohnDoe() {
  console.log('Searching for John Doe...');
  const { data: clients, error } = await supabase
    .from('clients')
    .select(`
      id, 
      first_name, 
      last_name, 
      uhid,
      entitlements:client_entitlements(status),
      subscriptions(status)
    `)
    .ilike('first_name', 'John')
    .ilike('last_name', 'Doe');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results:', JSON.stringify(clients, null, 2));
}

debugJohnDoe();
