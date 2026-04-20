
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function recreateUser() {
    const email = 'scientist_test@example.com';
    const password = 'password123';
    const orgId = '95d6393e-68ab-4839-9b35-a11562cfc150';

    console.log(`Re-creating user: ${email}`);

    // 1. Check for dangling profile and "rename" it to free the email unique constraint
    const { data: oldProfile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    if (oldProfile) {
        console.log(`Found dangling profile with ID ${oldProfile.id}. Renaming email...`);
        const { error: renameErr } = await supabase
            .from('profiles')
            .update({ email: `deleted_${Date.now()}_${email}` })
            .eq('id', oldProfile.id);
        
        if (renameErr) {
            console.error("Failed to rename old profile:", renameErr.message);
            return;
        }
    }

    // 2. Create the new Auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Scientist' }
    });

    if (authErr) {
        console.error("Auth creation failed:", authErr.message);
        return;
    }

    const newId = authUser.user.id;
    console.log(`New Auth user created with ID: ${newId}`);

    // 3. Initialize new Profile (wait a bit for trigger if any)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: profileErr } = await supabase
        .from('profiles')
        .update({
            organization_id: orgId,
            first_name: 'Test',
            last_name: 'Scientist',
            is_approved: true,
            profession: 'Sports Scientist',
            ams_role: 'coach'
        })
        .eq('id', newId);

    if (profileErr) {
        console.error("Profile setup failed (attempting insert if trigger didn't run):", profileErr.message);
        // If update failed, maybe trigger didn't run, try insert
        const { error: insertErr } = await supabase.from('profiles').insert({
            id: newId,
            organization_id: orgId,
            first_name: 'Test',
            last_name: 'Scientist',
            email: email,
            is_approved: true,
            profession: 'Sports Scientist',
            ams_role: 'coach'
        });
        if (insertErr) console.error("Profile insert failed:", insertErr.message);
    }

    // 4. Set Role
    const { error: roleErr } = await supabase.from('user_roles').insert({
        user_id: newId,
        role: 'sports_scientist'
    });

    if (roleErr) console.error("Role setup failed:", roleErr.message);
    else console.log("User re-created successfully!");
}

recreateUser();
