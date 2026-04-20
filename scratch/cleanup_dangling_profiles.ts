
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanupDangling() {
    console.log("Starting cleanup of dangling profiles...");
    
    // 1. Fetch all profiles
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email');
        
    if (pErr) {
        console.error("Failed to fetch profiles:", pErr);
        return;
    }

    console.log(`Found ${profiles.length} profiles to check.`);

    let cleanedCount = 0;
    for (const profile of profiles) {
        // Check if user exists in Auth
        const { data: authUser, error: aErr } = await supabase.auth.admin.getUserById(profile.id);
        
        if (aErr && aErr.message.includes('User not found')) {
            console.log(`[CLEANING] Profile ID ${profile.id} (${profile.email}) has no Auth account. Deleting dependencies...`);
            
            // Delete dependent records that might block deletion
            // We use a best-effort approach here for common tables
            await supabase.from('sessions').delete().eq('scientist_id', profile.id);
            await supabase.from('sessions').delete().eq('creator_id', profile.id);
            await supabase.from('patient_appointments').delete().eq('provider_id', profile.id);
            await supabase.from('hr_attendance_logs').delete().eq('profile_id', profile.id);
            await supabase.from('hr_leaves').delete().eq('employee_id', profile.id);
            await supabase.from('hr_leaves').delete().eq('approved_by', profile.id);
            await supabase.from('user_roles').delete().eq('user_id', profile.id);
            
            // Delete dangling profile
            const { error: dErr } = await supabase.from('profiles').delete().eq('id', profile.id);
            
            if (dErr) {
                console.error(`Failed to delete profile ${profile.id}:`, dErr.message);
            } else {
                cleanedCount++;
            }
        }
    }

    console.log(`Cleanup complete. Removed ${cleanedCount} dangling profiles.`);
}

cleanupDangling();
