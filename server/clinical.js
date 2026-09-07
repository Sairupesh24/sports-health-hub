import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET client injuries
router.get('/injuries', requireAuth, async (req, res) => {
    try {
        const { client_id, status } = req.query;
        const orgId = req.user.organization_id;
        
        let query = `
            SELECT i.*, 
                   c.first_name, c.middle_name, c.last_name, c.honorific, c.id as client_id_raw,
                   (SELECT row_to_json(rp_sub) FROM (SELECT * FROM rehab_progress WHERE injury_id = i.id ORDER BY created_at DESC LIMIT 1) rp_sub) as latest_rehab
            FROM Injuries i
            LEFT JOIN Clients c ON i.client_id = c.id
            WHERE i.organization_id = $1
        `;
        let params = [orgId];
        
        if (client_id) {
            query += ` AND i.client_id = $${params.length + 1}`;
            params.push(client_id);
        }

        if (status) {
            const statusList = status.split(',');
            const placeholders = statusList.map((_, i) => `$${params.length + i + 1}`).join(',');
            query += ` AND i.status IN (${placeholders})`;
            params.push(...statusList);
        }
        
        query += ' ORDER BY i.injury_date DESC';
        
        const result = await db.query(query, params);
        
        // Map to match frontend expectations if necessary
        const mapped = result.rows.map(row => ({
            ...row,
            client: {
                id: row.client_id_raw,
                first_name: row.first_name,
                last_name: row.last_name
            }
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST log injury
router.post('/injuries', requireAuth, async (req, res) => {
    try {
        const { client_id, diagnosis, injury_type, region, injury_date, status, side, onset, mechanism, notes } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            INSERT INTO Injuries (
                client_id, organization_id, diagnosis, injury_type, region, 
                injury_date, status, side, onset, mechanism, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            client_id, orgId, diagnosis, injury_type, region, 
            injury_date || new Date().toISOString(), status || 'Active', 
            side || null, onset || null, mechanism || null, notes || null
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update injury
router.patch('/injuries/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const updates = req.body;
        
        const keys = Object.keys(updates);
        if (keys.length === 0) return res.status(400).json({ error: 'No updates provided' });
        
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = Object.values(updates);
        values.push(id, orgId);
        
        const result = await db.query(`
            UPDATE Injuries SET ${setClause} 
            WHERE id = $${keys.length + 1} AND organization_id = $${keys.length + 2}
            RETURNING *
        `, values);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Injury not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/sessions/previous', requireAuth, async (req, res) => {
    try {
        const { client_id, before } = req.query;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT s.scheduled_start, psd.*
            FROM Sessions s
            JOIN PhysioSessionDetails psd ON s.id = psd.session_id
            WHERE s.client_id = $1 AND s.organization_id = $2 AND s.scheduled_start < $3
            ORDER BY s.scheduled_start DESC
            LIMIT 1
        `, [client_id, orgId, before || new Date().toISOString()]);
        
        if (result.rows.length === 0) return res.json(null);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET consultant dashboard stats
router.get('/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        // 1. Today's sessions
        const sessionsRes = await db.query(`
            SELECT s.*, c.first_name, c.middle_name, c.last_name, c.honorific, c.is_vip,
                   json_build_object('first_name', p.first_name, 'last_name', p.last_name) as therapist
            FROM Sessions s
            LEFT JOIN Clients c ON s.client_id = c.id
            LEFT JOIN Profiles p ON s.therapist_id = p.id
            WHERE s.therapist_id = $1 
            AND s.scheduled_start >= $2 
            AND s.scheduled_start <= $3
            ORDER BY s.scheduled_start ASC
        `, [userId, todayStart.toISOString(), todayEnd.toISOString()]);
        
        // 2. Waitlist count
        const waitlistRes = await db.query(`
            SELECT COUNT(*) FROM Waitlist 
            WHERE organization_id = $1 
            AND preferred_date = CURRENT_DATE 
            AND status = 'Waiting'
            AND (therapist_id = $2 OR therapist_id IS NULL)
        `, [orgId, userId]);
        
        // 3. Assigned clients count
        const clientsRes = await db.query(`
            SELECT COUNT(*) FROM Clients 
            WHERE assigned_consultant_id = $1
        `, [userId]);
        
        // 4. Monthly completed sessions
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthSessionsRes = await db.query(`
            SELECT COUNT(*) FROM Sessions 
            WHERE therapist_id = $1 
            AND scheduled_start >= $2 
            AND status = 'Completed'
        `, [userId, monthStart.toISOString()]);
        
        res.json({
            todaySessions: sessionsRes.rows,
            waitlistCount: parseInt(waitlistRes.rows[0].count),
            assignedClientsCount: parseInt(clientsRes.rows[0].count),
            monthSessionsCount: parseInt(monthSessionsRes.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET SOAP note for a session
router.get('/sessions/:id/soap', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT psd.*, 
                   s.status as session_status, s.client_id, s.service_id, s.service_type, s.entitlement_id, s.is_unentitled,
                   s.scheduled_start, s.created_at, s.actual_start,
                   p.first_name as therapist_first_name, p.last_name as therapist_last_name
            FROM physiosessiondetails psd
            JOIN sessions s ON psd.session_id = s.id
            LEFT JOIN profiles p ON COALESCE(s.therapist_id, s.scientist_id, s.created_by) = p.id
            WHERE psd.session_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'SOAP note not found' });
        }

        const row = result.rows[0];
        let sorenessData = row.soreness_data;
        if (typeof sorenessData === 'string') {
            try {
                sorenessData = JSON.parse(sorenessData);
            } catch (e) {}
        }
        res.json({
            ...row,
            soreness_data: sorenessData || {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sessions/:id/soap', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { 
            pain_score, modality_used, treatment_type, manual_therapy, 
            exercise_given, range_of_motion, strength_progress, clinical_notes, 
            next_plan, soreness_data, injury_id, service_id, service_type 
        } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;

        await client.query('BEGIN');

        // 1. Fetch Session first to ensure it exists and get details
        const sessionRes = await client.query('SELECT * FROM sessions WHERE id = $1', [id]);
        if (sessionRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Session not found' });
        }
        const session = sessionRes.rows[0];

        // Audit check: If session is already completed, lock if the session is from a past date
        if (session.status === 'Completed') {
            const sessionDate = new Date(session.scheduled_start || session.created_at);
            const now = new Date();
            const isSameDay = sessionDate.getFullYear() === now.getFullYear() &&
                              sessionDate.getMonth() === now.getMonth() &&
                              sessionDate.getDate() === now.getDate();
            const isPastDate = sessionDate < now && !isSameDay;

            const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);
            const isAdminOrFoe = userRoles.some(r => ['admin', 'super_admin', 'clinic_admin', 'foe'].includes(r));

            if (isPastDate && !isAdminOrFoe) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'This session is locked because the session date has passed. Edits are only permitted on the same date.' });
            }
        }

        const effectiveOrgId = session.organization_id || orgId;
        const effectiveServiceId = service_id || session.service_id || null;
        const effectiveServiceType = service_type || session.service_type || 'Physiotherapy';

        // 2. Safe stringification of soreness_data
        let serializedSoreness = '{}';
        if (typeof soreness_data === 'string') {
            serializedSoreness = soreness_data;
        } else if (soreness_data && typeof soreness_data === 'object') {
            serializedSoreness = JSON.stringify(soreness_data);
        }

        // 3. Upsert physiosessiondetails
        const detailCheck = await client.query('SELECT id FROM physiosessiondetails WHERE session_id = $1', [id]);
        
        if (detailCheck.rows.length > 0) {
            await client.query(`
                UPDATE physiosessiondetails SET
                    pain_score = $1, modality_used = $2, treatment_type = $3, manual_therapy = $4,
                    exercise_given = $5, range_of_motion = $6, strength_progress = $7, clinical_notes = $8,
                    next_plan = $9, soreness_data = $10, injury_id = $11, updated_at = NOW()
                WHERE session_id = $12
            `, [
                pain_score ?? 0, modality_used || null, treatment_type || null, manual_therapy || null,
                exercise_given || null, range_of_motion || null, strength_progress || null, clinical_notes || null,
                next_plan || null, serializedSoreness, injury_id || null, id
            ]);
        } else {
            await client.query(`
                INSERT INTO physiosessiondetails (
                    session_id, pain_score, modality_used, treatment_type, manual_therapy,
                    exercise_given, range_of_motion, strength_progress, clinical_notes,
                    next_plan, soreness_data, injury_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                id, pain_score ?? 0, modality_used || null, treatment_type || null, manual_therapy || null,
                exercise_given || null, range_of_motion || null, strength_progress || null, clinical_notes || null,
                next_plan || null, serializedSoreness, injury_id || null
            ]);
        }

        // 4. Deduct Entitlement if not already completed and not already linked
        let entitlementId = session.entitlement_id;
        let isUnentitled = session.is_unentitled;

        if (session.status !== 'Completed') {
            if (!entitlementId && !isUnentitled) {
                const entRes = await client.query(`
                    SELECT id FROM cliententitlements 
                    WHERE client_id = $1 AND (organization_id = $2 OR $2 IS NULL)
                    AND (
                        service_id = $3 
                        OR service_type = $4 
                        OR LOWER(service_type) = LOWER($4)
                        OR ($3 IS NULL AND $4 IS NULL)
                    )
                    AND status = 'active' AND (granted_sessions - sessions_used) > 0
                    ORDER BY created_at ASC
                    LIMIT 1
                `, [session.client_id, effectiveOrgId, effectiveServiceId, effectiveServiceType]);

                if (entRes.rows.length > 0) {
                    entitlementId = entRes.rows[0].id;
                    await client.query(`
                        UPDATE cliententitlements 
                        SET sessions_used = sessions_used + 1, updated_at = NOW()
                        WHERE id = $1
                    `, [entitlementId]);
                    isUnentitled = false;
                } else {
                    isUnentitled = true;
                }
            }
        }

        // 5. Update Session status to Completed
        await client.query(`
            UPDATE sessions SET
                status = 'Completed',
                actual_start = COALESCE(actual_start, NOW()),
                actual_end = NOW(),
                service_id = $1,
                service_type = $2,
                entitlement_id = $3,
                is_unentitled = $4,
                updated_at = NOW()
            WHERE id = $5
        `, [effectiveServiceId, effectiveServiceType, entitlementId || null, isUnentitled || false, id]);

        await client.query('COMMIT');
        res.json({ message: 'SOAP note saved and session completed' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST reconcile session
router.post('/sessions/:id/reconcile', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        const sessionRes = await client.query('SELECT * FROM Sessions WHERE id = $1 AND ($2::uuid IS NULL OR organization_id = $2)', [id, orgId]);
        const session = sessionRes.rows[0];
        if (!session) throw new Error('Session not found');

        const effectiveOrgId = session.organization_id || orgId;

        // Logic to find new active entitlement and decrement
        const entRes = await client.query(`
            UPDATE ClientEntitlements 
            SET sessions_used = sessions_used + 1, updated_at = NOW()
            WHERE id = (
                SELECT id FROM ClientEntitlements
                WHERE client_id = $1 
                  AND (organization_id = $2 OR $2 IS NULL)
                  AND (
                      service_id = $3 
                      OR service_type = $4 
                      OR LOWER(service_type) = LOWER($4)
                      OR ($3 IS NULL AND $4 IS NULL)
                  )
                  AND status = 'active' AND sessions_used < granted_sessions
                ORDER BY created_at ASC
                LIMIT 1
            )
            RETURNING id
        `, [session.client_id, effectiveOrgId, session.service_id, session.service_type]);

        if (entRes.rows.length > 0) {
            await client.query('UPDATE Sessions SET is_unentitled = FALSE, entitlement_id = $1, updated_at = NOW() WHERE id = $2', [entRes.rows[0].id, id]);
            await client.query('COMMIT');
            res.json({ message: 'Session reconciled successfully' });
        } else {
            throw new Error('No active entitlements found for reconciliation');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET client documents
router.get('/documents', requireAuth, async (req, res) => {
    try {
        const { client_id } = req.query;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT * FROM ClientDocuments 
            WHERE client_id = $1 AND organization_id = $2
            ORDER BY created_at DESC
        `, [client_id, orgId]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create document record
router.post('/documents', requireAuth, async (req, res) => {
    try {
        const { client_id, document_name, category, file_path, uploaded_by_role, notes } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        
        const result = await db.query(`
            INSERT INTO ClientDocuments (
                client_id, organization_id, document_name, category, 
                file_path, uploaded_by, uploaded_by_role, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            client_id, orgId, document_name, category, 
            file_path, userId, uploaded_by_role || 'Medical Staff', notes || null
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE document
router.delete('/documents/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        
        // Note: Real file deletion should be handled via a generic storage utility
        // For now, we delete the database record.
        await db.query('DELETE FROM ClientDocuments WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET body regions from master data
router.get('/master-data/regions', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(
            'SELECT DISTINCT region FROM injury_master_data WHERE organization_id = $1 OR organization_id IS NULL ORDER BY region',
            [orgId]
        );
        res.json(result.rows.map(r => r.region));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET injury types for a region
router.get('/master-data/types', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { region } = req.query;
        const result = await db.query(
            'SELECT DISTINCT injury_type FROM injury_master_data WHERE (organization_id = $1 OR organization_id IS NULL) AND region = $2 ORDER BY injury_type',
            [orgId, region]
        );
        res.json(result.rows.map(r => r.injury_type));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET diagnoses for a type and region
router.get('/master-data/diagnoses', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { region, type } = req.query;
        const result = await db.query(
            'SELECT DISTINCT diagnosis FROM injury_master_data WHERE (organization_id = $1 OR organization_id IS NULL) AND region = $2 AND injury_type = $3 ORDER BY diagnosis',
            [orgId, region, type]
        );
        res.json(result.rows.map(r => r.diagnosis));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET custom injury master data list for organization
router.get('/master-data/list', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(
            'SELECT id, region, injury_type, diagnosis FROM injury_master_data WHERE organization_id = $1 ORDER BY region ASC, injury_type ASC, diagnosis ASC',
            [orgId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE all custom injury master data for organization
router.delete('/master-data/clear', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        await db.query(
            'DELETE FROM injury_master_data WHERE organization_id = $1',
            [orgId]
        );
        res.json({ message: 'Custom injury master data cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST upload custom injury master data
router.post('/master-data/upload', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { items } = req.body;
        
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Items must be an array' });
        }
        
        let insertedCount = 0;
        for (const item of items) {
            const region = item.region?.trim();
            const injuryType = item.injury_type?.trim();
            const diagnosis = item.diagnosis?.trim();
            
            if (!region || !injuryType || !diagnosis) continue;
            
            // Check-Then-Insert pattern
            const check = await db.query(
                `SELECT id FROM injury_master_data 
                 WHERE organization_id = $1 
                   AND region = $2 
                   AND injury_type = $3 
                   AND diagnosis = $4`,
                [orgId, region, injuryType, diagnosis]
            );
            
            if (check.rows.length === 0) {
                await db.query(
                    `INSERT INTO injury_master_data (organization_id, region, injury_type, diagnosis) 
                     VALUES ($1, $2, $3, $4)`,
                    [orgId, region, injuryType, diagnosis]
                );
                insertedCount++;
            }
        }
        
        res.json({ success: true, count: insertedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET physio session details for return-to-play
router.get('/physio-session-details', requireAuth, async (req, res) => {
    try {
        const { athlete_id, start_date } = req.query;
        const orgId = req.user.organization_id;
        
        let query = `
            SELECT d.pain_score, s.scheduled_start
            FROM physiosessiondetails d
            JOIN sessions s ON d.session_id = s.id
            WHERE s.client_id = $1 AND ($2::uuid IS NULL OR s.organization_id = $2)
        `;
        const params = [athlete_id, orgId];
        
        if (start_date) {
            query += ' AND s.scheduled_start >= $3';
            params.push(start_date);
        }
        
        const result = await db.query(query, params);
        res.json(result.rows.map(r => ({
            pain_score: r.pain_score,
            sessions: { scheduled_start: r.scheduled_start }
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET latest subjective pain consultation report for a client
router.get('/clients/:clientId/latest-subjective-pain', requireAuth, async (req, res) => {
    try {
        const { clientId } = req.params;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            SELECT s.id as session_id, s.scheduled_start, s.service_type, 
                   psd.pain_score, psd.soreness_data, psd.clinical_notes,
                   p.first_name as therapist_first_name, p.last_name as therapist_last_name
            FROM Sessions s
            JOIN PhysioSessionDetails psd ON s.id = psd.session_id
            LEFT JOIN Profiles p ON COALESCE(s.therapist_id, s.scientist_id, s.created_by) = p.id
            WHERE s.client_id = $1 AND ($2::uuid IS NULL OR s.organization_id = $2)
              AND (
                  (psd.soreness_data IS NOT NULL AND psd.soreness_data::text != '{}' AND psd.soreness_data::text != 'null')
                  OR psd.pain_score IS NOT NULL
                  OR psd.clinical_notes IS NOT NULL
              )
            ORDER BY s.actual_end DESC NULLS LAST, s.scheduled_start DESC, s.created_at DESC
            LIMIT 1
        `, [clientId, orgId]);

        if (result.rows.length === 0) {
            return res.json({ found: false });
        }

        const row = result.rows[0];
        let sorenessData = row.soreness_data;
        if (typeof sorenessData === 'string') {
            try {
                sorenessData = JSON.parse(sorenessData);
            } catch (e) {
                // leave as is
            }
        }
        if (!sorenessData || typeof sorenessData !== 'object') {
            sorenessData = {};
        }
        if (row.pain_score !== null && row.pain_score !== undefined && sorenessData.maxPainScore === undefined) {
            sorenessData.maxPainScore = row.pain_score;
        }

        const therapistName = [row.therapist_first_name, row.therapist_last_name].filter(Boolean).join(' ') || 'Consultant';

        return res.json({
            found: true,
            sessionId: row.session_id,
            scheduledStart: row.scheduled_start,
            serviceType: row.service_type,
            therapistName,
            painScore: row.pain_score,
            sorenessData,
            clinicalNotes: row.clinical_notes,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET saved assessment reports for a client
router.get('/assessment-reports/client/:clientId', requireAuth, async (req, res) => {
    try {
        const { clientId } = req.params;
        const orgId = req.user.organization_id;
        
        const result = await db.query(
            'SELECT * FROM client_assessment_reports WHERE client_id = $1 AND organization_id = $2 ORDER BY created_at DESC',
            [clientId, orgId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST save a new assessment report
router.post('/assessment-reports', requireAuth, async (req, res) => {
    try {
        const { client_id, title, test_index, assessment_data, report_texts, pain_data, reassessment_date } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;

        if (!client_id || !title || test_index === undefined || !assessment_data || !report_texts || !pain_data) {
            return res.status(400).json({ error: 'Missing required report fields' });
        }

        const result = await db.query(`
            INSERT INTO client_assessment_reports (
                organization_id, client_id, title, test_index, 
                assessment_data, report_texts, pain_data, reassessment_date, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            orgId, client_id, title, test_index, 
            JSON.stringify(assessment_data), JSON.stringify(report_texts), 
            JSON.stringify(pain_data), reassessment_date || null, userId
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE a saved assessment report (Restricted to Admin / Super Admin role)
router.delete('/assessment-reports/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        
        // Role authorization check
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Forbidden: Only administrators can delete saved reports' });
        }

        const result = await db.query(
            'DELETE FROM client_assessment_reports WHERE id = $1 AND organization_id = $2 RETURNING id',
            [id, orgId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assessment report not found' });
        }

        res.json({ message: 'Assessment report successfully deleted', id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- NUTRITIONIST CONSOLE ENDPOINTS ---

// GET /api/clinical/nutrition/dashboard/stats
router.get('/nutrition/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const { startDate, endDate, search } = req.query;

        // 1. Fetch clients for this organization without arbitrary limit, supporting date range filters
        let query = `
            SELECT c.*,
                   (
                     SELECT row_to_json(na_sub) FROM (
                       SELECT * FROM nutrition_assessments 
                       WHERE client_id = c.id 
                       ORDER BY assessment_date DESC LIMIT 1
                     ) na_sub
                   ) as latest_assessment
            FROM clients c
            WHERE c.organization_id = $1
        `;
        let params = [orgId];

        if (startDate) {
            params.push(startDate);
            query += ` AND c.registered_on::date >= $${params.length}::date`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND c.registered_on::date <= $${params.length}::date`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (c.first_name ILIKE $${params.length} OR c.middle_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length} OR c.mobile_no ILIKE $${params.length})`;
        }

        query += ` ORDER BY c.registered_on DESC, c.created_at DESC`;

        const clientsRes = await db.query(query, params);

        const mappedClients = clientsRes.rows.map(row => {
            const latest = row.latest_assessment || {};
            const allergies = latest.allergies_intolerances || (row.allergies ? [row.allergies] : []);
            return {
                id: row.id,
                name: [row.honorific, row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
                uhid: row.uhid || 'N/A',
                sport_or_goal: row.sport || row.occupation || '--',
                preference: latest.dietary_preference || 'Not Set',
                last_assessment_date: latest.assessment_date ? new Date(latest.assessment_date).toISOString().split('T')[0] : null,
                next_follow_up: latest.assessment_date ? new Date(new Date(latest.assessment_date).getTime() + 14*24*60*60*1000).toISOString().split('T')[0] : null,
                client_type: latest.client_type || (row.sport ? 'athlete' : 'general'),
                allergies: Array.isArray(allergies) ? allergies : [],
                adherence_rate: latest.id ? 80 : 0,
                status: latest.id ? 'Active' : 'Pending Assessment'
            };
        });

        // 2. Fetch today's scheduled consultations & appointments (NUTRITION APPOINTMENTS ONLY)
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        const todaySessionsRes = await db.query(`
            SELECT s.id, s.scheduled_start, s.service_type, s.status,
                   c.id as client_id, c.first_name, c.middle_name, c.last_name, c.honorific, c.uhid, c.sport, c.occupation,
                   (
                     SELECT row_to_json(na_sub) FROM (
                       SELECT * FROM nutrition_assessments 
                       WHERE client_id = c.id 
                       ORDER BY assessment_date DESC LIMIT 1
                     ) na_sub
                   ) as latest_assessment
            FROM Sessions s
            JOIN Clients c ON s.client_id = c.id
            LEFT JOIN Profiles p ON s.therapist_id = p.id
            WHERE s.organization_id = $1 
              AND s.scheduled_start >= $2 
              AND s.scheduled_start <= $3
              AND (
                p.profession ILIKE '%nutrition%' OR 
                p.ams_role ILIKE '%nutrition%' OR 
                s.service_type ILIKE '%nutrition%' OR 
                s.service_type ILIKE '%diet%' OR 
                s.service_type ILIKE '%fueling%' OR 
                s.service_type ILIKE '%supplement%' OR 
                s.service_type ILIKE '%macro%' OR 
                s.service_type ILIKE '%weight%'
              )
            ORDER BY s.scheduled_start ASC
        `, [orgId, todayStart.toISOString(), todayEnd.toISOString()]);

        const todayAppointments = todaySessionsRes.rows.map(row => {
            const latest = row.latest_assessment || {};
            const allergies = latest.allergies_intolerances || (row.allergies ? [row.allergies] : []);
            return {
                id: row.id,
                scheduled_start: row.scheduled_start,
                service_type: row.service_type || 'Nutrition Consultation',
                status: row.status || 'Planned',
                client_id: row.client_id,
                client_name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
                uhid: row.uhid || 'N/A',
                sport_or_goal: row.sport || row.occupation || '--',
                preference: latest.dietary_preference || 'Not Set',
                allergies: Array.isArray(allergies) ? allergies : [],
                last_assessment_date: latest.assessment_date ? new Date(latest.assessment_date).toISOString().split('T')[0] : null,
            };
        });

        const scheduledCount = todayAppointments.length;

        // 3. Count critical alerts (clients with non-empty allergy tags)
        const criticalAlertsCount = mappedClients.filter(c => c.allergies && c.allergies.length > 0).length;

        // 4. Calculate real average adherence
        const assessedClients = mappedClients.filter(c => c.adherence_rate > 0);
        const avgAdherence = assessedClients.length > 0
            ? Math.round(assessedClients.reduce((acc, c) => acc + c.adherence_rate, 0) / assessedClients.length)
            : 0;

        // 5. Fetch most recently registered clients for this organization
        const recentRes = await db.query(`
            SELECT c.*,
                   (
                     SELECT row_to_json(na_sub) FROM (
                       SELECT * FROM nutrition_assessments 
                       WHERE client_id = c.id 
                       ORDER BY assessment_date DESC LIMIT 1
                     ) na_sub
                   ) as latest_assessment
            FROM clients c
            WHERE c.organization_id = $1
            ORDER BY c.registered_on DESC, c.created_at DESC
            LIMIT 15
        `, [orgId]);

        const recentRegistrations = recentRes.rows.map(row => {
            const latest = row.latest_assessment || {};
            const allergies = latest.allergies_intolerances || (row.allergies ? [row.allergies] : []);
            return {
                id: row.id,
                name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
                uhid: row.uhid || 'N/A',
                registered_on: row.registered_on || row.created_at || null,
                mobile_no: row.mobile_no || '--',
                email: row.email || '--',
                sport_or_goal: row.sport || row.occupation || '--',
                preference: latest.dietary_preference || 'Not Set',
                client_type: latest.client_type || (row.sport ? 'athlete' : 'general'),
                allergies: Array.isArray(allergies) ? allergies : []
            };
        });

        const latestRegisteredClient = recentRegistrations[0] || null;

        res.json({
            totalActiveDietClients: mappedClients.length,
            consultationsScheduledToday: scheduledCount,
            avgAdherenceRate: avgAdherence,
            criticalAlertsCount: criticalAlertsCount,
            todayAppointments: todayAppointments,
            latestRegisteredClient: latestRegisteredClient,
            recentRegistrations: recentRegistrations,
            clients: mappedClients
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/clinical/nutrition/schedule
router.post('/nutrition/schedule', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        const {
            client_id,
            service_type,
            scheduled_date,
            start_time,
            end_time,
            session_mode,
            session_notes
        } = req.body;

        if (!client_id || !scheduled_date || !start_time) {
            return res.status(400).json({ error: 'client_id, scheduled_date, and start_time are required' });
        }

        const scheduledStart = new Date(`${scheduled_date}T${start_time}:00`);
        const scheduledEnd = end_time 
            ? new Date(`${scheduled_date}T${end_time}:00`)
            : new Date(scheduledStart.getTime() + 30 * 60 * 1000);

        const result = await db.query(`
            INSERT INTO Sessions (
                organization_id, client_id, therapist_id, service_type,
                scheduled_start, scheduled_end, session_mode, session_notes,
                status, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
        `, [
            orgId,
            client_id,
            userId,
            service_type || 'Nutrition Consultation',
            scheduledStart.toISOString(),
            scheduledEnd.toISOString(),
            session_mode || 'In-Person',
            session_notes || '',
            'Planned',
            userId
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/clinical/nutrition/clients/:id
router.get('/nutrition/clients/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        // Fetch client basic details
        const clientRes = await db.query(
            'SELECT * FROM clients WHERE id = $1 AND organization_id = $2',
            [id, orgId]
        );

        if (clientRes.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const clientData = clientRes.rows[0];

        // Fetch all nutrition assessments for this client
        const assessmentsRes = await db.query(
            'SELECT * FROM nutrition_assessments WHERE client_id = $1 AND organization_id = $2 ORDER BY assessment_date DESC',
            [id, orgId]
        );

        const assessments = assessmentsRes.rows;
        const latestAssessment = assessments[0] || null;

        res.json({
            client: clientData,
            latestAssessment,
            assessments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/clinical/nutrition/assessments
router.get('/nutrition/assessments', requireAuth, async (req, res) => {
    try {
        const { client_id } = req.query;
        const orgId = req.user.organization_id;

        let query = `SELECT * FROM nutrition_assessments WHERE organization_id = $1`;
        let params = [orgId];

        if (client_id) {
            query += ` AND client_id = $2`;
            params.push(client_id);
        }

        query += ` ORDER BY assessment_date DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/clinical/nutrition/assessments
router.post('/nutrition/assessments', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const nutritionistId = req.user.id;
        const data = req.body;

        const result = await db.query(`
            INSERT INTO nutrition_assessments (
                organization_id, nutritionist_id, client_id, name, age, gender, profession,
                client_type, sport, position, training_age, competition_level,
                exercise, exercise_duration, training_sessions_count, exercise_type,
                height_cm, weight_kg, body_fat_pct, muscle_mass_kg, bmi,
                complaints, biochemical_interpretations, medical_history, other_medications,
                allergies_intolerances, dietary_preference, sleep_duration_hours, daily_fluid_intake_l,
                timeline_recall, session_1, session_2, supplements,
                observations, goal, advice_prescription, taken_by, assessment_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12,
                $13, $14, $15, $16,
                $17, $18, $19, $20, $21,
                $22, $23, $24, $25,
                $26, $27, $28, $29,
                $30, $31, $32, $33,
                $34, $35, $36, $37, $38
            )
            RETURNING *
        `, [
            orgId, nutritionistId, data.client_id || null, data.name, data.age || null, data.gender, data.profession,
            data.client_type || 'athlete', data.sport || null, data.position || null, data.training_age || null, data.competition_level || null,
            data.exercise ?? true, data.exercise_duration || null, data.training_sessions_count || null, data.exercise_type || null,
            data.height_cm || null, data.weight_kg || null, data.body_fat_pct || null, data.muscle_mass_kg || null, data.bmi || null,
            data.complaints || null, data.biochemical_interpretations || null, data.medical_history || null, data.other_medications || null,
            JSON.stringify(data.allergies_intolerances || []), data.dietary_preference || 'Non-Vegetarian',
            data.sleep_duration_hours || null, data.daily_fluid_intake_l || null,
            JSON.stringify(data.timeline_recall || {}), JSON.stringify(data.session_1 || {}), JSON.stringify(data.session_2 || {}),
            JSON.stringify(data.supplements || []),
            data.observations || null, data.goal || null, data.advice_prescription || null, data.taken_by || null,
            data.assessment_date || new Date().toISOString()
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
