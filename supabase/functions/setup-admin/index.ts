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

<<<<<<< HEAD
    // Read orgName from request body
    const body = await req.json().catch(() => ({}));
    const orgName = body.orgName || "Default Organization";

    // Insert Organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName })
      .select()
      .single();

    if (orgError || !orgData) throw new Error("Failed to create organization: " + (orgError?.message || "Unknown error"));

    // Update profile with new org and approval
    await supabase
      .from("profiles")
      .update({ organization_id: orgData.id, is_approved: true })
=======
    const orgId = "00000000-0000-0000-0000-000000000001";

    // Update profile with org and approval
    await supabase
      .from("profiles")
      .update({ organization_id: orgId, is_approved: true })
>>>>>>> 06b5c2f5749e810212bca517c51285b0f66adef2
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
