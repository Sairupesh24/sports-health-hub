const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function inject() {
    const today = new Date();

    const start1 = new Date(today);
    start1.setHours(today.getHours() + 1, 0, 0, 0);
    const end1 = new Date(today);
    end1.setHours(today.getHours() + 2, 0, 0, 0);

    const start2 = new Date(today);
    start2.setHours(today.getHours() + 3, 0, 0, 0);
    const end2 = new Date(today);
    end2.setHours(today.getHours() + 4, 0, 0, 0);

    // 1. Get first Consultant
    const { data: t, error: tErr } = await supabase.from('profiles').select('id, organization_id').eq('role', 'Consultant').limit(1).single();
    if (tErr) console.error("Error fetching consultant:", tErr);

    // 2. Get first Patient
    const { data: c, error: cErr } = await supabase.from('profiles').select('id, first_name').eq('role', 'Patient').limit(1).single();
    if (cErr) console.error("Error fetching patient:", cErr);

    if (t && c) {
        console.log(`Injecting sessions into Org ${t.organization_id} for Therapist ${t.id} and Client ${c.first_name}...`);
        const { error: insertErr } = await supabase.from('sessions').insert([
            {
                organization_id: t.organization_id,
                therapist_id: t.id,
                client_id: c.id,
                service_type: 'Physiotherapy',
                status: 'Planned',
                scheduled_start: start1.toISOString(),
                scheduled_end: end1.toISOString(),
                actual_start: start1.toISOString(),
                actual_end: end1.toISOString(),
                notes: null
            },
            {
                organization_id: t.organization_id,
                therapist_id: t.id,
                client_id: c.id,
                service_type: 'Performance Training',
                status: 'Planned',
                scheduled_start: start2.toISOString(),
                scheduled_end: end2.toISOString(),
                actual_start: start2.toISOString(),
                actual_end: end2.toISOString(),
                notes: null
            }
        ]);

        if (insertErr) {
            console.error("Failed to insert sessions:", insertErr);
        } else {
            console.log('Successfully injected two sessions for today!');
        }
    } else {
        console.log('Could not find therapist or client to attach to.');
    }
}

inject();
