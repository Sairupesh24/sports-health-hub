import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=\"(.*?)\"/)[1];
const publishableKey = envFile.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*?)\"/)[1];

const supabase = createClient(url, publishableKey);

async function simulateClientLogin() {
    console.log("Simulating Client Login...");

    // 1. Sign In
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'client3445@ishpo.com',
        password: 'password123'
    });

    if (authError || !authData.user) {
        console.error("Login Failed:", authError?.message || "No user returned");
        return;
    }

    console.log("Logged in Auth ID:", authData.user.id);

    // 2. Fetch Profile (Simulating AuthContext)
    const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

    console.log("Profile Fetch Error:", profileErr?.message || "None");
    console.log("Profile Data:", profile);

    // 3. Fetch user roles
    const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", authData.user.id);

    console.log("Roles Fetch:", roles, "Error:", rolesErr?.message || "None");
}
simulateClientLogin();
