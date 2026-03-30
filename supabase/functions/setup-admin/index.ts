import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the JWT from the authorization header and verify via service role client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Check if any admin already exists
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (count && count > 0) {
      return new Response(JSON.stringify({ error: "Admin already exists" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read orgCode from request body
    const body = await req.json().catch(() => ({}));
    const orgCode = body.orgCode;

    if (!orgCode) throw new Error("Organization Code is required");

    // Try to find if the organization already exists
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("org_code", orgCode.toUpperCase())
      .maybeSingle();

    let orgId;
    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      // Create new organization with this code
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({ 
          name: orgCode, // Use code as name 
          org_code: orgCode.toUpperCase(),
          status: 'active'
        })
        .select()
        .single();
      
      if (orgError) throw new Error("Failed to create organization: " + orgError.message);
      orgId = newOrg.id;

      // Create a default location for new organization
      await supabase.from("locations").insert({
        organization_id: orgId,
        name: "Main Location"
      });
    }

    // Update profile with org and approval
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organization_id: orgId, is_approved: true })
      .eq("id", user.id);

    // Assign admin role
    await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
