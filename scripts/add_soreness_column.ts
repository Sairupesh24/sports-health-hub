import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function addSorenessColumn() {
  console.log('Adding soreness_data column to wellness_logs...');
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql_string: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='wellness_logs' AND column_name='soreness_data'
        ) THEN
          ALTER TABLE wellness_logs ADD COLUMN soreness_data JSONB DEFAULT '[]'::JSONB;
          RAISE NOTICE 'Added soreness_data column';
        END IF;
      END $$;
    `
  });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
        console.error('RPC "exec_sql" not found. Please run the SQL manually in Supabase Dashboard:');
        console.log("ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS soreness_data JSONB DEFAULT '[]'::JSONB;");
    } else {
        console.error('Error adding column:', error);
    }
  } else {
    console.log('Successfully checked/added column.');
  }
}

addSorenessColumn();
