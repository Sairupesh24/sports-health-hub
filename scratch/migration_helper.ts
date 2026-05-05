import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log("Attempting to add 'classification' column to 'questionnaires' table...");
  
  // Note: Supabase JS client doesn't support DDL. 
  // This script is mostly to confirm that we NEED the user to run it manually 
  // or to try a specific RPC if one exists.
  
  const sql = `
    ALTER TABLE public.questionnaires 
    ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'performance' 
    CHECK (classification IN ('performance', 'clinical'));
  `;

  console.log("Please execute the following SQL in your Supabase SQL Editor:");
  console.log(sql);
}

runMigration();
