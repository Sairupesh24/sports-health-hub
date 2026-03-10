import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Using the service role key to bypass RLS for seeding
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedClinicalData() {
    console.log('Seeding clinical test data...');

    // 1. Get an organization
    const { data: orgs, error: orgErr } = await supabase.from('organizations').select('id').limit(1);
    if (orgErr || !orgs?.length) throw new Error('No organizations found to attach data to.');
    const orgId = orgs[0].id;

    // 2. Get a client in that organization
    const { data: clients, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1);

    let clientId = null;
    if (clients && clients.length > 0) {
        clientId = clients[0].id;
    } else {
        throw new Error('No clients found in the organization. Please create one first.');
    }

    // 3. Get a consultant
    const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .eq('organization_id', orgId)
        .eq('role', 'consultant')
        .limit(1);

    let consultantId = null;
    if (profiles && profiles.length > 0) {
        consultantId = profiles[0].id;
        console.log(`\nFound Consultant: ${profiles[0].first_name} (${profiles[0].email})`);
    } else {
        console.log('\nNo consultant found in this organization. You will need to create one to log in.');
    }

    // 4. Seed Injury Master Data
    const masterData = [
        { organization_id: orgId, region: 'Knee', injury_type: 'Ligament Tear', diagnosis: 'ACL Tear' },
        { organization_id: orgId, region: 'Knee', injury_type: 'Ligament Tear', diagnosis: 'MCL Tear' },
        { organization_id: orgId, region: 'Shoulder', injury_type: 'Strain', diagnosis: 'Rotator Cuff Strain' },
        { organization_id: orgId, region: 'Ankle', injury_type: 'Sprain', diagnosis: 'Lateral Ankle Sprain' }
    ];
    await supabase.from('injury_master_data').upsert(masterData, { onConflict: 'organization_id, region, injury_type, diagnosis' });
    console.log('Seeded Injury Master Data');

    // 5. Seed an Injury for the client
    const { data: injury } = await supabase.from('injuries').insert({
        organization_id: orgId,
        client_id: clientId,
        injury_date: new Date().toISOString().split('T')[0],
        region: 'Knee',
        injury_type: 'Ligament Tear',
        diagnosis: 'ACL Tear',
        severity: 'Severe',
        status: 'Rehab'
    }).select('id').single();
    console.log('Seeded Injury');

    // 6. Seed AMS Training Load for the past week
    const amsData = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        amsData.push({
            organization_id: orgId,
            client_id: clientId,
            training_date: d.toISOString().split('T')[0],
            workout_name: i % 2 === 0 ? 'Heavy Lifting' : 'Cardio Recovery',
            training_load: Math.floor(Math.random() * 400) + 200,
            readiness_score: Math.floor(Math.random() * 5) + 5
        });
    }
    await supabase.from('external_training_summary').insert(amsData);
    console.log('Seeded AMS Data');

    // 7. Seed completed Sessions with SOAP Notes
    for (let i = 1; i <= 3; i++) {
        const start = new Date();
        start.setDate(start.getDate() - (i * 2));
        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        const { data: session, error: sessErr } = await supabase.from('sessions').insert({
            organization_id: orgId,
            client_id: clientId,
            therapist_id: consultantId,
            service_type: 'Physiotherapy',
            scheduled_start: start.toISOString(),
            scheduled_end: end.toISOString(),
            status: 'Completed'
        }).select('id').single();

        if (sessErr) {
            console.error('Error seeding session:', sessErr);
            continue;
        }

        await supabase.from('physio_session_details').insert({
            session_id: session.id,
            injury_id: injury ? injury.id : null,
            pain_score: 8 - i,
            modality_used: ['IFT', 'HC'],
            treatment_type: 'Strength Training',
            clinical_notes: `Patient feeling better, step ${i} of rehab.`
        });
    }

    // Also seed one un-completed session for today that the therapist can fill out
    const today = new Date();
    const todayEnd = new Date(today);
    todayEnd.setHours(todayEnd.getHours() + 1);

    await supabase.from('sessions').insert({
        organization_id: orgId,
        client_id: clientId,
        therapist_id: consultantId,
        service_type: 'Physiotherapy',
        scheduled_start: today.toISOString(),
        scheduled_end: todayEnd.toISOString(),
        status: 'Planned'
    });

    console.log('Seeded Sessions and SOAP Notes');
    console.log('Seed completed successfully!');
}

seedClinicalData().catch(console.error);
