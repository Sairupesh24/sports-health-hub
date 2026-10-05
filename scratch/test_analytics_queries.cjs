const { db } = require('../server/db.js');

async function test() {
  const orgId = 'db204aab-4b8b-4dd2-a842-bc9f67002693';
  const startDate = new Date('2026-04-01T00:00:00Z');
  const endDate = new Date('2026-09-30T23:59:59Z');

  console.log('Testing queries for', startDate.toISOString(), 'to', endDate.toISOString());

  // 1. Total registrations in period
  const regRes = await db.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE occupation = 'Athlete' OR athlete_type IS NOT NULL) as athletes,
      COUNT(*) FILTER (WHERE (occupation != 'Athlete' OR occupation IS NULL) AND athlete_type IS NULL) as gen_pop,
      COUNT(DISTINCT org_name) FILTER (WHERE org_name IS NOT NULL AND org_name != '') as orgs_count
    FROM clients
    WHERE organization_id = $1
      AND registered_on >= $2
      AND registered_on <= $3
  `, [orgId, startDate, endDate]);
  console.log('Registrations summary:', regRes.rows[0]);

  // 2. Timeline aggregation
  const timelineRes = await db.query(`
    SELECT 
      DATE_TRUNC('month', registered_on) as bucket,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE occupation = 'Athlete' OR athlete_type IS NOT NULL) as athletes,
      COUNT(*) FILTER (WHERE (occupation != 'Athlete' OR occupation IS NULL) AND athlete_type IS NULL) as gen_pop
    FROM clients
    WHERE organization_id = $1
      AND registered_on >= $2
      AND registered_on <= $3
    GROUP BY bucket
    ORDER BY bucket ASC
  `, [orgId, startDate, endDate]);
  console.log('Timeline:', timelineRes.rows);

  // 3. Sports breakdown
  const sportsRes = await db.query(`
    SELECT sport, COUNT(*) as count
    FROM clients
    WHERE organization_id = $1
      AND registered_on >= $2
      AND registered_on <= $3
      AND sport IS NOT NULL
    GROUP BY sport
    ORDER BY count DESC
    LIMIT 10
  `, [orgId, startDate, endDate]);
  console.log('Sports:', sportsRes.rows);

  // 4. Age buckets
  const ageRes = await db.query(`
    SELECT 
      CASE 
        WHEN age < 18 THEN '< 18 (Youth)'
        WHEN age BETWEEN 18 AND 25 THEN '18-25 (Young Adult)'
        WHEN age BETWEEN 26 AND 40 THEN '26-40 (Active Prime)'
        WHEN age BETWEEN 41 AND 60 THEN '41-60 (Mid-Career)'
        WHEN age > 60 THEN '60+ (Senior)'
        ELSE 'Unspecified'
      END as age_group,
      COUNT(*) as count
    FROM clients
    WHERE organization_id = $1
      AND registered_on >= $2
      AND registered_on <= $3
    GROUP BY age_group
    ORDER BY count DESC
  `, [orgId, startDate, endDate]);
  console.log('Age groups:', ageRes.rows);

  // 5. Cross-sell query
  const crossSellRes = await db.query(`
    WITH client_services AS (
      SELECT 
        s.client_id,
        ARRAY_AGG(DISTINCT s.service_type) as services,
        COUNT(DISTINCT s.service_type) as service_count,
        COUNT(*) as total_sessions
      FROM sessions s
      WHERE s.organization_id = $1
        AND s.scheduled_start >= $2
        AND s.scheduled_start <= $3
        AND s.client_id IS NOT NULL
        AND s.status NOT IN ('Cancelled')
      GROUP BY s.client_id
    )
    SELECT 
      COUNT(*) as total_active_clients,
      COUNT(*) FILTER (WHERE service_count = 1) as single_service,
      COUNT(*) FILTER (WHERE service_count = 2) as dual_service,
      COUNT(*) FILTER (WHERE service_count >= 3) as multi_service,
      ROUND(AVG(total_sessions) FILTER (WHERE service_count = 1), 1) as avg_sessions_single,
      ROUND(AVG(total_sessions) FILTER (WHERE service_count > 1), 1) as avg_sessions_multi
    FROM client_services
  `, [orgId, startDate, endDate]);
  console.log('Cross-sell metrics:', crossSellRes.rows[0]);

  // 6. Organizations breakdown
  const orgsRes = await db.query(`
    SELECT 
      c.org_name,
      COUNT(DISTINCT c.id) as total_clients,
      COUNT(DISTINCT s.client_id) as active_clients_period,
      COUNT(s.id) as total_sessions,
      COUNT(DISTINCT c.id) FILTER (WHERE c.occupation = 'Athlete' OR c.athlete_type IS NOT NULL) as athletes_count,
      COUNT(DISTINCT c.id) FILTER (WHERE (c.occupation != 'Athlete' OR c.occupation IS NULL) AND c.athlete_type IS NULL) as gen_pop_count,
      MODE() WITHIN GROUP (ORDER BY s.service_type) as dominant_service
    FROM clients c
    LEFT JOIN sessions s ON s.client_id = c.id 
      AND s.scheduled_start >= $2 
      AND s.scheduled_start <= $3
      AND s.status NOT IN ('Cancelled')
    WHERE c.organization_id = $1
      AND c.org_name IS NOT NULL 
      AND c.org_name != ''
    GROUP BY c.org_name
    ORDER BY total_clients DESC
    LIMIT 15
  `, [orgId, startDate, endDate]);
  console.log('Organizations:', orgsRes.rows);

  process.exit();
}

test();
