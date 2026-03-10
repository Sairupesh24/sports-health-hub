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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No auth header')

        const token = authHeader.replace('Bearer ', '')

        // Verify caller is super admin
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        const { data: isSuperAdmin, error: superAdminError } = await supabaseAdmin.rpc('has_role', {
            _user_id: user.id,
            _role: 'super_admin'
        })

        if (superAdminError || !isSuperAdmin) {
            throw new Error('Forbidden: Super Admin role required')
        }



        const { organization_name, organization_slug, contact_email, contact_phone, subscription_plan } = await req.json()

        if (!organization_name || !organization_slug || !contact_email) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 1. Generate Org Code using the existing DB function
        const { data: orgCode, error: orgCodeError } = await supabaseAdmin.rpc('generate_org_code')
        if (orgCodeError) throw new Error('Failed to generate organization code: ' + orgCodeError.message)

        // 2. Create the Organization
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

        if (orgError) throw new Error('Failed to create organization: ' + orgError.message)

        // 3. Create Default Location
        const { error: locError } = await supabaseAdmin
            .from('locations')
            .insert({
                organization_id: org.id,
                name: 'Main Location'
            })

        if (locError) throw new Error('Failed to create default location: ' + locError.message)

        // 4. Create the Admin User in auth.users
        // We create the user, they will have to perform password reset or click the invite link to set their password.
        // Or we generate a random password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!'

        // We can also just send an invite link but creating the user is more robust if we want to return the temp password.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: contact_email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                organization_id: org.id
            }
        })

        if (authError) {
            // Rollback org creation (in a real world scenario we'd use a transaction or saga)
            await supabaseAdmin.from('organizations').delete().eq('id', org.id)
            throw new Error('Failed to create admin user: ' + authError.message)
        }

        const newUserId = authData.user.id

        // The trigger handle_new_user should have created the profile.
        // Let's update it with some defaults and the correct org ID (just in case)
        await supabaseAdmin
            .from('profiles')
            .update({
                organization_id: org.id
            })
            .eq('id', newUserId)

        // 5. Assign admin role to the new user
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: newUserId,
                role: 'admin'
            })

        if (roleError) throw new Error('Failed to assign admin role: ' + roleError.message)

        return new Response(JSON.stringify({
            success: true,
            organization: org,
            admin_email: contact_email,
            temp_password: tempPassword // We return this to the super admin to communicate it, or they can trigger a password reset securely
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
