import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Onboarding request received");
        
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No auth header')

        const token = authHeader.replace('Bearer ', '')

        // Verify caller is super admin
        console.log("Verifying super admin status...");
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
        if (userError || !user) {
            console.error("Auth error:", userError);
            throw new Error('Unauthorized: ' + (userError?.message || 'No user found'))
        }

        const { data: isSuperAdmin, error: superAdminError } = await supabaseAdmin.rpc('has_role', {
            _user_id: user.id,
            _role: 'super_admin'
        })

        if (superAdminError || !isSuperAdmin) {
            console.error("Role check error or not super admin:", superAdminError);
            throw new Error('Forbidden: Super Admin role required')
        }

        const body = await req.json()
        const { organization_name, organization_slug, contact_email, subscription_plan } = body
        console.log("Onboarding data for:", organization_name);

        if (!organization_name || !organization_slug || !contact_email) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 1. Generate Org Code
        console.log("Generating org code...");
        const { data: orgCode, error: orgCodeError } = await supabaseAdmin.rpc('generate_org_code')
        if (orgCodeError) {
            console.error("Org code generation failed:", orgCodeError);
            throw new Error('Failed to generate organization code: ' + orgCodeError.message)
        }

        // 2. Create the Organization
        console.log("Creating organization record...");
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: organization_name,
                slug: organization_slug,
                subscription_plan: subscription_plan || 'free',
                org_code: orgCode,
                status: 'active'
            })
            .select()
            .single()

        if (orgError) {
            console.error("Organization creation failed:", orgError);
            throw new Error('Failed to create organization: ' + orgError.message)
        }

        // 3. Create Default Location
        console.log("Creating default location...");
        const { error: locError } = await supabaseAdmin
            .from('locations')
            .insert({
                organization_id: org.id,
                name: 'Main Location'
            })

        if (locError) {
            console.error("Location creation failed:", locError);
            // Critical enough to fail? Yes, keep it clean
            throw new Error('Failed to create default location: ' + locError.message)
        }

        // 4. Create the Admin User
        console.log("Creating admin user in auth...");
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!'

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: contact_email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                organization_id: org.id
            }
        })

        if (authError) {
            console.error("Admin user creation failed:", authError);
            // Rollback org creation
            await supabaseAdmin.from('organizations').delete().eq('id', org.id)
            throw new Error('Failed to create admin user: ' + authError.message)
        }

        const newUserId = authData.user.id
        console.log("Admin user created with ID:", newUserId);

        // Update profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                organization_id: org.id
            })
            .eq('id', newUserId)
        
        if (profileError) console.error("Profile update warning:", profileError);

        // 5. Assign admin role
        console.log("Assigning admin role...");
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: newUserId,
                role: 'admin'
            })

        if (roleError) {
            console.error("Role assignment failed:", roleError);
            throw new Error('Failed to assign admin role: ' + roleError.message)
        }

        console.log("Onboarding successful!");
        return new Response(JSON.stringify({
            success: true,
            organization: org,
            admin_email: contact_email,
            temp_password: tempPassword
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("Onboarding crash:", error.message);
        return new Response(JSON.stringify({ 
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Returning 400 instead of 500 to see if client handles it better
        })
    }
})
