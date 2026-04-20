
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function deepCleanup() {
    const targetId = 'fb2a359a-6914-4a48-907f-5a4475e3172f';
    console.log(`Deep cleaning dependencies for ${targetId}...`);

    // 1. Sessions
    const { error: sErr } = await supabase.from('sessions').delete().eq('scientist_id', targetId);
    if (sErr) console.log("Sessions cleanup error:", sErr.message);
    else console.log("Sessions cleaned up.");

    const { error: sErr2 } = await supabase.from('sessions').delete().eq('creator_id', targetId);
    if (sErr2) console.log("Sessions (creator) cleanup error:", sErr2.message);

    // 2. Roles
    const { error: rErr } = await supabase.from('user_roles').delete().eq('user_id', targetId);
    if (rErr) console.log("Roles cleanup error:", rErr.message);

    // 3. Profile
    const { error: pErr } = await supabase.from('profiles').delete().eq('id', targetId);
    if (pErr) console.log("Profile cleanup error:", pErr.message);
    else console.log("Profile successfully deleted.");
}

deepCleanup();
