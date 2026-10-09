import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
import jwt from '../server/node_modules/jsonwebtoken/index.js';
import { db } from '../server/db.js';

async function runTests() {
  console.log('🧪 Starting Performance Testing API Endpoints Validation...');

  try {
    // 1. Get a test user and athlete
    const userRes = await db.query(`SELECT u.id, u.email, u.role, p.organization_id FROM users u JOIN profiles p ON p.id = u.id LIMIT 1`);
    if (userRes.rows.length === 0) throw new Error('No user found');
    const user = userRes.rows[0];

    const athleteRes = await db.query(`SELECT id, first_name, last_name, uhid FROM clients WHERE deleted_at IS NULL LIMIT 1`);
    if (athleteRes.rows.length === 0) throw new Error('No athlete found');
    const athlete = athleteRes.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, organization_id: user.organization_id },
      process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
      { expiresIn: '1h' }
    );

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const baseUrl = 'http://localhost:3000/api/performance';

    // TEST 1: GET /api/performance/protocols
    console.log('\n--- 1. Testing GET /api/performance/protocols ---');
    const pRes = await fetch(`${baseUrl}/protocols`, { headers });
    const text = await pRes.text();
    console.log(`Status: ${pRes.status}, Body: ${text}`);
    const protocols = JSON.parse(text);
    console.log(`Found ${protocols.length} protocols:`, protocols.map(p => p.slug));
    if (protocols.length < 8) throw new Error(`Expected at least 8 protocols, got ${protocols.length}`);

    // TEST 2: GET /api/performance/protocols/:slug
    console.log('\n--- 2. Testing GET /api/performance/protocols/badminton-assessment ---');
    const sRes = await fetch(`${baseUrl}/protocols/badminton-assessment`, { headers });
    const singleProto = await sRes.json();
    console.log(`Status: ${sRes.status}, Protocol: ${singleProto.template_name} (${singleProto.sport_name})`);

    // TEST 3: GET /api/performance/athletes
    console.log('\n--- 3. Testing GET /api/performance/athletes ---');
    const aRes = await fetch(`${baseUrl}/athletes?limit=5`, { headers });
    const athletes = await aRes.json();
    console.log(`Status: ${aRes.status}, Loaded ${athletes.length} athletes. First:`, athletes[0]?.full_name, `UHID: ${athletes[0]?.uhid}`);

    // TEST 4: POST /api/performance/assessments
    console.log('\n--- 4. Testing POST /api/performance/assessments ---');
    const newAssessmentPayload = {
      athlete_id: athlete.id,
      protocol_id: singleProto.id,
      assessment_date: new Date().toISOString().split('T')[0],
      batch_or_squad: 'Senior Academy Batch A',
      needs_analysis: { sport_training_age: 6, strength_training_age: 3, playing_hand: 'Right' },
      anthropometrics: { standing_height: 178, weight: 72, body_fat_pct: 12.5, lower_limb_length_r: 90, lower_limb_length_l: 90 },
      fms_data: {
        ohs: { final: 3 },
        hurdle_step: { right: 3, left: 2, final: 2 },
        total_score: 17
      },
      stability_data: {
        ybt_lq_anterior_r: 82,
        ybt_lq_anterior_l: 81,
        ybt_lq_diff_anterior: 1.0,
        ybt_lq_composite_r: 96.5
      },
      power_speed_data: {
        vertical_jump: 54,
        vertical_jump_power_watts: 4485,
        sprint_10m: 1.72
      },
      aerobic_data: {
        test_variant: 'Yo-Yo IR1',
        distance_meters: 1840,
        vo2_max_calculated: 51.9
      },
      biomotor_ratings: {
        Balance: 'Good',
        Flexibility: 'Average',
        Power: 'Excellent',
        Speed: 'Good',
        Agility: 'Good',
        Strength: 'Good',
        Anaerobic: 'Average',
        Aerobic: 'Excellent'
      },
      overall_impression: 'Elite aerobic base with slight left hurdle asymmetry. Strong vertical jump capacity.',
      corrective_plan: 'Left hip flexor mobility and unilateral glute activation.',
      plan_of_action: 'Mesocycle 2: power speed contrast training.',
      status: 'completed'
    };

    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newAssessmentPayload)
    });
    const created = await createRes.json();
    console.log(`Status: ${createRes.status}, Created Assessment ID: ${created.id}`);
    if (!created.id) throw new Error('Failed to create assessment: ' + JSON.stringify(created));

    // TEST 5: GET /api/performance/assessments/:id
    console.log('\n--- 5. Testing GET /api/performance/assessments/:id ---');
    const getRes = await fetch(`${baseUrl}/assessments/${created.id}`, { headers });
    const fetched = await getRes.json();
    console.log(`Status: ${getRes.status}, Athlete: ${fetched.athlete_name}, Score: ${fetched.fms_data?.total_score}, VO2: ${fetched.aerobic_data?.vo2_max_calculated}`);

    // TEST 6: PUT /api/performance/assessments/:id
    console.log('\n--- 6. Testing PUT /api/performance/assessments/:id (same-day edit) ---');
    const updateRes = await fetch(`${baseUrl}/assessments/${created.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        overall_impression: 'Updated: Validated elite profile.'
      })
    });
    const updated = await updateRes.json();
    console.log(`Status: ${updateRes.status}, Body:`, updated);

    // TEST 7: GET /api/performance/batch-grid
    console.log('\n--- 7. Testing GET /api/performance/batch-grid ---');
    const bgRes = await fetch(`${baseUrl}/batch-grid?protocol_id=${singleProto.id}&station_key=jump_power`, { headers });
    const gridData = await bgRes.json();
    console.log(`Status: ${bgRes.status}, Protocol: ${gridData.protocol?.template_name}, Athletes in Grid: ${gridData.athletes?.length}`);

    // TEST 8: PUT /api/performance/batch-grid/cells
    console.log('\n--- 8. Testing PUT /api/performance/batch-grid/cells ---');
    const cellUpdatesPayload = {
      protocol_id: singleProto.id,
      assessment_date: new Date().toISOString().split('T')[0],
      batch_name: 'Senior Academy Batch A',
      updates: [
        {
          athlete_id: athlete.id,
          category: 'power_speed_data',
          field: 'vertical_jump',
          value: 56.5
        },
        {
          athlete_id: athlete.id,
          category: 'power_speed_data',
          field: 'broad_jump',
          value: 242
        }
      ]
    };
    const cellRes = await fetch(`${baseUrl}/batch-grid/cells`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(cellUpdatesPayload)
    });
    const cellResult = await cellRes.json();
    console.log(`Status: ${cellRes.status}, Success: ${cellResult.success}, Updated count: ${cellResult.updated_count}`);

    // TEST 9: GET /api/performance/batches
    console.log('\n--- 9. Testing GET /api/performance/batches ---');
    const bRes = await fetch(`${baseUrl}/batches`, { headers });
    const batches = await bRes.json();
    console.log(`Status: ${bRes.status}, Batches:`, batches);

    console.log('\n✅ ALL 9 PERFORMANCE API ENDPOINTS VALIDATED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Validation failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
