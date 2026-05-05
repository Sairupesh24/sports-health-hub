import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log("1. Checking current state...");
  const { data: initial } = await supabase.from('organizations').select('enable_geofencing').eq('id', '95d6393e-68ab-4839-9b35-a11562cfc150').single();
  console.log("Initial state:", initial?.enable_geofencing);

  console.log("2. Updating...");
  const { error } = await supabase.from('organizations').update({ enable_geofencing: true }).eq('id', '95d6393e-68ab-4839-9b35-a11562cfc150');
  
  if (error) {
    console.error("Update failed:", error.message);
  } else {
    console.log("Update sent.");
  }

  console.log("3. Verifying...");
  const { data: final } = await supabase.from('organizations').select('enable_geofencing').eq('id', '95d6393e-68ab-4839-9b35-a11562cfc150').single();
  console.log("Final state:", final?.enable_geofencing);
  
  if (final?.enable_geofencing) {
    console.log("GEOFENCE ACTIVATED SUCCESSFULLY.");
  } else {
    console.error("GEOFENCE ACTIVATION FAILED.");
  }
}
run();
