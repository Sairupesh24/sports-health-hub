const { db } = require('../server/db.js');

async function main() {
    try {
        // Get org_id from profiles table
        const orgRes = await db.query(`SELECT organization_id FROM profiles WHERE id = '66473641-8dc7-490b-8be2-d857737d49a4'`);
        const orgId = orgRes.rows[0]?.organization_id;
        console.log('Organization ID:', orgId);

        if (!orgId) {
            // Try sessions directly
            const orgRes2 = await db.query(`SELECT DISTINCT organization_id FROM sessions LIMIT 1`);
            console.log('Org from sessions:', orgRes2.rows[0]?.organization_id);
        }

        const testOrgId = orgId || (await db.query(`SELECT DISTINCT organization_id FROM sessions LIMIT 1`)).rows[0]?.organization_id;

        console.log('\n=== specialist_id query for Rahul K (this week: June 15-22) ===');
        const res1 = await db.query(
            `SELECT s.id, s.scheduled_start, s.status, s.service_type,
                    c.first_name || ' ' || c.last_name as client_name
             FROM sessions s
             LEFT JOIN clients c ON s.client_id = c.id
             WHERE s.organization_id = $1
               AND (s.therapist_id = $2 OR s.scientist_id = $2)
               AND s.scheduled_start >= '2026-06-15T00:00:00.000Z'
               AND s.scheduled_start <= '2026-06-22T00:00:00.000Z'
             ORDER BY s.scheduled_start ASC`,
            [testOrgId, '66473641-8dc7-490b-8be2-d857737d49a4']
        );
        console.log(`Found ${res1.rows.length} sessions for Rahul this week:`);
        res1.rows.forEach(r => console.log(`  ✓ ${r.scheduled_start} | ${r.status} | ${r.service_type} | ${r.client_name}`));

        console.log('\n=== specialist_id query for Rahul K (full month: June) ===');
        const res3 = await db.query(
            `SELECT s.id, s.scheduled_start, s.status, s.service_type,
                    c.first_name || ' ' || c.last_name as client_name
             FROM sessions s
             LEFT JOIN clients c ON s.client_id = c.id
             WHERE s.organization_id = $1
               AND (s.therapist_id = $2 OR s.scientist_id = $2)
               AND s.scheduled_start >= '2026-06-01T00:00:00.000Z'
               AND s.scheduled_start <= '2026-06-30T00:00:00.000Z'
             ORDER BY s.scheduled_start ASC`,
            [testOrgId, '66473641-8dc7-490b-8be2-d857737d49a4']
        );
        console.log(`Found ${res3.rows.length} sessions for Rahul this month:`);
        res3.rows.forEach(r => console.log(`  ✓ ${r.scheduled_start} | ${r.status} | ${r.service_type} | ${r.client_name}`));

        console.log('\n✅ specialist_id query works correctly!');
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

main();
