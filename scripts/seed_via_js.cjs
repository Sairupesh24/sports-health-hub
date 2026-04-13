const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
        envVars[key] = val;
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUser() {
    console.log(`Seeding user into project: ${supabaseUrl}`);

    // Try to create the user
    let { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'saikavuturi24@gmail.com',
        password: 'Svrforever24@',
        email_confirm: true,
        user_metadata: { first_name: 'Sai', last_name: 'Admin' },
        app_metadata: {}
    });

    if (authError) {
        if (authError.code === 'email_exists' || authError.message.includes('already') || authError.message.includes('registered')) {
            console.log('User already exists, attempting to reset password...');
            
            // Re-fetch user id
            const { data: usersData } = await supabase.auth.admin.listUsers();
            const existingUser = usersData.users.find(u => u.email === 'saikavuturi24@gmail.com');
            
            if (existingUser) {
                // Update password securely via GoTrue
                const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                    password: 'Svrforever24@',
                    user_metadata: { first_name: 'Sai', last_name: 'Admin' }
                });
                if (updateError) {
                    console.error('Failed to update password:', updateError);
                    process.exit(1);
                }
                authData = { user: updateData.user };
                console.log('Password successfully reset.');
            } else {
                console.error('Could not find existing user to update.');
                process.exit(1);
            }
        } else {
            console.error('User creation failed:', authError);
            process.exit(1);
        }
    } else {
        console.log('User created successfully:', authData.user.id);
    }

    const userId = authData.user.id;

    // Wait a brief moment for DB triggers to create the profile
    await new Promise(r => setTimeout(r, 1500));

    // Ensure Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: 'saikavuturi24@gmail.com',
            first_name: 'Sai (Super Admin)',
            last_name: 'K'
        });

    if (profileError) {
        console.error('Profile creation error:', profileError);
    } else {
        console.log('Profile ensured.');
    }

    // Ensure Role
    const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
            user_id: userId,
            role: 'super_admin'
        });
        
    if (roleError) {
        console.error('Role assignment error:', roleError);
    } else {
        console.log('Super Admin role assigned successfully.');
    }
}

seedUser().catch(console.error);
