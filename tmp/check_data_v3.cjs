const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const athleteId = '5845300c-2ebe-45cc-9a2f-080b64b54af3'; // Sai Kavuturi
    
    console.log("Checking for athlete:", athleteId);

    // 1. Check direct assignments
    const { data: direct } = await supabase
        .from('program_assignments')
        .select('*, program:training_programs(name)')
        .eq('athlete_id', athleteId);
    
    console.log("Direct Assignments:", JSON.stringify(direct, null, 2));

    // 2. Check batch memberships
    const { data: batches } = await supabase
        .from('batch_members')
        .select('batch_id');
    
    const userBatches = batches?.filter(b => b.athlete_id === athleteId) || [];
    console.log("User Batches (Filter):", JSON.stringify(userBatches, null, 2));
    
    // Check all batch members to see where Sai is
    const { data: members } = await supabase
        .from('batch_members')
        .select('*, athlete:profiles!athlete_id(first_name, last_name)');
    
    console.log("All Batch Members:", JSON.stringify(members, null, 2));

    // 3. Check assignments with batch_id
    const { data: batchAssignments } = await supabase
        .from('program_assignments')
        .select('*, program:training_programs(name)')
        .not('batch_id', 'is', null);
    
    console.log("All Batch Assignments:", JSON.stringify(batchAssignments, null, 2));
}

check();
