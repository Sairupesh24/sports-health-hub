import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  // CORS Handling
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checkLog: string[] = ["Start"];
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Env configuration (URL/SRK)");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    checkLog.push("ClientCreated");

    // Manual JWT check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestor }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestor) {
      throw new Error("Unauthorized: " + (userError?.message || "Invalid session"));
    }

    checkLog.push(`Requestor:${requestor.email}`);

    // Role check
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestor.id)
      .maybeSingle();

    if (roleError) throw new Error("Error checking permissions: " + roleError.message);
    if (!roleData || !["admin", "hr_manager", "super_admin"].includes(roleData.role)) {
      throw new Error("Forbidden: Higher privileges required");
    }

    checkLog.push(`Role:${roleData.role}`);

    // Parse Body
    const bodyText = await req.text();
    let userId;
    try {
      const body = JSON.parse(bodyText);
      userId = body.userId;
    } catch {
       throw new Error("Payload must be valid JSON");
    }

    if (!userId) throw new Error("Target User ID is missing");
    if (userId === requestor.id) throw new Error("Self-deletion is prohibited");

    // Explicitly delete from public tables first to ensure no dangling data
    // (Even if ON DELETE CASCADE is set, explicit deletion is safer in some multi-schema setups)
    checkLog.push("CleanupPublic");
    
    const { error: rolesDeleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesDeleteError) checkLog.push(`RolesDeleteErr:${rolesDeleteError.message}`);

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileDeleteError) checkLog.push(`ProfileDeleteErr:${profileDeleteError.message}`);

    // Deletion from Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error("Auth Deletion Failed: " + deleteError.message);
    }

    checkLog.push("Success");

    return new Response(JSON.stringify({
      success: true,
      message: "User account deleted",
      log: checkLog.join("|")
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err: any) {
    const errMsg = err?.message || "Unknown error";
    console.error("[DeleteUser] Failure:", errMsg);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errMsg,
      log: checkLog.join("|")
    }), {
      status: 200, // Explicitly return 200 so the client receives the error JSON
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
