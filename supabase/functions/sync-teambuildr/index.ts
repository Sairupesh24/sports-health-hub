import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Fetch all mapped athletes
        const { data: mappings, error: mapErr } = await supabaseClient
            .from("athlete_external_mapping")
            .select("client_id, organization_id, external_athlete_id")
            .eq("external_system", "TeamBuildr");

        if (mapErr) throw mapErr;
        if (!mappings || mappings.length === 0) {
            return new Response(JSON.stringify({ message: "No mapped athletes found." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Mock API call to TeamBuildr (replace with actual integration later)
        const today = new Date().toISOString().split('T')[0];
        const syncdData = mappings.map(m => ({
            organization_id: m.organization_id,
            client_id: m.client_id,
            external_system: 'TeamBuildr',
            training_date: today,
            workout_name: `Mocked Workout ${m.external_athlete_id}`,
            duration_minutes: Math.floor(Math.random() * 60) + 30, // 30-90 mins
            training_load: Math.floor(Math.random() * 500) + 100, // 100-600 load
            completion_status: 'Completed'
        }));

        // 3. Upsert training summaries
        const { error: upsertErr } = await supabaseClient
            .from("external_training_summary")
            .upsert(syncdData, { onConflict: 'client_id, training_date, external_system' });

        if (upsertErr) throw upsertErr;

        return new Response(
            JSON.stringify({ success: true, processed: mappings.length }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
