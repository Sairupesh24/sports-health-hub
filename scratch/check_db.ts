import { createClient } from '@supabase/supabase-client-helpers';
import 'dotenv/config';

// This is a dummy check to see if the table exists
async function checkTable() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in .env");
        return;
    }
}
