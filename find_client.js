
import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findClient() {
    console.log("Searching for BHARGAV SOMASUNDARA...");
    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, uhid')
        .or('first_name.ilike.%BHARGAV%,last_name.ilike.%SOMASUNDARA%');

    if (error) console.error("Search Error:", error);
    else console.log("Found in clients:", JSON.stringify(clients, null, 2));

    if (clients && clients.length > 0) {
        const clientId = clients[0].id;
        console.log(`Checking sessions for client ID: ${clientId}`);
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, client_id, status, scheduled_start')
            .eq('client_id', clientId)
            .limit(5);
        console.log("Sessions with this client ID:", JSON.stringify(sessions, null, 2));
    }
    
    // Check if the user ID exists in profiles but with a different name or something
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or('first_name.ilike.%BHARGAV%,last_name.ilike.%SOMASUNDARA%');
    console.log("Found in profiles:", JSON.stringify(profiles, null, 2));
}

findClient();
