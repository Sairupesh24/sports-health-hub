const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function seedEverything() {
    console.log('--- STARTING COMPLETE SEED ---');

    // 1. Create Organization
    console.log('Creating Organization...');
    const orgId = '00000000-0000-0000-0000-000000000001';
    await supabase.from('organizations').upsert({
        id: orgId,
        name: 'ISHPO Performance Lab',
        slug: 'ishpo-lab',
        status: 'active'
    });

    // 2. Create Location
    console.log('Creating Location...');
    await supabase.from('locations').upsert({
        organization_id: orgId,
        name: 'High-Performance Center'
    });

    // 3. Create Scientist and 5 Athletes
    const roles = ['sports_scientist', 'athlete', 'athlete', 'athlete', 'athlete', 'athlete'];
    const names = ['Dr. Smith', 'Alex', 'Jordan', 'Sam', 'Taylor', 'Casey'];
    const userIds = [];

    for (let i = 0; i < roles.length; i++) {
        const email = `test_${names[i].toLowerCase().replace(' ', '_')}@ishpo.com`;
        console.log(`Creating User: ${email}...`);
        
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email: email,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: { organization_id: orgId }
        });

        if (userError) {
            if (userError.message.includes('already registered')) {
                // Fetch existing?
                const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
                if (existing) userIds.push({ id: existing.id, role: roles[i] });
            } else {
                console.error(`- Failed to create ${email}:`, userError.message);
            }
        } else {
            const uid = userData.user.id;
            userIds.push({ id: uid, role: roles[i] });

            // Ensure Profile matches
            await supabase.from('profiles').upsert({
                id: uid,
                organization_id: orgId,
                first_name: names[i].split(' ')[0],
                last_name: names[i].split(' ')[1] || 'Athlete',
                ams_role: roles[i]
            });
            
            // Assign App Role
            await supabase.from('user_roles').upsert({
                user_id: uid,
                role: roles[i] === 'sports_scientist' ? 'admin' : 'client'
            });
        }
    }

    if (userIds.length === 0) {
        console.error('No users created/found. Aborting performance seed.');
        return;
    }

    const scientistId = userIds.find(u => u.role === 'sports_scientist')?.id || userIds[0].id;
    const athletes = userIds.filter(u => u.role === 'athlete');

    // 4. Seed Performance Data
    console.log(`Seeding performance data for ${athletes.length} athletes...`);
    const testTypes = [
        { category: 'Jump', name: 'CMJ', unit: 'cm', min: 30, max: 65 },
        { category: 'Jump', name: 'Broad Jump', unit: 'cm', min: 200, max: 280 },
        { category: 'Sprint', name: '30m Sprint', unit: 'sec', min: 4.0, max: 4.8 },
        { category: 'Strength', name: 'Back Squat 1RM', unit: 'kg', min: 80, max: 180 },
        { category: 'Mobility', name: 'FMS Score', unit: 'score', min: 14, max: 21 },
    ];

    const assessments = [];
    const now = new Date();

    for (const athlete of athletes) {
        for (let j = 0; j < 6; j++) {
            const recordedAt = new Date(now.getTime() - (j * 30 * 24 * 60 * 60 * 1000));
            for (const test of testTypes) {
                assessments.push({
                    athlete_id: athlete.id,
                    test_name: test.name,
                    category: test.category,
                    metrics: { value: parseFloat((Math.random() * (test.max - test.min) + test.min).toFixed(2)), unit: test.unit },
                    recorded_at: recordedAt.toISOString(),
                    recorded_by: scientistId
                });
            }
        }
    }

    console.log(`Inserting ${assessments.length} assessment records...`);
    const { error: insertError } = await supabase.from('performance_assessments').insert(assessments);

    if (insertError) {
        console.error('Failed to insert assessments:', insertError.message);
    } else {
        console.log('--- SEEDING COMPLETE ---');
    }
}

seedEverything();
