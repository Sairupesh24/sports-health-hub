import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserPayload {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    password?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error(`Missing Env Variables`);
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No auth header");

        const token = authHeader.replace("Bearer ", "");
        const { data: { user: requestor }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !requestor) throw new Error("Unauthorized: " + (userError?.message || "No user"));

        const { data: requestorRole, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", requestor.id)
            .single();

        if (!requestorRole || requestorRole.role !== "super_admin") {
            throw new Error("Only super administrators can perform bulk user creation");
        }

        const { data: requestorProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("organization_id")
            .eq("id", requestor.id)
            .single();

        const bodyText = await req.text();
        const body = JSON.parse(bodyText);
        const { users, organizationId } = body;

        // Fallback to requestor's org if none provided
        const targetOrgId = organizationId || requestorProfile?.organization_id;

        if (!targetOrgId || !users || !Array.isArray(users)) {
            throw new Error("Missing organization ID or valid user array payload");
        }

        const results = { successful: 0, failed: 0, errors: [] as any[] };

        for (const user of users as UserPayload[]) {
            try {
                const tempPassword = user.password || `${Math.random().toString(36).slice(-6)}${Math.random().toString(36).slice(-6).toUpperCase()}!8z`;
                const combinedFirstName = user.middleName ? `${user.firstName} ${user.middleName}`.trim() : user.firstName;

                // 1. Create Auth User
                const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
                    email: user.email,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: { first_name: combinedFirstName, last_name: user.lastName, organization_id: targetOrgId }
                });

                if (authCreateError) throw new Error(`Auth Create: ${authCreateError.message}`);

                const newUserId = authData.user.id;

                // Wait briefly for triggers to complete
                await new Promise(resolve => setTimeout(resolve, 800));

                // 2. Update Profile with Phone and Org
                const { error: profileUpdateErr } = await supabaseAdmin
                    .from("profiles")
                    .update({
                        organization_id: targetOrgId,
                        is_approved: true,
                        first_name: combinedFirstName,
                        last_name: user.lastName,
                        mobile_no: user.phone || null
                    })
                    .eq("id", newUserId);

                if (profileUpdateErr) throw new Error(`Profile Update: ${profileUpdateErr.message}`);

                // 3. Assign Role
                const { error: roleInsertErr } = await supabaseAdmin
                    .from("user_roles")
                    .insert({ user_id: newUserId, role: user.role.toLowerCase() });

                if (roleInsertErr) throw new Error(`Role Insert: ${roleInsertErr.message}`);

                // 4. Generate UHID if Client
                if (user.role.toLowerCase() === "client") {
                    const { data: uhid, error: uhidError } = await supabaseAdmin.rpc('generate_uhid', { p_organization_id: targetOrgId });

                    if (uhidError) {
                        throw new Error(`UHID Gen: ${uhidError.message}`);
                    }

                    // Add to client table
                    const { error: clientInsertErr } = await supabaseAdmin
                        .from("clients")
                        .insert({
                            uhid: uhid,
                            organization_id: targetOrgId,
                            first_name: combinedFirstName,
                            last_name: user.lastName,
                            email: user.email,
                            contact_number: user.phone || null,
                            status: 'active'
                        });

                    if (clientInsertErr) throw new Error(`Client Registration: ${clientInsertErr.message}`);

                    // Link profile UHID
                    await supabaseAdmin.from("profiles").update({ uhid: uhid }).eq("id", newUserId);
                }

                results.successful++;
            } catch (userLevelError: any) {
                results.failed++;
                results.errors.push({ email: user.email, error: userLevelError.message });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            data: results
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
