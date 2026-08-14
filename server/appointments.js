import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET all sessions for an organization
router.get('/', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (orgId) {
            await autoCompleteStartedSessions(orgId);
        }
        const { start, end, therapist_id, therapist_ids, scientist_id, specialist_id, client_id, status, is_unentitled, category } = req.query;
        let query = `
            SELECT s.id, s.organization_id, s.client_id, s.scientist_id, s.entitlement_id, s.service_id, s.service_type, s.session_mode, s.scheduled_start, s.scheduled_end, s.actual_start, s.actual_end, s.status, s.cancellation_reason, s.is_unentitled, s.preference_type, s.is_flexible_routing, s.created_by, s.created_at, s.updated_at, s.group_name, s.session_location, s.session_notes, s.attachments, s.session_type_id,
                   COALESCE(s.therapist_id, s.scientist_id) as therapist_id,
                    CASE WHEN s.client_id IS NOT NULL THEN
                       json_build_object(
                           'id', c.id, 
                           'first_name', c.first_name, 
                           'last_name', c.last_name, 
                           'uhid', c.uhid, 
                           'is_vip', c.is_vip,
                           'mobile_no', c.mobile_no,
                           'email', c.email,
                           'sport', c.sport,
                           'outstanding_balance', COALESCE((
                               SELECT SUM(b.total - COALESCE((SELECT SUM(bp.amount) FROM billpayments bp WHERE bp.bill_id = b.id), 0))
                               FROM bills b
                               WHERE b.client_id = c.id AND b.status IN ('Pending', 'Partially Paid')
                           ), 0)
                       )
                   ELSE NULL END as client,
                   json_build_object('first_name', p.first_name, 'last_name', p.last_name) as therapist,
                   (SELECT json_agg(psd.*) FROM physiosessiondetails psd WHERE psd.session_id = s.id) as physio_session_details,
                   json_build_object('name', st.name) as session_type
            FROM Sessions s
            LEFT JOIN Clients c ON s.client_id = c.id
            LEFT JOIN profiles p ON COALESCE(s.therapist_id, s.scientist_id) = p.id
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
        // Filter by category (e.g. nutrition)
        if (category === 'nutrition') {
            query += ` AND (
                p.profession ILIKE '%nutrition%' OR 
                p.ams_role ILIKE '%nutrition%' OR 
                s.service_type ILIKE '%nutrition%' OR 
                s.service_type ILIKE '%diet%' OR 
                s.service_type ILIKE '%fueling%' OR 
                s.service_type ILIKE '%supplement%' OR 
                s.service_type ILIKE '%macro%' OR 
                s.service_type ILIKE '%weight%'
            )`;
        }
        // specialist_id: matches sessions where user is EITHER the therapist OR the scientist
        if (specialist_id) {
            query += ` AND (s.therapist_id = $${params.length + 1} OR s.scientist_id = $${params.length + 1})`;
            params.push(specialist_id);
        }
        if (therapist_ids) {
            const idsList = therapist_ids.split(',').filter(Boolean);
            if (idsList.length > 0) {
                query += ` AND (s.therapist_id = ANY($${params.length + 1}::uuid[]) OR s.scientist_id = ANY($${params.length + 1}::uuid[]))`;
                params.push(idsList);
            }
        } else if (therapist_id) {
            query += ` AND COALESCE(s.therapist_id, s.scientist_id) = $${params.length + 1}`;
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
        } else {
            query += ` AND LOWER(s.status) NOT IN ('cancelled', 'missed', 'rescheduled', 'deleted')`;
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
            entitlement_id, session_mode, is_unentitled, preference_type, is_flexible_routing, waitlist_id
        } = req.body;

        await client.query('BEGIN');

        // 1. Check capacity for this therapist
        const providerRes = await client.query('SELECT ams_role, profession FROM profiles WHERE id = $1', [therapist_id]);
        const provider = providerRes.rows.length > 0 ? providerRes.rows[0] : null;
        const profession = provider?.profession?.toLowerCase();
        const amsRole = provider?.ams_role?.toLowerCase();

        let capacityLimit = 1;
        if (profession === 'physiotherapist' || profession === 'physiotherapy' || profession === 'sports physician' || profession === 'physician' || profession === 'sports_physician') {
            capacityLimit = 2;
        } else if (profession === 'sports scientist' || amsRole === 'sports_scientist') {
            capacityLimit = 3;
        }

        const activeRes = await client.query(`
            SELECT id FROM sessions 
            WHERE (therapist_id = $1 OR scientist_id = $1)
            AND status != 'Cancelled'
            AND status != 'Waitlisted'
            AND (
                (scheduled_start <= $2 AND scheduled_end > $2) OR
                (scheduled_start < $3 AND scheduled_end >= $3) OR
                (scheduled_start >= $2 AND scheduled_end <= $3)
            )
        `, [therapist_id, scheduled_start, scheduled_end]);

        let appointmentStatus = 'Planned';
        if (activeRes.rows.length >= capacityLimit) {
            appointmentStatus = 'Waitlisted';
        }

        // 1.5 Check if client has outstanding dues
        const duesRes = await client.query(`
            SELECT COALESCE(SUM(total), 0) as total_dues
            FROM bills
            WHERE client_id = $1 AND organization_id = $2 AND status != 'Paid'
        `, [client_id, orgId]);
        const totalDues = parseFloat(duesRes.rows[0].total_dues || 0);

        if (totalDues > 0) {
            // Fetch client details
            const clientProfileRes = await client.query('SELECT p.first_name, p.last_name, c.is_vip FROM profiles p LEFT JOIN clients c ON p.id = c.id WHERE p.id = $1', [client_id]);
            const clientName = clientProfileRes.rows.length > 0 ? `${clientProfileRes.rows[0].first_name} ${clientProfileRes.rows[0].last_name}` : 'A client';
            const isVip = clientProfileRes.rows.length > 0 ? Boolean(clientProfileRes.rows[0].is_vip) : false;

            // Check if settings allow outstanding balance warning
            const settingsRes = await client.query(
                'SELECT enable_in_app_notifications, notify_outstanding_balance FROM organization_notification_settings WHERE organization_id = $1',
                [orgId]
            );
            const shouldNotify = settingsRes.rows.length > 0
                ? (settingsRes.rows[0].enable_in_app_notifications && settingsRes.rows[0].notify_outstanding_balance)
                : true;

            if (shouldNotify) {
                // Log warning notification
                await client.query(`
                    INSERT INTO notifications (
                        organization_id, title, content, type, target_role, category, action_payload, action_status, is_vip, sender_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    orgId,
                    'Outstanding Balance Warning',
                    `Booking attempt with outstanding balance (₹${totalDues}) for client ${clientName}.`,
                    'amber',
                    'admin',
                    'direct_action',
                    JSON.stringify({ client_id, totalDues }),
                    'pending',
                    isVip,
                    req.user.id
                ]);
            }
        }

        // 2. Insert Session
        const insertQuery = `
            INSERT INTO sessions (
                organization_id, client_id, therapist_id, service_id, service_type, 
                scheduled_start, scheduled_end, entitlement_id, 
                session_mode, is_unentitled, preference_type, is_flexible_routing, created_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const values = [
            orgId, client_id, therapist_id, service_id || null, service_type,
            scheduled_start, scheduled_end, entitlement_id || null,
            session_mode || 'Individual', is_unentitled || false, 
            preference_type || 'Strict', is_flexible_routing || false, req.user.id,
            appointmentStatus
        ];

        const sessionRes = await client.query(insertQuery, values);
        const session = sessionRes.rows[0];

        // 3. Update Entitlement if linked or sync to waitlist table if capacity reached
        if (entitlement_id && !is_unentitled && appointmentStatus !== 'Waitlisted') {
            await client.query(
                'UPDATE cliententitlements SET sessions_used = sessions_used + 1 WHERE id = $1',
                [entitlement_id]
            );
        } else if (appointmentStatus === 'Waitlisted' && client_id) {
            const timeSlotStr = new Date(scheduled_start).toTimeString().substring(0, 5);
            await client.query(`
                INSERT INTO waitlist (
                    organization_id, client_id, therapist_id, service_id, 
                    preferred_date, preferred_time_slot, preference_type, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                orgId, client_id, therapist_id, service_id || null,
                scheduled_start, timeSlotStr, preference_type || 'Flexible', 'Waiting'
            ]);
        }

        // 4. If session is confirmed (Planned), update matching waitlist entry to 'Booked' so client is moved from waitlist to calendar
        if (appointmentStatus === 'Planned' && client_id) {
            if (waitlist_id) {
                await client.query(
                    `UPDATE waitlist SET status = 'Booked', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND organization_id = $2`,
                    [waitlist_id, orgId]
                );
            } else {
                await client.query(
                    `UPDATE waitlist SET status = 'Booked', updated_at = CURRENT_TIMESTAMP WHERE client_id = $1 AND organization_id = $2 AND status IN ('Waiting', 'Notified')`,
                    [client_id, orgId]
                );
            }
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

        // Verify session is not in the future
        const scheduledStart = new Date(session.scheduled_start);
        if (scheduledStart > new Date()) {
            throw new Error(`Future sessions cannot be completed.`);
        }

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

// Helper to check if user has admin privileges
async function checkIsAdmin(userId, userRole) {
    if (['admin', 'super_admin', 'clinic_admin', 'foe'].includes((userRole || '').toLowerCase())) return true;
    if (!userId) return false;
    try {
        const res = await db.query('SELECT ams_role, profession FROM profiles WHERE id = $1', [userId]);
        if (res.rows.length > 0) {
            const p = res.rows[0];
            const ams = (p.ams_role || p.profession || '').toLowerCase();
            return ['admin', 'super_admin', 'clinic_admin', 'foe'].includes(ams);
        }
    } catch (e) {
        console.error("Error in checkIsAdmin:", e);
    }
    return false;
}

// POST reschedule session
router.post('/:id/reschedule', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { new_start, new_end } = req.body;
        const orgId = req.user.organization_id;

        if (!new_start || !new_end) {
            return res.status(400).json({ error: 'Both new_start and new_end timestamps are required.' });
        }

        await client.query('BEGIN');

        // 1. Get old session data
        const oldRes = await client.query('SELECT * FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (oldRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Session not found' });
        }
        const old = oldRes.rows[0];

        // Check permission: Admin, assigned specialist, or specialist role
        const isAdmin = await checkIsAdmin(req.user.id, req.user.role);
        const isAssigned = old.scientist_id === req.user.id || old.therapist_id === req.user.id;
        const isSpecialistRole = ['sports_scientist', 'consultant'].includes((req.user.ams_role || req.user.role || '').toLowerCase());

        if (!isAdmin && !isAssigned && !isSpecialistRole) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Only authorized specialists or administrators can reschedule booked slots.' });
        }

        // 2. Check capacity for the target practitioner (Sports Scientists: max 3)
        const providerId = old.scientist_id || old.therapist_id || req.user.id;
        const providerRes = await client.query('SELECT ams_role, profession FROM profiles WHERE id = $1', [providerId]);
        const provider = providerRes.rows.length > 0 ? providerRes.rows[0] : null;
        const profession = (provider?.profession || '').toLowerCase();
        const amsRole = (provider?.ams_role || '').toLowerCase();

        let capacityLimit = 1;
        if (profession.includes('physio')) {
            capacityLimit = 2;
        } else if (profession.includes('scientist') || amsRole.includes('scientist')) {
            capacityLimit = 3;
        }

        const activeRes = await client.query(`
            SELECT id FROM sessions 
            WHERE (therapist_id = $1 OR scientist_id = $1)
            AND status NOT IN ('Cancelled', 'Waitlisted', 'Rescheduled')
            AND (
                (scheduled_start <= $2 AND scheduled_end > $2) OR
                (scheduled_start < $3 AND scheduled_end >= $3) OR
                (scheduled_start >= $2 AND scheduled_end <= $3)
            )
        `, [providerId, new_start, new_end]);

        let newStatus = 'Planned';
        if (activeRes.rows.length >= capacityLimit) {
            newStatus = 'Waitlisted';
        }
        // 3. Update session in place on the SAME record
        await client.query(`
            UPDATE sessions 
            SET scheduled_start = $1, 
                scheduled_end = $2, 
                status = $3, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $4 AND organization_id = $5
        `, [new_start, new_end, newStatus, id, orgId]);

        // 4. Write audit log entry for lineage tracking
        await client.query(`
            INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            orgId,
            'session',
            id,
            'RESCHEDULE',
            req.user.id,
            JSON.stringify({
                old_start: old.scheduled_start,
                old_end: old.scheduled_end,
                new_start,
                new_end,
                status: newStatus,
                capacity_limit: capacityLimit,
                active_count: activeRes.rows.length
            })
        ]);

        await client.query('COMMIT');

        // Notify client and specialist about the reschedule
        const specialistId = old.therapist_id || old.scientist_id;
        const newSessionDate = new Date(new_start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

        if (old.client_id) {
            await db.query(`
                INSERT INTO notifications (organization_id, title, content, type, target_user_id, category)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [orgId, 'Session Rescheduled', `Your session timing has been updated to ${newSessionDate}.`, 'blue', old.client_id, 'in_app']);
        }
        if (specialistId) {
            await db.query(`
                INSERT INTO notifications (organization_id, title, content, type, target_user_id, category)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [orgId, 'Session Rescheduled', `Session timing updated to ${newSessionDate}.`, 'blue', specialistId, 'in_app']);
        }

        res.json({ session_id: id, status: newStatus, new_start, new_end });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message || 'Failed to reschedule session' });
    } finally {
        client.release();
    }
});

// POST reschedule all future sessions (bulk series reschedule)
router.post('/:id/reschedule-future', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { new_start, new_end } = req.body;
        const orgId = req.user.organization_id;

        if (!new_start || !new_end) {
            return res.status(400).json({ error: 'Both new_start and new_end timestamps are required for series rescheduling.' });
        }

        await client.query('BEGIN');

        // 1. Get base session data
        const oldRes = await client.query('SELECT * FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (oldRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Base session not found' });
        }
        const old = oldRes.rows[0];

        // Authorization check: Admin, assigned specialist, specialist role, or self-rescheduling client
        const isAdmin = await checkIsAdmin(req.user.id, req.user.role);
        const isAssigned = old.scientist_id === req.user.id || old.therapist_id === req.user.id;
        const isSpecialistRole = ['sports_scientist', 'consultant', 'physiotherapist', 'nutritionist'].includes((req.user.ams_role || req.user.role || '').toLowerCase());
        const isSelfClient = old.client_id && (old.client_id === req.user.id || req.user.client_id === old.client_id);

        if (!isAdmin && !isAssigned && !isSpecialistRole && !isSelfClient) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Not authorized to reschedule future series sessions for this appointment.' });
        }

        // 2. Fetch all future active/planned sessions for this client starting on or after selected session
        const baseStart = new Date(old.scheduled_start);
        const targetDayOfWeek = baseStart.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, etc.

        const futureSessionsRes = await client.query(`
            SELECT * FROM sessions 
            WHERE organization_id = $1 
            AND client_id = $2
            AND scheduled_start >= $3
            AND LOWER(status) NOT IN ('completed', 'cancelled', 'deleted')
            ORDER BY scheduled_start ASC
        `, [orgId, old.client_id, old.scheduled_start]);

        // Filter to ONLY include sessions that fall on the SAME day of the week (e.g. all Mondays or all Tuesdays)
        const futureSessions = futureSessionsRes.rows.filter(s => {
            const d = new Date(s.scheduled_start);
            return d.getDay() === targetDayOfWeek;
        });

        if (futureSessions.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No upcoming future sessions found on this day of the week to reschedule.' });
        }

        const newStartObj = new Date(new_start);
        const newEndObj = new Date(new_end);
        const durationMs = newEndObj.getTime() - newStartObj.getTime();
        const newHours = newStartObj.getHours();
        const newMinutes = newStartObj.getMinutes();

        // Check provider capacity limit
        const providerId = old.scientist_id || old.therapist_id || req.user.id;
        const providerRes = await client.query('SELECT ams_role, profession FROM profiles WHERE id = $1', [providerId]);
        const provider = providerRes.rows.length > 0 ? providerRes.rows[0] : null;
        const profession = (provider?.profession || '').toLowerCase();
        const amsRole = (provider?.ams_role || '').toLowerCase();

        let capacityLimit = 1;
        if (profession.includes('physio')) {
            capacityLimit = 2;
        } else if (profession.includes('scientist') || amsRole.includes('scientist')) {
            capacityLimit = 3;
        }

        let confirmedCount = 0;
        let waitlistedCount = 0;
        const results = [];

        // 3. Process each future session on the same day of the week
        for (const fut of futureSessions) {
            let futNewStartObj;
            if (fut.id === old.id) {
                futNewStartObj = new Date(new_start);
            } else {
                futNewStartObj = new Date(fut.scheduled_start);
                futNewStartObj.setHours(newHours, newMinutes, 0, 0);
            }
            const futNewStart = futNewStartObj.toISOString();
            const futNewEnd = new Date(futNewStartObj.getTime() + durationMs).toISOString();

            // Capacity check for this target slot
            const activeRes = await client.query(`
                SELECT id FROM sessions 
                WHERE (therapist_id = $1 OR scientist_id = $1)
                AND id != $4
                AND LOWER(status) NOT IN ('cancelled', 'waitlisted', 'rescheduled', 'deleted')
                AND (
                    (scheduled_start <= $2 AND scheduled_end > $2) OR
                    (scheduled_start < $3 AND scheduled_end >= $3) OR
                    (scheduled_start >= $2 AND scheduled_end <= $3)
                )
            `, [providerId, futNewStart, futNewEnd, fut.id]);

            let newStatus = 'Planned';
            if (activeRes.rows.length >= capacityLimit) {
                newStatus = 'Waitlisted';
                waitlistedCount++;
            } else {
                confirmedCount++;
            }

            // Update session in place on the SAME record (no duplicate rows created)
            await client.query(`
                UPDATE sessions 
                SET scheduled_start = $1, 
                    scheduled_end = $2, 
                    status = $3, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $4 AND organization_id = $5
            `, [futNewStart, futNewEnd, newStatus, fut.id, orgId]);

            results.push({
                session_id: fut.id,
                new_start: futNewStart,
                new_end: futNewEnd,
                status: newStatus
            });
        }

        // 4. Audit Log for Bulk Rescheduling
        await client.query(`
            INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            orgId,
            'client_series',
            old.client_id,
            'BULK_SERIES_RESCHEDULE',
            req.user.id,
            JSON.stringify({
                base_session_id: id,
                rescheduled_count: results.length,
                confirmed_count: confirmedCount,
                waitlisted_count: waitlistedCount,
                results
            })
        ]);

        await client.query('COMMIT');
        res.json({
            success: true,
            rescheduled_count: results.length,
            confirmed_count: confirmedCount,
            waitlisted_count: waitlistedCount,
            sessions: results
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rescheduling future series sessions:', error);
        res.status(500).json({ error: error.message || 'Failed to reschedule future series sessions' });
    } finally {
        client.release();
    }
});

// POST reassign session to another consultant/staff member
router.post('/:id/reassign', requireAuth, async (req, res) => {
    const isAdmin = await checkIsAdmin(req.user.id, req.user.role);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Only administrators can reassign booked slots. Please contact your admin.' });
    }

    const client = await db.connect();
    try {
        const { id } = req.params;
        const { target_consultant_id, new_start, new_end } = req.body;
        const orgId = req.user.organization_id;

        if (!target_consultant_id || !new_start || !new_end) {
            return res.status(400).json({ error: 'Target consultant and new slot timing (new_start, new_end) are required.' });
        }

        await client.query('BEGIN');

        // 1. Validate the original session can be reassigned
        const checkRes = await client.query('SELECT * FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (checkRes.rows.length === 0) throw new Error('Original session not found.');
        const old = checkRes.rows[0];

        const blockedStatuses = ['Completed', 'Cancelled', 'Reassigned', 'Rescheduled'];
        if (blockedStatuses.includes(old.status)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Cannot reassign a session that is already '${old.status}'. Only Planned or Checked-In sessions can be reassigned.` });
        }

        // 2. Mark old session as Reassigned
        await client.query(`
            UPDATE sessions SET status = 'Reassigned', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND organization_id = $2
        `, [id, orgId]);

        // 3. Determine if target consultant is therapist or sports scientist
        const targetRes = await client.query('SELECT ams_role, profession FROM profiles WHERE id = $1', [target_consultant_id]);
        const targetProf = targetRes.rows.length > 0 ? targetRes.rows[0] : null;
        const profession = targetProf?.profession?.toLowerCase() || '';
        const amsRole = targetProf?.ams_role?.toLowerCase() || '';

        const isScientist = profession.includes('scientist') || amsRole.includes('scientist');
        const newTherapistId = isScientist ? null : target_consultant_id;
        const newScientistId = isScientist ? target_consultant_id : null;

        // 4. Insert new session for the target consultant
        const newRes = await client.query(`
            INSERT INTO sessions (
                organization_id, client_id, therapist_id, scientist_id, service_id, service_type, session_mode, session_notes,
                scheduled_start, scheduled_end, status, entitlement_id, is_unentitled, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            orgId, old.client_id, newTherapistId, newScientistId, old.service_id, old.service_type, old.session_mode || 'In-Person', old.session_notes || null,
            new_start, new_end, 'Planned', old.entitlement_id || null, old.is_unentitled || false, req.user.id
        ]);

        await client.query('COMMIT');

        // Notify the new specialist about the incoming session
        const reassignedDate = new Date(new_start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        await db.query(`
            INSERT INTO notifications (organization_id, title, content, type, target_user_id, category)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [orgId, 'Session Assigned to You', `A session has been reassigned to you on ${reassignedDate}.`, 'blue', target_consultant_id, 'in_app']);

        // Notify the old specialist that their session was reassigned
        const oldSpecialistId = old.therapist_id || old.scientist_id;
        if (oldSpecialistId && oldSpecialistId !== target_consultant_id) {
            await db.query(`
                INSERT INTO notifications (organization_id, title, content, type, target_user_id, category)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [orgId, 'Session Reassigned', `A session you were assigned on ${reassignedDate} has been reassigned to another specialist.`, 'amber', oldSpecialistId, 'in_app']);
        }

        res.json({ success: true, new_session_id: newRes.rows[0].id, message: 'Appointment reassigned successfully.' });
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
        
        if (!therapist) {
            return res.json({ status: 'Unassigned', assigned_therapist: null, free_slots: [], alternate_therapists: [] });
        }
        
        // 3. Get standard availability for the day of week
        const dayOfWeek = new Date(date).getDay();
        const availRes = await db.query(
            'SELECT start_time, end_time FROM consultantavailability WHERE consultant_id = $1 AND day_of_week = $2',
            [therapistId, dayOfWeek]
        );

        let status = 'Available';
        let freeSlots = [];

        if (availRes.rows.length === 0) {
            status = 'Unavailable';
        } else {
            const { start_time, end_time } = availRes.rows[0];

            // 4. Check for exceptions (Leaves)
            const excRes = await db.query(
                'SELECT is_blocked, start_time as exc_start, end_time as exc_end FROM availabilityexceptions WHERE consultant_id = $1 AND exception_date = $2',
                [therapistId, date]
            );

            if (excRes.rows.length > 0 && excRes.rows[0].is_blocked && !excRes.rows[0].exc_start) {
                status = 'On Leave';
            } else {
                // 5. Get booked sessions
                const bookedRes = await db.query(
                    'SELECT scheduled_start, scheduled_end FROM sessions WHERE therapist_id = $1 AND status != $2 AND scheduled_start::date = $3',
                    [therapistId, 'Cancelled', date]
                );

                // Simple slot generation (30 min increments)
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
                        freeSlots.push({
                            start: current.toTimeString().substring(0, 5),
                            end: slotEnd.toTimeString().substring(0, 5)
                        });
                    }
                    current = slotEnd;
                }
                
                if (freeSlots.length === 0) {
                    status = 'Unavailable';
                }
            }
        }

        res.json({
            status,
            assigned_therapist: {
                id: therapist.id,
                name: `${therapist.first_name} ${therapist.last_name}`,
                profession: therapist.profession
            },
            free_slots: freeSlots,
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
        
        // Map to the nested format the frontend expects
        const mapped = result.rows.map(row => ({
            ...row,
            client: (row.client && row.client.id) ? row.client : {
                id: row.client_id,
                first_name: row.client_first_name || '',
                last_name: row.client_last_name || '',
                is_vip: row.client_is_vip || false,
                uhid: row.client_uhid || '',
                mobile_no: row.client_mobile_no || ''
            },
            therapist: (row.therapist && row.therapist.first_name) ? row.therapist : {
                first_name: row.therapist_first_name || '',
                last_name: row.therapist_last_name || ''
            },
            service: {
                name: row.service_name || 'Standard Session'
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

        // Non-admins cannot cancel or reschedule booked slots
        if (updates.status === 'Cancelled' || updates.status === 'Rescheduled') {
            const isAdmin = await checkIsAdmin(req.user.id, req.user.role);
            if (!isAdmin) {
                return res.status(403).json({ error: 'Only administrators can cancel or reschedule booked slots. Please contact your admin.' });
            }
        }

        // Block starting a session if it is not scheduled for today
        const isStarting = ['IN_PROGRESS', 'In Progress', 'Checked In'].includes(updates.status) || (updates.actual_start && !updates.actual_end);
        if (isStarting) {
            const checkRes = await db.query('SELECT scheduled_start FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
            if (checkRes.rows.length > 0) {
                const scheduledDateStr = new Date(checkRes.rows[0].scheduled_start).toISOString().split('T')[0];
                const todayDateStr = new Date().toISOString().split('T')[0];
                if (scheduledDateStr !== todayDateStr) {
                    return res.status(400).json({ error: `Sessions can only be started on their scheduled day. This session is scheduled for ${scheduledDateStr}.` });
                }
            }
        }

        const allowedColumns = ['status', 'service_id', 'service_type', 'cancellation_reason', 'actual_start', 'actual_end', 'session_notes'];
        const keys = Object.keys(updates).filter(k => allowedColumns.includes(k));
        
        if (keys.length === 0) return res.status(400).json({ error: 'No valid update fields' });
        
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        const values = keys.map(k => updates[k]);

        const result = await db.query(`
            UPDATE sessions SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $${keys.length + 1} AND organization_id = $${keys.length + 2}
            RETURNING *
        `, [...values, id, orgId]);

        const session = result.rows[0];

        // Notify client and specialist when a session is cancelled
        if (updates.status === 'Cancelled' && session) {
            const specialistId = session.therapist_id || session.scientist_id;
            const cancelReason = updates.cancellation_reason ? ` Reason: ${updates.cancellation_reason}.` : '';
            const sessionDate = session.scheduled_start
                ? new Date(session.scheduled_start).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : 'your scheduled time';

            if (session.client_id) {
                await db.query(`
                    INSERT INTO notifications (organization_id, title, content, type, target_user_id, category)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [orgId, 'Session Cancelled', `Your session on ${sessionDate} has been cancelled.${cancelReason}`, 'red', session.client_id, 'in_app']);
            }
            if (specialistId) {
                await db.query(`
                    INSERT INTO notifications (organization_id, title, content, type, target_user_id, category)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [orgId, 'Session Cancelled', `A session scheduled for ${sessionDate} has been cancelled.${cancelReason}`, 'red', specialistId, 'in_app']);
            }
        }

        res.json(session);
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



// GET attendees for a group session
router.get('/:id/attendees', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const query = `
            SELECT c.id, c.first_name, c.last_name, c.uhid,
                   COALESCE((
                       SELECT SUM(b.total - COALESCE((SELECT SUM(bp.amount) FROM billpayments bp WHERE bp.bill_id = b.id), 0))
                       FROM bills b
                       WHERE b.client_id = c.id AND b.status IN ('Pending', 'Partially Paid')
                   ), 0) as outstanding_balance
            FROM group_attendance ga
            JOIN clients c ON ga.client_id = c.id
            JOIN sessions s ON ga.session_id = s.id
            WHERE ga.session_id = $1 AND s.organization_id = $2
        `;
        const result = await db.query(query, [id, orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET upcoming sessions for a client
router.get('/client/:clientId/upcoming', requireAuth, async (req, res) => {
    try {
        const { clientId } = req.params;
        const orgId = req.user.organization_id;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const query = `
            SELECT s.*, 
                   st.name as session_type_name,
                   p.first_name as scientist_first_name,
                   p.last_name as scientist_last_name
            FROM sessions s
            LEFT JOIN sessiontypes st ON s.service_id = st.id OR s.session_type_id = st.id
            LEFT JOIN profiles p ON s.scientist_id = p.id
            WHERE s.organization_id = $1 
            AND s.client_id = $2
            AND s.scheduled_start >= $3
            AND LOWER(s.status) NOT IN ('cancelled', 'missed', 'rescheduled', 'deleted')
            ORDER BY s.scheduled_start ASC
        `;
        const result = await db.query(query, [orgId, clientId, todayStart.toISOString()]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST cancel entire future plan for a client
router.post('/client/:clientId/cancel-future-plan', requireAuth, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { reason } = req.body;
        const orgId = req.user.organization_id;
        const nowIso = new Date().toISOString();

        // Fetch affected session records to preserve details in audit logs
        const sessRes = await db.query(`
            SELECT * FROM sessions 
            WHERE organization_id = $1 
            AND client_id = $2 
            AND scheduled_start >= $3 
            AND LOWER(status) NOT IN ('completed', 'cancelled', 'deleted')
        `, [orgId, clientId, nowIso]);
        const targetSessions = sessRes.rows;

        const query = `
            UPDATE sessions
            SET status = 'Deleted',
                cancellation_reason = COALESCE($1, 'Entire upcoming plan deleted by user'),
                updated_at = CURRENT_TIMESTAMP
            WHERE organization_id = $2
            AND client_id = $3
            AND scheduled_start >= $4
            AND LOWER(status) NOT IN ('completed', 'cancelled', 'deleted')
            RETURNING id
        `;
        const result = await db.query(query, [reason || null, orgId, clientId, nowIso]);

        // Record audit logs for each deleted session in the plan
        const userName = [req.user.first_name, req.user.last_name].filter(Boolean).join(" ") || req.user.email || "Specialist";
        for (const s of targetSessions) {
            await db.query(`
                INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                orgId,
                'session',
                s.id,
                'DELETE_PLAN_SESSION',
                req.user.id,
                JSON.stringify({
                    session_id: s.id,
                    client_id: clientId,
                    scheduled_start: s.scheduled_start,
                    scheduled_end: s.scheduled_end,
                    service_type: s.service_type,
                    deleted_at: new Date().toISOString(),
                    deleted_by_user_id: req.user.id,
                    deleted_by_user_name: userName,
                    reason: reason || "Entire upcoming plan deleted by user"
                })
            ]);
        }

        res.json({ success: true, cancelled_count: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE single session record with internal audit logging
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        const userName = [req.user.first_name, req.user.last_name].filter(Boolean).join(" ") || req.user.email || "Specialist";

        // Fetch session info before deletion
        const sessionRes = await db.query('SELECT * FROM sessions WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ error: 'Session record not found' });
        }
        const sess = sessionRes.rows[0];

        // Update status to Deleted
        await db.query(`
            UPDATE sessions 
            SET status = 'Deleted', 
                cancellation_reason = COALESCE($1, 'Deleted by user'),
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 AND organization_id = $3
        `, [reason || null, id, orgId]);

        // Record audit log entry preserving full deletion history for internal use
        await db.query(`
            INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            orgId,
            'session',
            id,
            'DELETE_SESSION',
            userId,
            JSON.stringify({
                session_id: id,
                client_id: sess.client_id,
                scheduled_start: sess.scheduled_start,
                scheduled_end: sess.scheduled_end,
                service_type: sess.service_type,
                session_mode: sess.session_mode,
                deleted_at: new Date().toISOString(),
                deleted_by_user_id: userId,
                deleted_by_user_name: userName,
                reason: reason || "Single session record deleted by user"
            })
        ]);

        res.json({ success: true, message: 'Session record deleted successfully and logged in audit trails.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST bulk delete sessions by array of IDs with audit logging
router.post('/bulk-delete', requireAuth, async (req, res) => {
    try {
        const { ids, reason } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        const userName = [req.user.first_name, req.user.last_name].filter(Boolean).join(" ") || req.user.email || "Specialist";

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array of session IDs is required' });
        }

        const sessRes = await db.query(`SELECT * FROM sessions WHERE organization_id = $1 AND id = ANY($2)`, [orgId, ids]);
        const fetchedSessions = sessRes.rows;

        await db.query(`
            UPDATE sessions 
            SET status = 'Deleted', 
                cancellation_reason = COALESCE($1, 'Bulk deleted by user'),
                updated_at = CURRENT_TIMESTAMP 
            WHERE organization_id = $2 AND id = ANY($3)
        `, [reason || null, orgId, ids]);

        for (const sess of fetchedSessions) {
            await db.query(`
                INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                orgId,
                'session',
                sess.id,
                'DELETE_SESSION',
                userId,
                JSON.stringify({
                    session_id: sess.id,
                    client_id: sess.client_id,
                    scheduled_start: sess.scheduled_start,
                    scheduled_end: sess.scheduled_end,
                    service_type: sess.service_type,
                    deleted_at: new Date().toISOString(),
                    deleted_by_user_id: userId,
                    deleted_by_user_name: userName,
                    reason: reason || "Bulk session deletion"
                })
            ]);
        }

        res.json({ success: true, deleted_count: fetchedSessions.length, ids });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST bulk cancel sessions by array of IDs
router.post('/bulk-cancel', requireAuth, async (req, res) => {
    try {
        const { ids, reason } = req.body;
        const orgId = req.user.organization_id;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array of session IDs is required' });
        }

        const query = `
            UPDATE sessions
            SET status = 'Cancelled',
                cancellation_reason = COALESCE($1, 'Bulk cancelled'),
                updated_at = CURRENT_TIMESTAMP
            WHERE organization_id = $2
            AND id = ANY($3)
            AND status NOT IN ('Completed')
            RETURNING id
        `;
        const result = await db.query(query, [reason || null, orgId, ids]);
        res.json({ success: true, cancelled_count: result.rows.length, ids: result.rows.map(r => r.id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST bulk edit sessions (status, reason, notes)
router.post('/bulk-edit', requireAuth, async (req, res) => {
    try {
        const { ids, status, cancellation_reason, session_notes } = req.body;
        const orgId = req.user.organization_id;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Array of session IDs is required' });
        }

        const allowedStatuses = ['Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In', 'Waitlisted'];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        let updates = [];
        let values = [orgId, ids];
        let idx = 3;

        if (status) {
            updates.push(`status = $${idx}`);
            values.push(status);
            idx++;
        }
        if (cancellation_reason !== undefined) {
            updates.push(`cancellation_reason = $${idx}`);
            values.push(cancellation_reason);
            idx++;
        }
        if (session_notes !== undefined) {
            updates.push(`session_notes = $${idx}`);
            values.push(session_notes);
            idx++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        const query = `
            UPDATE sessions
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE organization_id = $1
            AND id = ANY($2)
            AND status NOT IN ('Completed')
            RETURNING id, status
        `;
        const result = await db.query(query, values);
        res.json({ success: true, updated_count: result.rows.length, sessions: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Auto-completes any started sessions that were never stopped
 * once 60 minutes have elapsed since actual_start (or scheduled_start).
 */
export async function autoCompleteStartedSessions(targetOrgId = null) {
    try {
        const queryText = `
            SELECT s.id, s.organization_id, s.client_id, s.service_type, s.scheduled_start, s.scheduled_end, s.actual_start, s.entitlement_id, s.is_unentitled
            FROM sessions s
            WHERE s.status IN ('Checked In', 'IN_PROGRESS', 'In Progress', 'Planned')
              AND (s.actual_start IS NOT NULL OR s.status IN ('Checked In', 'IN_PROGRESS', 'In Progress'))
              AND NOW() >= (COALESCE(s.actual_start, s.scheduled_start) + INTERVAL '60 minutes')
              ${targetOrgId ? 'AND s.organization_id = $1' : ''}
        `;
        const params = targetOrgId ? [targetOrgId] : [];
        const unendedSessions = await db.query(queryText, params);

        let completedCount = 0;

        for (const session of unendedSessions.rows) {
            const startTimestamp = session.actual_start || session.scheduled_start;
            const startDate = new Date(startTimestamp);
            const autoEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
            const actualEndIso = autoEndDate.toISOString();
            const actualStartIso = startDate.toISOString();

            let entitlementId = session.entitlement_id;
            let isUnentitled = session.is_unentitled;

            if (!entitlementId && !isUnentitled && session.client_id && session.service_type && session.organization_id) {
                const entRes = await db.query(`
                    SELECT id FROM cliententitlements 
                    WHERE client_id = $1 AND organization_id = $2 
                    AND service_type = $3 AND status = 'active' AND (granted_sessions - sessions_used) > 0
                    LIMIT 1
                `, [session.client_id, session.organization_id, session.service_type]);

                if (entRes.rows.length > 0) {
                    entitlementId = entRes.rows[0].id;
                } else {
                    isUnentitled = true;
                }
            }

            await db.query(`
                UPDATE sessions 
                SET status = 'Completed',
                    actual_start = $1,
                    actual_end = $2,
                    entitlement_id = $3,
                    is_unentitled = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
            `, [actualStartIso, actualEndIso, entitlementId, isUnentitled, session.id]);

            if (entitlementId) {
                await db.query(`
                    UPDATE cliententitlements 
                    SET sessions_used = sessions_used + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [entitlementId]);
            }

            completedCount++;
            console.log(`[AUTO-COMPLETE-SESSION] Session ${session.id} (Org: ${session.organization_id}) auto-completed after 60 mins elapsed.`);
        }

        return { completed: completedCount };
    } catch (err) {
        console.error('[AUTO-COMPLETE-SESSION] Error:', err.message);
        return { completed: 0, error: err.message };
    }
}

setInterval(async () => {
    await autoCompleteStartedSessions();
}, 60_000);

export default router;
