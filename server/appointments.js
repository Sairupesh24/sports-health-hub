import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET all sessions for an organization
router.get('/', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { start, end, therapist_id, scientist_id, client_id, status, is_unentitled } = req.query;

        let query = `
            SELECT s.*, 
                   json_build_object(
                       'id', c.id, 
                       'first_name', c.first_name, 
                       'last_name', c.last_name, 
                       'uhid', c.uhid, 
                       'is_vip', c.is_vip,
                       'mobile_no', c.mobile_no,
                       'email', c.email,
                       'sport', c.sport
                   ) as client,
                   json_build_object('first_name', p.first_name, 'last_name', p.last_name) as therapist,
                   (SELECT json_agg(psd.*) FROM physiosessiondetails psd WHERE psd.session_id = s.id) as physio_session_details,
                   json_build_object('name', st.name) as session_type
            FROM Sessions s
            JOIN Clients c ON s.client_id = c.id
            LEFT JOIN profiles p ON s.therapist_id = p.id
            LEFT JOIN Services st ON s.service_id = st.id
            WHERE s.organization_id = $1
        `;
        const params = [orgId];

        if (start) {
            query += ` AND s.scheduled_start >= $${params.length + 1}`;
            params.push(start);
        }
        if (end) {
            query += ` AND s.scheduled_start <= $${params.length + 1}`;
            params.push(end);
        }
        if (therapist_id) {
            query += ` AND s.therapist_id = $${params.length + 1}`;
            params.push(therapist_id);
        }
        if (scientist_id) {
            query += ` AND s.scientist_id = $${params.length + 1}`;
            params.push(scientist_id);
        }
        if (client_id) {
            query += ` AND s.client_id = $${params.length + 1}`;
            params.push(client_id);
        }
        if (status) {
            query += ` AND s.status = $${params.length + 1}`;
            params.push(status);
        }
        if (is_unentitled === 'true') {
            query += ` AND s.is_unentitled = true`;
        }

        query += ' ORDER BY s.scheduled_start ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new appointment (Session)
router.post('/', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const orgId = req.user.organization_id;
        const {
            client_id, therapist_id, service_id, service_type, scheduled_start, scheduled_end,
            entitlement_id, session_mode, is_unentitled, preference_type, is_flexible_routing
        } = req.body;

        await client.query('BEGIN');

        // 1. Check for overlapping sessions for this therapist
        const overlapRes = await client.query(`
            SELECT id FROM sessions 
            WHERE therapist_id = $1 
            AND status != 'Cancelled'
            AND (
                (scheduled_start <= $2 AND scheduled_end > $2) OR
                (scheduled_start < $3 AND scheduled_end >= $3) OR
                (scheduled_start >= $2 AND scheduled_end <= $3)
            )
        `, [therapist_id, scheduled_start, scheduled_end]);

        if (overlapRes.rows.length > 0) {
            throw new Error('Therapist is already booked for this time slot.');
        }

        // 2. Insert Session
        const insertQuery = `
            INSERT INTO sessions (
                organization_id, client_id, therapist_id, service_id, service_type, 
                scheduled_start, scheduled_end, entitlement_id, 
                session_mode, is_unentitled, preference_type, is_flexible_routing, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;
        const values = [
            orgId, client_id, therapist_id, service_id || null, service_type,
            scheduled_start, scheduled_end, entitlement_id || null,
            session_mode || 'Individual', is_unentitled || false, 
            preference_type || 'Strict', is_flexible_routing || false, req.user.id
        ];

        const sessionRes = await client.query(insertQuery, values);
        const session = sessionRes.rows[0];

        // 3. Update Entitlement if linked
        if (entitlement_id && !is_unentitled) {
            await client.query(
                'UPDATE cliententitlements SET sessions_used = sessions_used + 1 WHERE id = $1',
                [entitlement_id]
            );
        }

        await client.query('COMMIT');
        res.json(session);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST complete session (marks as completed and handles entitlements)
router.post('/:id/complete', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const { actual_start, actual_end } = req.body;

        await client.query('BEGIN');

        // 1. Get session details
        const sessionRes = await client.query('SELECT * FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (sessionRes.rows.length === 0) throw new Error('Session not found');
        const session = sessionRes.rows[0];

        if (session.status === 'Completed') throw new Error('Session already completed');

        // 2. Try to find an entitlement if not already linked
        let entitlementId = session.entitlement_id;
        let isUnentitled = session.is_unentitled;

        if (!entitlementId && !isUnentitled) {
            const entRes = await client.query(`
                SELECT id FROM cliententitlements 
                WHERE client_id = $1 AND organization_id = $2 
                AND service_type = $3 AND status = 'active' AND (granted_sessions - sessions_used) > 0
                LIMIT 1
            `, [session.client_id, orgId, session.service_type]);
            
            if (entRes.rows.length > 0) {
                entitlementId = entRes.rows[0].id;
            } else {
                isUnentitled = true;
            }
        }

        // 3. Update session
        await client.query(`
            UPDATE sessions 
            SET status = 'Completed', actual_start = $1, actual_end = $2, 
                entitlement_id = $3, is_unentitled = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [actual_start, actual_end, entitlementId, isUnentitled, id]);

        // 4. Update entitlement usage
        if (entitlementId && !isUnentitled) {
            await client.query(
                'UPDATE cliententitlements SET sessions_used = sessions_used + 1 WHERE id = $1',
                [entitlementId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, is_unentitled: isUnentitled });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST reschedule session
router.post('/:id/reschedule', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { new_start, new_end } = req.body;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        // 1. Mark old session as Rescheduled
        await client.query(`
            UPDATE sessions SET status = 'Rescheduled', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND organization_id = $2
        `, [id, orgId]);

        // 2. Get old session data to clone
        const oldRes = await client.query('SELECT * FROM sessions WHERE id = $1', [id]);
        const old = oldRes.rows[0];

        // 3. Insert new Planned session
        const newRes = await client.query(`
            INSERT INTO sessions (
                organization_id, client_id, therapist_id, service_id, service_type,
                scheduled_start, scheduled_end, status, entitlement_id, is_unentitled, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            orgId, old.client_id, old.therapist_id, old.service_id, old.service_type,
            new_start, new_end, 'Planned', old.entitlement_id, old.is_unentitled, req.user.id
        ]);

        await client.query('COMMIT');
        res.json({ new_session_id: newRes.rows[0].id });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST reconcile session (links un-entitled session to a new package)
router.post('/:id/reconcile', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        const sessionRes = await client.query('SELECT * FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        const session = sessionRes.rows[0];

        if (!session.is_unentitled) throw new Error('Session is not marked as un-entitled');

        const entRes = await client.query(`
            SELECT id FROM cliententitlements 
            WHERE client_id = $1 AND organization_id = $2 
            AND service_type = $3 AND status = 'active' AND (granted_sessions - sessions_used) > 0
            LIMIT 1
        `, [session.client_id, orgId, session.service_type]);

        if (entRes.rows.length === 0) throw new Error('No active entitlement found for this service. Please purchase a package first.');

        const entitlementId = entRes.rows[0].id;

        await client.query(`
            UPDATE sessions 
            SET entitlement_id = $1, is_unentitled = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [entitlementId, id]);

        await client.query(
            'UPDATE cliententitlements SET sessions_used = sessions_used + 1 WHERE id = $1',
            [entitlementId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET client therapist availability
router.get('/client-therapist-availability', requireAuth, async (req, res) => {
    try {
        const { client_id, date } = req.query;
        const orgId = req.user.organization_id;
        
        // 1. Get client's assigned therapist
        const clientRes = await db.query('SELECT assigned_consultant_id FROM clients WHERE id = $1', [client_id]);
        const therapistId = clientRes.rows[0]?.assigned_consultant_id;
        
        if (!therapistId) {
            return res.json({ status: 'Unassigned', assigned_therapist: null, free_slots: [], alternate_therapists: [] });
        }
        
        // 2. Get therapist info
        const therapistRes = await db.query('SELECT id, first_name, last_name, profession FROM profiles WHERE id = $1', [therapistId]);
        const therapist = therapistRes.rows[0];
        
        // 3. Simple availability (Mocked for now, can be improved)
        res.json({
            status: 'Available',
            assigned_therapist: {
                id: therapist.id,
                name: `${therapist.first_name} ${therapist.last_name}`,
                profession: therapist.profession
            },
            free_slots: [
                { start: '09:00', end: '10:00' },
                { start: '11:00', end: '12:00' }
            ],
            alternate_therapists: []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Therapist Availability for a date
router.get('/availability', requireAuth, async (req, res) => {
    try {
        const { therapist_id, date } = req.query;
        if (!therapist_id || !date) return res.status(400).json({ error: 'therapist_id and date are required' });

        const dayOfWeek = new Date(date).getDay();

        // 1. Get standard availability
        const availRes = await db.query(
            'SELECT start_time, end_time FROM consultantavailability WHERE consultant_id = $1 AND day_of_week = $2',
            [therapist_id, dayOfWeek]
        );

        if (availRes.rows.length === 0) {
            return res.json({ status: 'Unavailable', slots: [] });
        }

        const { start_time, end_time } = availRes.rows[0];

        // 2. Check for exceptions (Leaves)
        const excRes = await db.query(
            'SELECT is_blocked, start_time as exc_start, end_time as exc_end FROM availabilityexceptions WHERE consultant_id = $1 AND exception_date = $2',
            [therapist_id, date]
        );

        if (excRes.rows.length > 0 && excRes.rows[0].is_blocked && !excRes.rows[0].exc_start) {
            return res.json({ status: 'On Leave', slots: [] });
        }

        // 3. Get booked sessions
        const bookedRes = await db.query(
            'SELECT scheduled_start, scheduled_end FROM sessions WHERE therapist_id = $1 AND status != $2 AND scheduled_start::date = $3',
            [therapist_id, 'Cancelled', date]
        );

        // Simple slot generation (30 min increments)
        const slots = [];
        let current = new Date(`${date}T${start_time}`);
        const end = new Date(`${date}T${end_time}`);

        while (current < end) {
            const slotEnd = new Date(current.getTime() + 30 * 60000);
            const isBooked = bookedRes.rows.some(b => {
                const bStart = new Date(b.scheduled_start);
                const bEnd = new Date(b.scheduled_end);
                return (current >= bStart && current < bEnd) || (slotEnd > bStart && slotEnd <= bEnd);
            });

            if (!isBooked) {
                slots.push({
                    slot_start: current.toTimeString().substring(0, 5),
                    slot_end: slotEnd.toTimeString().substring(0, 5)
                });
            }
            current = slotEnd;
        }

        res.json({ status: 'Available', slots });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET waitlist summary for organization
router.get('/waitlist', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { start, end, status } = req.query;

        let query = `
            SELECT w.*, 
                   json_build_object(
                       'id', c.id, 
                       'first_name', c.first_name, 
                       'last_name', c.last_name, 
                       'uhid', c.uhid, 
                       'is_vip', c.is_vip, 
                       'mobile_no', c.mobile_no
                   ) as client,
                   json_build_object('first_name', p.first_name, 'last_name', p.last_name) as therapist,
                   s.name as service_name
            FROM waitlist w
            LEFT JOIN clients c ON w.client_id = c.id
            LEFT JOIN profiles p ON w.therapist_id = p.id
            LEFT JOIN services s ON w.service_id = s.id
            WHERE w.organization_id = $1
        `;
        const params = [orgId];

        if (status) {
            query += ` AND w.status = $${params.length + 1}`;
            params.push(status);
        }
        if (start) {
            query += ` AND w.preferred_date >= $${params.length + 1}`;
            params.push(start);
        }
        if (end) {
            query += ` AND w.preferred_date <= $${params.length + 1}`;
            params.push(end);
        }

        query += ' ORDER BY w.created_at ASC';

        const result = await db.query(query, params);
        
        // Map to the nested format the frontend expects (or adjust frontend)
        const mapped = result.rows.map(row => ({
            ...row,
            client: {
                id: row.client_id,
                first_name: row.client_first_name,
                last_name: row.client_last_name,
                is_vip: row.client_is_vip,
                uhid: row.client_uhid,
                mobile_no: row.client_mobile_no
            },
            therapist: {
                first_name: row.therapist_first_name,
                last_name: row.therapist_last_name
            },
            service: {
                name: row.service_name
            }
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST add to waitlist
router.post('/waitlist', requireAuth, async (req, res) => {
    try {
        const { client_id, therapist_id, service_id, preferred_date, preferred_time_slot, preference_type } = req.body;
        const orgId = req.user.organization_id;

        const query = `
            INSERT INTO waitlist (
                organization_id, client_id, therapist_id, service_id, 
                preferred_date, preferred_time_slot, preference_type, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        const params = [
            orgId, client_id, therapist_id, service_id, 
            preferred_date, preferred_time_slot, preference_type, 'Waiting'
        ];

        const result = await db.query(query, params);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET bulk availability
router.get('/availability/bulk', requireAuth, async (req, res) => {
    try {
        const { consultant_ids, date } = req.query;
        if (!consultant_ids) return res.status(400).json({ error: 'consultant_ids is required' });

        const ids = consultant_ids.split(',');
        
        if (date) {
            const dayOfWeek = new Date(date).getDay();
            const query = `
                SELECT * FROM consultantavailability 
                WHERE consultant_id = ANY($1) AND day_of_week = $2
            `;
            const result = await db.query(query, [ids, dayOfWeek]);
            res.json(result.rows);
        } else {
            const query = `
                SELECT * FROM consultantavailability 
                WHERE consultant_id = ANY($1)
            `;
            const result = await db.query(query, [ids]);
            res.json(result.rows);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH session (generic update)
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const orgId = req.user.organization_id;

        const allowedColumns = ['status', 'service_id', 'service_type', 'cancellation_reason', 'actual_start', 'actual_end', 'session_notes'];
        const keys = Object.keys(updates).filter(k => allowedColumns.includes(k));
        
        if (keys.length === 0) return res.status(400).json({ error: 'No valid update fields' });
        
        const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        const values = keys.map(k => updates[k]);

        const result = await db.query(`
            UPDATE sessions SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND organization_id = $2
            RETURNING *
        `, [id, orgId, ...values]);

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update waitlist status
router.patch('/waitlist/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const orgId = req.user.organization_id;

        const result = await db.query(
            'UPDATE waitlist SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3 RETURNING *',
            [status, id, orgId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'waitlist entry not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST bulk update availability
router.post('/availability/bulk-update', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { consultant_id, schedules } = req.body;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        // 1. Delete existing for this consultant
        await client.query('DELETE FROM consultantavailability WHERE consultant_id = $1', [consultant_id]);

        // 2. Insert new
        if (schedules && schedules.length > 0) {
            for (const s of schedules) {
                await client.query(`
                    INSERT INTO consultantavailability (
                        organization_id, consultant_id, day_of_week, start_time, end_time, 
                        slot_duration_interval, buffer_time
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    orgId, consultant_id, s.day_of_week, s.start_time, s.end_time,
                    s.slot_duration_interval || null, s.buffer_time || 0
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET session types for organization
router.get('/session-types', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM sessiontypes WHERE organization_id = $1 ORDER BY name', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST session type
router.post('/session-types', requireAuth, async (req, res) => {
    try {
        const { name, category } = req.body;
        const orgId = req.user.organization_id;

        const result = await db.query(
            'INSERT INTO sessiontypes (organization_id, name, category) VALUES ($1, $2, $3) RETURNING *',
            [orgId, name, category || 'General']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE session type
router.delete('/session-types/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        await db.query('DELETE FROM sessiontypes WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH bulk update sessions
router.patch('/sessions/bulk-update', requireAuth, async (req, res) => {
    try {
        const { filters, updates } = req.body;
        const orgId = req.user.organization_id;
        
        if (!filters || !updates) return res.status(400).json({ error: 'Filters and updates are required' });
        
        const filterKeys = Object.keys(filters);
        const updateKeys = Object.keys(updates);
        
        if (filterKeys.length === 0 || updateKeys.length === 0) return res.status(400).json({ error: 'Empty filters or updates' });
        
        const setClause = updateKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const whereClause = filterKeys.map((k, i) => `${k} = $${i + updateKeys.length + 1}`).join(' AND ');
        
        const values = [...Object.values(updates), ...Object.values(filters), orgId];
        
        const query = `
            UPDATE sessions 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE ${whereClause} AND organization_id = $${values.length}
            RETURNING *
        `;
        
        const result = await db.query(query, values);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET session-types
router.get('/session-types', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM session_types WHERE organization_id = $1', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST session-types
router.post('/session-types', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { name, category } = req.body;
        const result = await db.query(
            'INSERT INTO session_types (organization_id, name, category) VALUES ($1, $2, $3) RETURNING *',
            [orgId, name, category]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST complete session
router.post('/:id/complete', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { actual_start, actual_end } = req.body;
        const userId = req.user.id;
        
        // Call complete_session RPC via direct query
        const result = await db.query('SELECT complete_session($1, $2)', [id, userId]);
        
        if (actual_start && actual_end) {
            await db.query(
                'UPDATE sessions SET actual_start = $1, actual_end = $2 WHERE id = $3',
                [actual_start, actual_end, id]
            );
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST reschedule session
router.post('/:id/reschedule', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { new_start, new_end } = req.body;
        
        // Call reschedule_session RPC via direct query
        const result = await db.query('SELECT reschedule_session($1, $2, $3)', [id, new_start, new_end]);
        res.json({ new_session_id: result.rows[0].reschedule_session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
