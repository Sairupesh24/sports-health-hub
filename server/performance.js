import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// Helper to resolve orgId reliably
async function resolveOrgId(req) {
  if (req.user?.organization_id) return req.user.organization_id;
  if (req.user?.id) {
    const p = await db.query('SELECT organization_id FROM profiles WHERE id = $1', [req.user.id]);
    if (p.rows[0]?.organization_id) return p.rows[0].organization_id;
  }
  const org = await db.query('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1');
  return org.rows[0]?.id || null;
}

// ─────────────────────────────────────────────────────────────
// 1. PROTOCOLS
// ─────────────────────────────────────────────────────────────

// GET /api/performance/protocols - List active sports protocols
router.get('/protocols', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const result = await db.query(`
      SELECT * FROM performance_protocols 
      WHERE org_id IS NULL OR org_id = $1 
      ORDER BY sport_name ASC, template_name ASC
    `, [orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[Performance] Error fetching protocols:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/performance/protocols/:slug - Fetch single protocol
router.get('/protocols/:slug', requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const orgId = await resolveOrgId(req);
    const result = await db.query(`
      SELECT * FROM performance_protocols 
      WHERE (slug = $1 OR id::text = $1) AND (org_id IS NULL OR org_id = $2)
      LIMIT 1
    `, [slug, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Performance] Error fetching protocol:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/performance/protocols - Create/Update protocol
router.post('/protocols', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const { sport_name, template_name, slug, sections_config } = req.body;

    if (!sport_name || !template_name || !slug) {
      return res.status(400).json({ error: 'Missing required protocol fields' });
    }

    const result = await db.query(`
      INSERT INTO performance_protocols (org_id, sport_name, template_name, slug, sections_config)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (slug) DO UPDATE
      SET sport_name = EXCLUDED.sport_name,
          template_name = EXCLUDED.template_name,
          sections_config = EXCLUDED.sections_config,
          updated_at = NOW()
      RETURNING *
    `, [orgId, sport_name, template_name, slug, JSON.stringify(sections_config || {})]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Performance] Error saving protocol:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. ATHLETES & BATCHES HELPERS
// ─────────────────────────────────────────────────────────────

// GET /api/performance/athletes - Search / List athletes with injury counts
router.get('/athletes', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const { q, sport, limit = 50 } = req.query;

    let query = `
      SELECT 
        c.id, 
        c.first_name, 
        c.last_name, 
        c.uhid, 
        c.gender, 
        c.dob, 
        c.age, 
        c.mobile_no, 
        c.sport, 
        c.athlete_type,
        c.org_name,
        COUNT(i.id) FILTER (WHERE i.status = 'Active' OR i.status = 'In Rehab') AS active_injuries_count
      FROM clients c
      LEFT JOIN injuries i ON i.client_id = c.id
      WHERE (c.organization_id = $1 OR c.organization_id IS NULL)
        AND c.deleted_at IS NULL
    `;
    const params = [orgId];

    if (sport && sport !== 'all') {
      params.push(sport);
      query += ` AND LOWER(c.sport) = LOWER($${params.length})`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      query += ` AND (
        c.first_name ILIKE $${params.length} 
        OR c.last_name ILIKE $${params.length} 
        OR c.uhid ILIKE $${params.length}
        OR c.mobile_no ILIKE $${params.length}
      )`;
    }

    query += `
      GROUP BY c.id
      ORDER BY c.first_name ASC, c.last_name ASC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit, 10));

    const result = await db.query(query, params);
    res.json(result.rows.map(r => ({
      ...r,
      full_name: `${r.first_name || ''} ${r.last_name || ''}`.trim()
    })));
  } catch (error) {
    console.error('[Performance] Error fetching athletes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/performance/athletes/:id - Single athlete demographics + injuries
router.get('/athletes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const clientRes = await db.query(`
      SELECT id, first_name, last_name, uhid, gender, dob, age, mobile_no, sport, athlete_type, org_name, email
      FROM clients
      WHERE id = $1 AND deleted_at IS NULL
    `, [id]);

    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const athlete = clientRes.rows[0];
    athlete.full_name = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim();

    // Fetch injury history
    const injuriesRes = await db.query(`
      SELECT id, diagnosis, injury_type, region, side, status, injury_date, notes
      FROM injuries
      WHERE client_id = $1
      ORDER BY injury_date DESC NULLS LAST
    `, [id]);
    athlete.injuries = injuriesRes.rows;

    // Fetch latest assessment summary
    const lastAssessmentRes = await db.query(`
      SELECT id, assessment_date, protocol_id, biomotor_ratings
      FROM performance_assessments
      WHERE athlete_id = $1
      ORDER BY assessment_date DESC, created_at DESC
      LIMIT 1
    `, [id]);
    athlete.last_assessment = lastAssessmentRes.rows[0] || null;

    res.json(athlete);
  } catch (error) {
    console.error('[Performance] Error fetching athlete profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/performance/batches - Unique squads / batches with client groups
router.get('/batches', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);

    // 1. Fetch client groups created by Sports Scientists in Manage Groups
    let clientGroups = [];
    try {
      const cgRes = await db.query(`
        SELECT cg.id, cg.name, count(cgm.client_id)::int as member_count
        FROM client_groups cg
        LEFT JOIN client_group_members cgm ON cgm.group_id = cg.id
        WHERE ($1::uuid IS NULL OR cg.organization_id = $1 OR cg.organization_id IS NULL)
        GROUP BY cg.id, cg.name
        ORDER BY cg.name ASC
      `, [orgId]);
      clientGroups = cgRes.rows;
    } catch (e) {
      console.error('[Performance] Error fetching client_groups:', e);
    }

    // 2. Fetch distinct batch_or_squad from historical performance assessments
    const assessBatchesRes = await db.query(`
      SELECT DISTINCT batch_or_squad 
      FROM performance_assessments 
      WHERE ($1::uuid IS NULL OR org_id = $1 OR organization_id = $1) 
        AND batch_or_squad IS NOT NULL AND batch_or_squad <> ''
      ORDER BY batch_or_squad ASC
    `, [orgId]);

    const assessBatches = assessBatchesRes.rows.map(r => r.batch_or_squad);
    const groupNames = clientGroups.map(cg => cg.name);

    if (req.query.detailed === 'true') {
      return res.json({
        client_groups: clientGroups,
        assessment_batches: assessBatches,
        all_batches: Array.from(new Set([...groupNames, ...assessBatches])).filter(Boolean)
      });
    }

    const combined = Array.from(new Set([
      ...groupNames,
      ...assessBatches
    ])).filter(Boolean);

    res.json(combined);
  } catch (error) {
    console.error('[Performance] Error fetching batches:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. ASSESSMENTS (INDIVIDUAL & LIST)
// ─────────────────────────────────────────────────────────────

// GET /api/performance/assessments - Chronological list with filters
router.get('/assessments', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const { athlete_id, sport, protocol_id, batch_or_squad, status, limit = 50 } = req.query;

    let query = `
      SELECT 
        pa.id,
        pa.org_id,
        pa.organization_id,
        pa.athlete_id,
        pa.assessor_id,
        pa.protocol_id,
        pa.assessment_date,
        pa.batch_or_squad,
        pa.status,
        pa.overall_impression,
        pa.biomotor_ratings,
        pa.created_at,
        pa.updated_at,
        c.first_name AS athlete_first_name,
        c.last_name AS athlete_last_name,
        c.uhid AS athlete_uhid,
        c.gender AS athlete_gender,
        c.sport AS athlete_sport,
        p.sport_name,
        p.template_name,
        p.slug AS protocol_slug,
        u.first_name AS assessor_first_name,
        u.last_name AS assessor_last_name
      FROM performance_assessments pa
      JOIN clients c ON c.id = pa.athlete_id
      LEFT JOIN performance_protocols p ON p.id = pa.protocol_id
      LEFT JOIN profiles u ON u.id = pa.assessor_id
      WHERE (pa.org_id = $1 OR pa.organization_id = $1 OR pa.org_id IS NULL)
    `;
    const params = [orgId];

    if (athlete_id) {
      params.push(athlete_id);
      query += ` AND pa.athlete_id = $${params.length}`;
    }

    if (protocol_id) {
      params.push(protocol_id);
      query += ` AND pa.protocol_id = $${params.length}`;
    }

    if (sport && sport !== 'all') {
      params.push(sport);
      query += ` AND (LOWER(p.sport_name) = LOWER($${params.length}) OR LOWER(c.sport) = LOWER($${params.length}))`;
    }

    if (batch_or_squad) {
      params.push(batch_or_squad);
      query += ` AND pa.batch_or_squad = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND pa.status = $${params.length}`;
    }

    query += `
      ORDER BY pa.assessment_date DESC, pa.created_at DESC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit, 10));

    const result = await db.query(query, params);
    res.json(result.rows.map(r => ({
      ...r,
      athlete_name: `${r.athlete_first_name || ''} ${r.athlete_last_name || ''}`.trim(),
      assessor_name: r.assessor_first_name ? `${r.assessor_first_name} ${r.assessor_last_name || ''}`.trim() : 'Staff Assessor'
    })));
  } catch (error) {
    console.error('[Performance] Error fetching assessments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/performance/assessments/:id - Full detailed payload
router.get('/assessments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = await resolveOrgId(req);

    const result = await db.query(`
      SELECT 
        pa.*,
        c.first_name AS athlete_first_name,
        c.last_name AS athlete_last_name,
        c.uhid AS athlete_uhid,
        c.gender AS athlete_gender,
        c.dob AS athlete_dob,
        c.age AS athlete_age,
        c.mobile_no AS athlete_mobile_no,
        c.sport AS athlete_sport,
        c.athlete_type AS athlete_type,
        c.org_name AS athlete_org_name,
        p.sport_name,
        p.template_name,
        p.slug AS protocol_slug,
        p.sections_config,
        u.first_name AS assessor_first_name,
        u.last_name AS assessor_last_name
      FROM performance_assessments pa
      JOIN clients c ON c.id = pa.athlete_id
      LEFT JOIN performance_protocols p ON p.id = pa.protocol_id
      LEFT JOIN profiles u ON u.id = pa.assessor_id
      WHERE pa.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = result.rows[0];
    assessment.athlete_name = `${assessment.athlete_first_name || ''} ${assessment.athlete_last_name || ''}`.trim();
    assessment.assessor_name = assessment.assessor_first_name ? `${assessment.assessor_first_name} ${assessment.assessor_last_name || ''}`.trim() : 'Staff Assessor';

    // Fetch athlete active injuries
    const injuries = await db.query(`
      SELECT diagnosis, injury_type, region, side, status, injury_date
      FROM injuries
      WHERE client_id = $1
      ORDER BY injury_date DESC NULLS LAST
    `, [assessment.athlete_id]);
    assessment.athlete_injuries = injuries.rows;

    res.json(assessment);
  } catch (error) {
    console.error('[Performance] Error fetching single assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/performance/assessments - Create individual assessment
router.post('/assessments', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const userId = req.user?.id;

    const {
      athlete_id,
      protocol_id,
      assessment_date = new Date().toISOString().split('T')[0],
      batch_or_squad,
      needs_analysis = {},
      anthropometrics = {},
      fms_data = {},
      stability_data = {},
      power_speed_data = {},
      agility_data = {},
      endurance_data = {},
      anaerobic_data = {},
      aerobic_data = {},
      biomotor_ratings = {},
      corrective_plan = '',
      plan_of_action = '',
      overall_impression = '',
      status = 'completed'
    } = req.body;

    if (!athlete_id) {
      return res.status(400).json({ error: 'athlete_id is required' });
    }

    const insertSql = `
      INSERT INTO performance_assessments (
        org_id,
        organization_id,
        athlete_id,
        assessor_id,
        protocol_id,
        assessment_date,
        batch_or_squad,
        needs_analysis,
        anthropometrics,
        fms_data,
        stability_data,
        power_speed_data,
        agility_data,
        endurance_data,
        anaerobic_data,
        aerobic_data,
        biomotor_ratings,
        corrective_plan,
        plan_of_action,
        overall_impression,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      orgId,
      athlete_id,
      userId,
      protocol_id || null,
      assessment_date,
      batch_or_squad || null,
      JSON.stringify(needs_analysis),
      JSON.stringify(anthropometrics),
      JSON.stringify(fms_data),
      JSON.stringify(stability_data),
      JSON.stringify(power_speed_data),
      JSON.stringify(agility_data),
      JSON.stringify(endurance_data),
      JSON.stringify(anaerobic_data),
      JSON.stringify(aerobic_data),
      JSON.stringify(biomotor_ratings),
      corrective_plan,
      plan_of_action,
      overall_impression,
      status
    ];

    const result = await db.query(insertSql, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Performance] Error creating assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/performance/assessments/:id - Update assessment with same-day lock policy
router.put('/assessments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = await resolveOrgId(req);
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check existing assessment
    const existingRes = await db.query(`
      SELECT id, assessor_id, assessment_date, status, created_at 
      FROM performance_assessments 
      WHERE id = $1
    `, [id]);

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const existing = existingRes.rows[0];
    const isPrivileged = ['admin', 'super_admin', 'manager'].includes(userRole);
    const isOwner = existing.assessor_id === userId;

    // Same-day edit lock policy:
    // If status is 'completed' and assessment_date was before today, only privileged roles can edit.
    const formatLocalDate = (dt) => {
      if (!dt) return '';
      if (typeof dt === 'string') return dt.split('T')[0];
      const d = new Date(dt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const today = formatLocalDate(new Date());
    const assessmentDateStr = formatLocalDate(existing.assessment_date);

    const isPastCompleted = existing.status === 'completed' && assessmentDateStr < today;

    if (isPastCompleted && !isPrivileged) {
      return res.status(403).json({
        error: 'Assessment is locked. Historical finalized assessments can only be edited by Clinical Admins.'
      });
    }

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({
        error: 'Unauthorized: You do not have permission to edit this assessment.'
      });
    }

    const {
      protocol_id,
      assessment_date,
      batch_or_squad,
      needs_analysis,
      anthropometrics,
      fms_data,
      stability_data,
      power_speed_data,
      agility_data,
      endurance_data,
      anaerobic_data,
      aerobic_data,
      biomotor_ratings,
      corrective_plan,
      plan_of_action,
      overall_impression,
      status
    } = req.body;

    const updateSql = `
      UPDATE performance_assessments
      SET protocol_id = COALESCE($1, protocol_id),
          assessment_date = COALESCE($2, assessment_date),
          batch_or_squad = COALESCE($3, batch_or_squad),
          needs_analysis = COALESCE($4, needs_analysis),
          anthropometrics = COALESCE($5, anthropometrics),
          fms_data = COALESCE($6, fms_data),
          stability_data = COALESCE($7, stability_data),
          power_speed_data = COALESCE($8, power_speed_data),
          agility_data = COALESCE($9, agility_data),
          endurance_data = COALESCE($10, endurance_data),
          anaerobic_data = COALESCE($11, anaerobic_data),
          aerobic_data = COALESCE($12, aerobic_data),
          biomotor_ratings = COALESCE($13, biomotor_ratings),
          corrective_plan = COALESCE($14, corrective_plan),
          plan_of_action = COALESCE($15, plan_of_action),
          overall_impression = COALESCE($16, overall_impression),
          status = COALESCE($17, status),
          updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      protocol_id !== undefined ? protocol_id : null,
      assessment_date !== undefined ? assessment_date : null,
      batch_or_squad !== undefined ? batch_or_squad : null,
      needs_analysis ? JSON.stringify(needs_analysis) : null,
      anthropometrics ? JSON.stringify(anthropometrics) : null,
      fms_data ? JSON.stringify(fms_data) : null,
      stability_data ? JSON.stringify(stability_data) : null,
      power_speed_data ? JSON.stringify(power_speed_data) : null,
      agility_data ? JSON.stringify(agility_data) : null,
      endurance_data ? JSON.stringify(endurance_data) : null,
      anaerobic_data ? JSON.stringify(anaerobic_data) : null,
      aerobic_data ? JSON.stringify(aerobic_data) : null,
      biomotor_ratings ? JSON.stringify(biomotor_ratings) : null,
      corrective_plan !== undefined ? corrective_plan : null,
      plan_of_action !== undefined ? plan_of_action : null,
      overall_impression !== undefined ? overall_impression : null,
      status !== undefined ? status : null,
      id
    ];

    const result = await db.query(updateSql, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Performance] Error updating assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/performance/assessments/:id
router.delete('/assessments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const existing = await db.query('SELECT assessor_id FROM performance_assessments WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const isPrivileged = ['admin', 'super_admin'].includes(userRole);
    const isOwner = existing.rows[0].assessor_id === userId;

    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete assessment' });
    }

    await db.query('DELETE FROM performance_assessments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (error) {
    console.error('[Performance] Error deleting assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. GROUP / STATION TESTING MATRIX (GRID LAYOUT)
// ─────────────────────────────────────────────────────────────

// GET /api/performance/batch-grid
// Query params: protocol_id, batch_name, date, station_key
router.get('/batch-grid', requireAuth, async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const { protocol_id, batch_name, date = new Date().toISOString().split('T')[0], station_key = 'all' } = req.query;

    // 1. Fetch relevant protocol
    let protocol = null;
    if (protocol_id) {
      const pRes = await db.query(`SELECT * FROM performance_protocols WHERE id::text = $1 OR slug = $1 LIMIT 1`, [protocol_id]);
      protocol = pRes.rows[0] || null;
    } else {
      const pRes = await db.query(`SELECT * FROM performance_protocols ORDER BY template_name ASC LIMIT 1`);
      protocol = pRes.rows[0] || null;
    }

    // 2. Resolve athletes: if batch_name is provided, find athletes with that batch or in client groups,
    // otherwise return all athletes for the org
    let athleteRows = [];

    if (batch_name && String(batch_name).trim()) {
      const cleanBatch = String(batch_name).trim();

      // A. Check if batch_name matches a Sports Scientist Client Group (client_groups)
      const groupAthletesRes = await db.query(`
        SELECT c.id, c.first_name, c.last_name, c.uhid, c.gender, c.dob, c.age, c.mobile_no, c.sport, c.athlete_type
        FROM clients c
        JOIN client_group_members cgm ON cgm.client_id = c.id
        JOIN client_groups cg ON cg.id = cgm.group_id
        WHERE (LOWER(cg.name) = LOWER($1) OR cg.id::text = $1)
          AND c.deleted_at IS NULL
        ORDER BY c.first_name ASC, c.last_name ASC
      `, [cleanBatch]);

      if (groupAthletesRes.rows.length > 0) {
        athleteRows = groupAthletesRes.rows.map(a => ({
          ...a,
          full_name: `${a.first_name || ''} ${a.last_name || ''}`.trim()
        }));
      } else {
        // B. Check if batch_name matches previous performance assessments with this batch_or_squad
        const batchAssessAthletesRes = await db.query(`
          SELECT DISTINCT c.id, c.first_name, c.last_name, c.uhid, c.gender, c.dob, c.age, c.mobile_no, c.sport, c.athlete_type
          FROM clients c
          JOIN performance_assessments pa ON pa.athlete_id = c.id
          WHERE LOWER(pa.batch_or_squad) = LOWER($1)
            AND c.deleted_at IS NULL
          ORDER BY c.first_name ASC, c.last_name ASC
        `, [cleanBatch]);

        if (batchAssessAthletesRes.rows.length > 0) {
          athleteRows = batchAssessAthletesRes.rows.map(a => ({
            ...a,
            full_name: `${a.first_name || ''} ${a.last_name || ''}`.trim()
          }));
        }
      }
    }

    // C. Fallback: if no specific group members found, query athletes matching sport and org
    if (athleteRows.length === 0) {
      let athletesSql = `
        SELECT id, first_name, last_name, uhid, gender, dob, age, mobile_no, sport, athlete_type
        FROM clients
        WHERE (organization_id = $1 OR organization_id IS NULL)
          AND deleted_at IS NULL
      `;
      const athleteParams = [orgId];

      if (protocol?.sport_name && protocol.sport_name !== 'General') {
        athleteParams.push(protocol.sport_name);
        athletesSql += ` AND (LOWER(sport) = LOWER($${athleteParams.length}) OR sport IS NULL)`;
      }

      athletesSql += ` ORDER BY first_name ASC, last_name ASC LIMIT 60`;
      const athletesRes = await db.query(athletesSql, athleteParams);
      athleteRows = athletesRes.rows.map(a => ({
        ...a,
        full_name: `${a.first_name || ''} ${a.last_name || ''}`.trim()
      }));
    }

    // 3. Fetch existing assessments for these athletes on this date + protocol
    const athleteIds = athleteRows.map(a => a.id);
    let cellRecords = [];
    if (athleteIds.length > 0) {
      const assessSql = `
        SELECT *
        FROM performance_assessments
        WHERE athlete_id = ANY($1::uuid[])
          AND assessment_date = $2
          ${protocol?.id ? `AND protocol_id = $3` : ''}
      `;
      const assessParams = [athleteIds, date];
      if (protocol?.id) assessParams.push(protocol.id);

      const assessRes = await db.query(assessSql, assessParams);
      cellRecords = assessRes.rows;
    }

    // Map assessments by athlete_id
    const assessmentMap = {};
    for (const record of cellRecords) {
      assessmentMap[record.athlete_id] = record;
    }

    res.json({
      protocol,
      date,
      batch_name,
      station_key,
      athletes: athleteRows.map(ath => ({
        athlete: ath,
        assessment: assessmentMap[ath.id] || null
      }))
    });
  } catch (error) {
    console.error('[Performance] Error loading batch-grid:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/performance/batch-grid/cells
// Body: { protocol_id, assessment_date, batch_name, updates: [ { athlete_id, category, field, value } ] }
router.put('/batch-grid/cells', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const orgId = await resolveOrgId(req);
    const userId = req.user?.id;
    const { protocol_id, assessment_date = new Date().toISOString().split('T')[0], batch_name, updates = [] } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array cannot be empty' });
    }

    await client.query('BEGIN');

    // Group updates by athlete_id
    const grouped = {};
    for (const item of updates) {
      const { athlete_id, category, field, value } = item;
      if (!athlete_id || !category || !field) continue;
      if (!grouped[athlete_id]) grouped[athlete_id] = {};
      if (!grouped[athlete_id][category]) grouped[athlete_id][category] = {};
      grouped[athlete_id][category][field] = value;
    }

    const updatedAssessments = [];

    for (const [athleteId, categoryMap] of Object.entries(grouped)) {
      // Find or insert record for (athlete_id, assessment_date, protocol_id)
      let rowRes = await client.query(`
        SELECT id, anthropometrics, fms_data, stability_data, power_speed_data, agility_data, endurance_data, anaerobic_data, aerobic_data
        FROM performance_assessments
        WHERE athlete_id = $1 AND assessment_date = $2 AND (protocol_id = $3 OR $3 IS NULL)
        LIMIT 1
      `, [athleteId, assessment_date, protocol_id || null]);

      let recordId;
      let curData = {
        anthropometrics: {},
        fms_data: {},
        stability_data: {},
        power_speed_data: {},
        agility_data: {},
        endurance_data: {},
        anaerobic_data: {},
        aerobic_data: {}
      };

      if (rowRes.rows.length === 0) {
        // Insert new draft assessment
        const insRes = await client.query(`
          INSERT INTO performance_assessments (
            org_id, organization_id, athlete_id, assessor_id, protocol_id, assessment_date, batch_or_squad, status
          ) VALUES ($1, $1, $2, $3, $4, $5, $6, 'draft')
          RETURNING id, anthropometrics, fms_data, stability_data, power_speed_data, agility_data, endurance_data, anaerobic_data, aerobic_data
        `, [orgId, athleteId, userId, protocol_id || null, assessment_date, batch_name || null]);
        recordId = insRes.rows[0].id;
        curData = insRes.rows[0];
      } else {
        recordId = rowRes.rows[0].id;
        curData = rowRes.rows[0];
      }

      // Merge new fields into respective categories
      const setClauses = [];
      const setVals = [];
      let paramIdx = 1;

      for (const [catKey, fields] of Object.entries(categoryMap)) {
        const dbColumn = catKey.endsWith('_data') ? catKey : `${catKey}_data`;
        const validCols = ['anthropometrics', 'fms_data', 'stability_data', 'power_speed_data', 'agility_data', 'endurance_data', 'anaerobic_data', 'aerobic_data'];
        
        const col = validCols.includes(catKey) ? catKey : (validCols.includes(dbColumn) ? dbColumn : null);
        if (!col) continue;

        const merged = {
          ...(typeof curData[col] === 'object' && curData[col] !== null ? curData[col] : {}),
          ...fields
        };

        setClauses.push(`${col} = $${paramIdx}`);
        setVals.push(JSON.stringify(merged));
        paramIdx++;
      }

      if (batch_name) {
        setClauses.push(`batch_or_squad = $${paramIdx}`);
        setVals.push(batch_name);
        paramIdx++;
      }

      setClauses.push(`updated_at = NOW()`);

      if (setClauses.length > 0) {
        setVals.push(recordId);
        const updateRes = await client.query(`
          UPDATE performance_assessments
          SET ${setClauses.join(', ')}
          WHERE id = $${paramIdx}
          RETURNING *
        `, setVals);
        updatedAssessments.push(updateRes.rows[0]);
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      updated_count: updatedAssessments.length,
      assessments: updatedAssessments
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Performance] Error updating batch-grid cells:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
