import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
});

const clientId = 'a5ba9385-757c-4647-b02b-ec44df42425f';
const orgId = 'd735732c-5951-45e6-bb16-7668b8a95925';

const pkgQuery = `
    SELECT 
        ce.service_type,
        ce.granted_sessions as total_granted,
        ce.sessions_used as total_used,
        (ce.granted_sessions - ce.sessions_used) as sessions_remaining,
        COALESCE(sp.name, 'Direct Purchase') as package_name
    FROM cliententitlements ce
    LEFT JOIN billitems bi ON ce.bill_item_id = bi.id
    LEFT JOIN servicepackages sp ON bi.package_id = sp.id
    WHERE ce.client_id = $1 AND ce.organization_id = $2 AND ce.status = 'active'
`;
const pkgResult = await pool.query(pkgQuery, [clientId, orgId]);
console.log("Package query result:", pkgResult.rows);

await pool.end();
