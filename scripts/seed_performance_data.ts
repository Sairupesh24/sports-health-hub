import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPerformanceData() {
  console.log('Fetching athletes...');
  const { data: athletes, error: athleteError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('ams_role', 'athlete');

  if (athleteError) {
    console.error('Error fetching athletes:', athleteError);
    return;
  }

  if (!athletes || athletes.length === 0) {
    console.log('No athletes found to seed data for.');
    return;
  }

  console.log(`Found ${athletes.length} athletes. Seeding data...`);

  const assessments = [];
  const testTypes = [
    { category: 'Jump', name: 'CMJ', unit: 'cm', min: 30, max: 65 },
    { category: 'Jump', name: 'Broad Jump', unit: 'cm', min: 200, max: 280 },
    { category: 'Sprint', name: '10m Sprint', unit: 'sec', min: 1.6, max: 2.1 },
    { category: 'Sprint', name: '30m Sprint', unit: 'sec', min: 4.0, max: 4.8 },
    { category: 'Strength', name: 'Back Squat 1RM', unit: 'kg', min: 80, max: 180 },
    { category: 'Mobility', name: 'FMS Score', unit: 'score', min: 14, max: 21 },
  ];

  const now = new Date();
  
  for (const athlete of athletes) {
    // Generate 5 random assessment dates over the last 6 months
    for (let i = 0; i < 5; i++) {
        const recordedAt = new Date(now.getTime() - (i * 30 * 24 * 60 * 60 * 1000));
        
        for (const test of testTypes) {
            // Add some randomness to metrics
            const value = parseFloat((Math.random() * (test.max - test.min) + test.min).toFixed(2));
            
            assessments.push({
                athlete_id: athlete.id,
                test_name: test.name,
                category: test.category,
                metrics: { value, unit: test.unit },
                recorded_at: recordedAt.toISOString(),
                recorded_by: athletes[0].id, // Just picking the first one as a mock scientist
            });
        }
    }
  }

  console.log(`Inserting ${assessments.length} assessment records...`);
  
  const { error: insertError } = await supabase
    .from('performance_assessments')
    .insert(assessments);

  if (insertError) {
    console.error('Error inserting assessments:', insertError);
  } else {
    console.log('Seeding complete!');
  }
}

seedPerformanceData();
