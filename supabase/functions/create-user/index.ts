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
    let checkLog = "Start|";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    checkLog += `Env:${!!supabaseUrl},${!!serviceRoleKey}|`;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(`Missing Env! URL:${!!supabaseUrl} SRK:${!!serviceRoleKey}`);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    checkLog += "ClientCreated|";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    checkLog += "HeaderFound|";

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestor }, error: userError } = await supabaseAdmin.auth.getUser(token);

    checkLog += `User:${!!requestor},Err:${userError?.message}|`;

    if (userError || !requestor) throw new Error("Unauthorized: " + (userError?.message || "No user"));

    const { data: requestorRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestor.id)
      .single();

    checkLog += `Role:${requestorRole?.role},Err:${roleError?.message}|`;

    if (!requestorRole || !["admin", "hr_manager", "super_admin"].includes(requestorRole.role)) {
      throw new Error("Only administrators or HR managers can create new users directly");
    }

    const { data: requestorProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", requestor.id)
      .single();

    checkLog += `Profile:${requestorProfile?.organization_id},Err:${profileError?.message}|`;

    if (!requestorProfile || !requestorProfile.organization_id) {
      throw new Error("Requestor does not belong to an organization");
    }

    const bodyText = await req.text();
    checkLog += `BodyLen:${bodyText.length}|`;
    const body = JSON.parse(bodyText);
    const { email, firstName, lastName, role, uhid } = body;

    if (role === "client" && !uhid) {
      throw new Error("UHID is mandatory when creating a Client account");
    }

    // If a UHID is provided, validate it exists in the organization's clients
    if (uhid) {
      const { data: clientCheck, error: clientCheckError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('organization_id', requestorProfile.organization_id)
        .eq('uhid', uhid)
        .maybeSingle();

      if (clientCheckError) throw clientCheckError;
      if (!clientCheck) {
        throw new Error(`The UHID '${uhid}' was not found in your organization's clinical records. Please check the UHID.`);
      }
    }

    const tempPassword = `${Math.random().toString(36).slice(-6)}${Math.random().toString(36).slice(-6).toUpperCase()}!8z`;
    checkLog += `PassGen|`;

    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName }
    });

    if (authCreateError) {
       checkLog += `AuthCreateErr:${authCreateError.message}|`;
       throw new Error(`Account Creation Failed: ${authCreateError.message}`);
    }

    checkLog += `CreateSuccess:${authData.user.id}|`;
    
    // Reduced wait time for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500));
    checkLog += `WaitDone|`;

    const { error: profileUpdateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        organization_id: requestorProfile.organization_id,
        is_approved: true,
        first_name: firstName,
        last_name: lastName,
        ...(uhid ? { uhid } : {})
      })
      .eq("id", authData.user.id);

    if (profileUpdateErr) {
       checkLog += `ProfUpdateErr:${profileUpdateErr.message}|`;
       // Don't throw here, prioritize returning credentials
    } else {
       checkLog += `ProfUpdateSuccess|`;
    }

    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: authData.user.id, role: role });

    if (roleInsertErr) {
      checkLog += `RoleInsertErr:${roleInsertErr.message}|`;
    } else {
      checkLog += `RoleInsertSuccess|`;
    }

    return new Response(JSON.stringify({
      success: true,
      user: { email, password: tempPassword },
      debug: checkLog
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (err: any) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message, 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
