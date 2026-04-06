import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual dotenv parser
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envs = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=').map(part => part.trim().replace(/^["']|["']$/g, '')))
);

const supabaseUrl = envs.VITE_SUPABASE_URL;
const supabaseKey = envs.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setPhysicianRole() {
  console.log("Updating 'Doctor Test' profile to Sports Physician...");
  
  // Find the user by first name since it's the test account
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('first_name', 'Doctor')
    .eq('last_name', 'Test')
    .single();

  if (findError || !profile) {
    console.error("User 'Doctor Test' not found.");
    return;
  }

  console.log(`Found user: ${profile.first_name} ${profile.last_name} (ID: ${profile.id})`);

  const { data, error } = await supabase
    .from('profiles')
    .update({ profession: 'Sports Physician' })
    .eq('id', profile.id);

  if (error) {
    console.error("Error updating role:", error.message);
  } else {
    console.log("Profile updated successfully!");
  }
}

setPhysicianRole();
