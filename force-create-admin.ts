import { createClient } from '@supabase/supabase-js';

// Replace this with your exact Supabase URL from your .env
const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';

// ⚠️ REPLACE THIS WITH YOUR SERVICE ROLE KEY!
// Found in Supabase Dashboard -> Settings -> API -> service_role secret
const supabaseServiceKey = 'sb_secret_kd3nY6Fu728K50ZEBILdAA_TjWHS6-_';

if (supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error("❌ ERROR: You must edit this file and paste your SERVICE ROLE KEY on line 8!");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function setupMasterAdmin() {
    const email = "rupeshk@ishpo.com";
    const password = "password123!";
    const firstName = "Rupesh";
    const lastName = "K";
    const orgName = "ISHPO Headquarters";

    console.log(`Creating user ${email} directly via Admin API to bypass rate limits...`);

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName }
    });

    if (authError) {
        if (authError.message.includes("already registered")) {
            console.log("User already exists in Auth. Looking up ID...");
        } else {
            console.error("Failed to create auth user:", authError);
            return;
        }
    }

    // Get user ID (either newly created or existing)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUser.users.find(u => u.email === email);
    if (!user) return console.error("Could not find user ID.");
    const userId = user.id;

    console.log("User ID:", userId);

    // 2. Insert Organization
    console.log(`Creating organization: ${orgName}...`);
    const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single();

    if (orgError) {
        console.error("Failed to create organization:", orgError);
        return;
    }

    const orgId = orgData.id;

    // Wait a second for trigger profile creation to finish
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Update Profile
    console.log("Updating profile with organization ID and approving...");
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            organization_id: orgId,
            is_approved: true,
            first_name: firstName,
            last_name: lastName
        })
        .eq('id', userId);

    if (profileError) {
        console.error("Failed to update profile:", profileError);
        return;
    }

    // 4. Assign Admin Role
    console.log("Assigning 'admin' role...");
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

    if (roleError) {
        console.error("Failed to assign role:", roleError);
        return;
    }

    console.log("\n=============================================");
    console.log("✅ SUCCESS! Master Admin successfully created.");
    console.log("=============================================");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Organization: ${orgName}`);
    console.log("You can now log in at http://localhost:8081/login");
}

setupMasterAdmin().catch(console.error);
