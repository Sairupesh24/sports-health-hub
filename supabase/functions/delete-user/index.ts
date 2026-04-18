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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Env configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestor }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestor) throw new Error("Unauthorized: " + (userError?.message || "No user"));

    // Verify requestor role
    const { data: requestorRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestor.id)
      .single();

    if (!requestorRole || !["admin", "hr_manager", "super_admin"].includes(requestorRole.role)) {
      throw new Error("Only administrators or HR managers can delete users");
    }

    const { userId } = await req.json();
    if (!userId) throw new Error("User ID is required");

    // Perform deletion
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`Auth Deletion Failed: ${deleteError.message}`);

    return new Response(JSON.stringify({
      success: true,
      message: "User deleted successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (err: any) {
    console.error("Delete user error:", err.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
