
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUser(email: string) {
    console.log(`Checking status for: ${email}`);
    
    // 1. Check Profile
    const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
        
    if (pErr) console.error("Profile error:", pErr);
    console.log("Profile Data:", profile);

    if (profile) {
        // 2. Check Auth User
        const { data: authUser, error: aErr } = await supabase.auth.admin.getUserById(profile.id);
        if (aErr) {
            console.log(`Auth User NOT FOUND for ID: ${profile.id}. Error: ${aErr.message}`);
        } else {
            console.log("Auth User Found:", authUser.user.email, authUser.user.id);
        }
    } else {
        console.log("No profile found with this email.");
    }
}

const targetEmail = 'scientist_test@example.com';
checkUser(targetEmail);
