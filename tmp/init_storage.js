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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initStorage() {
  console.log("Initializing Storage Bucket: report-templates...");
  
  const { data, error } = await supabase.storage.createBucket('report-templates', {
    public: true
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log("Bucket already exists.");
    } else {
      console.error("Error creating bucket:", error.message);
    }
  } else {
    console.log("Bucket created successfully:", data);
  }
}

initStorage();
