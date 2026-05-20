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
                   c.first_name, c.last_name, c.id as client_id_raw,
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
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'No previous notes found' });
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
            SELECT s.*, c.first_name, c.last_name, c.is_vip,
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

        // 1. Check if session details already exist
        const detailCheck = await client.query('SELECT id FROM PhysioSessionDetails WHERE session_id = $1', [id]);
        
        if (detailCheck.rows.length > 0) {
            // Update
            await client.query(`
                UPDATE PhysioSessionDetails SET
                    pain_score = $1, modality_used = $2, treatment_type = $3, manual_therapy = $4,
                    exercise_given = $5, range_of_motion = $6, strength_progress = $7, clinical_notes = $8,
                    next_plan = $9, soreness_data = $10, injury_id = $11, updated_at = NOW()
                WHERE session_id = $12
            `, [
                pain_score, modality_used, treatment_type, manual_therapy,
                exercise_given, range_of_motion, strength_progress, clinical_notes,
                next_plan, JSON.stringify(soreness_data), injury_id || null, id
            ]);
        } else {
            // Insert
            await client.query(`
                INSERT INTO PhysioSessionDetails (
                    session_id, pain_score, modality_used, treatment_type, manual_therapy,
                    exercise_given, range_of_motion, strength_progress, clinical_notes,
                    next_plan, soreness_data, injury_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                id, pain_score, modality_used, treatment_type, manual_therapy,
                exercise_given, range_of_motion, strength_progress, clinical_notes,
                next_plan, JSON.stringify(soreness_data), injury_id || null
            ]);
        }

        // 2. Update Session status
        await client.query(`
            UPDATE Sessions SET
                status = 'Completed',
                actual_start = COALESCE(actual_start, NOW()),
                actual_end = NOW(),
                service_id = $1,
                service_type = $2,
                updated_at = NOW()
            WHERE id = $3 AND organization_id = $4
        `, [service_id || null, service_type || 'Physiotherapy', id, orgId]);

        // 3. Deduct Entitlement (equivalent to complete_session RPC)
        const sessionResult = await client.query('SELECT * FROM Sessions WHERE id = $1', [id]);
        const session = sessionResult.rows[0];
        
        if (session && service_id) {
            // Logic to find active entitlement for this service and decrement
            const entRes = await client.query(`
                UPDATE ClientEntitlements 
                SET sessions_used = sessions_used + 1
                WHERE id = (
                    SELECT id FROM ClientEntitlements
                    WHERE client_id = $1 AND service_id = $2 AND status = 'active' AND sessions_used < granted_sessions
                    ORDER BY created_at ASC
                    LIMIT 1
                )
                RETURNING id
            `, [session.client_id, service_id]);
            
            if (entRes.rows.length === 0) {
                // Mark session as unentitled if no balance found
                await client.query('UPDATE Sessions SET is_unentitled = TRUE WHERE id = $1', [id]);
            }
        }

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

        const sessionRes = await client.query('SELECT * FROM Sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        const session = sessionRes.rows[0];
        if (!session) throw new Error('Session not found');

        // Logic to find new active entitlement and decrement
        const entRes = await client.query(`
            UPDATE ClientEntitlements 
            SET sessions_used = sessions_used + 1
            WHERE id = (
                SELECT id FROM ClientEntitlements
                WHERE client_id = $1 AND service_id = $2 AND status = 'active' AND sessions_used < granted_sessions
                ORDER BY created_at ASC
                LIMIT 1
            )
            RETURNING id
        `, [session.client_id, session.service_id]);

        if (entRes.rows.length > 0) {
            await client.query('UPDATE Sessions SET is_unentitled = FALSE WHERE id = $1', [id]);
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
        const result = await db.query('SELECT DISTINCT region FROM injury_master_data WHERE organization_id = $1 ORDER BY region', [orgId]);
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
        const result = await db.query('SELECT DISTINCT injury_type FROM injury_master_data WHERE organization_id = $1 AND region = $2 ORDER BY injury_type', [orgId, region]);
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
        const result = await db.query('SELECT DISTINCT diagnosis FROM injury_master_data WHERE organization_id = $1 AND region = $2 AND injury_type = $3 ORDER BY diagnosis', [orgId, region, type]);
        res.json(result.rows.map(r => r.diagnosis));
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
            FROM physio_session_details d
            JOIN sessions s ON d.session_id = s.id
            WHERE s.client_id = $1 AND s.organization_id = $2
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

export default router;
