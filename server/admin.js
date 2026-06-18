import express from 'express';
import { db, logStaffServiceUpdate } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET Admin Dashboard Stats
router.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        
        // 1. All Sessions (for metrics)
        const sessionsRes = await db.query(`
            SELECT s.id, s.status, s.scheduled_start, s.scheduled_end, s.service_type, COALESCE(s.therapist_id, s.scientist_id) as therapist_id, s.client_id,
                   p.first_name as therapist_first_name, p.last_name as therapist_last_name,
                   c.first_name as client_first_name, c.last_name as client_last_name
            FROM Sessions s
            LEFT JOIN Profiles p ON COALESCE(s.therapist_id, s.scientist_id) = p.id
            LEFT JOIN Clients c ON s.client_id = c.id
            WHERE s.organization_id = $1
        `, [orgId]);

        // 2. Today's Sessions
        const today = new Date().toISOString().split('T')[0];
        const todaysSessionsRes = await db.query(`
            SELECT s.id, s.status, s.scheduled_start, s.scheduled_end, s.service_type,
                   c.first_name as client_first_name, c.last_name as client_last_name
            FROM Sessions s
            LEFT JOIN Clients c ON s.client_id = c.id
            WHERE s.organization_id = $1
            AND s.scheduled_start::date = $2
            ORDER BY s.scheduled_start ASC
        `, [orgId, today]);

        // 3. Bills
        const billsRes = await db.query(`
            SELECT id, amount, total, status, payment_method, created_at
            FROM Bills
            WHERE organization_id = $1
        `, [orgId]);

        // 4. Refunds
        const refundsRes = await db.query(`
            SELECT id, amount, refund_mode, created_at
            FROM Refunds
            WHERE organization_id = $1
        `, [orgId]);

        // 5. Recent Clients
        const recentClientsRes = await db.query(`
            SELECT id, first_name, last_name, created_at
            FROM Clients
            WHERE organization_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [orgId]);

        // 6. Recent Bills (Paid)
        const recentBillsRes = await db.query(`
            SELECT id, amount, status, created_at
            FROM Bills
            WHERE organization_id = $1 AND status = 'Paid'
            ORDER BY created_at DESC
            LIMIT 10
        `, [orgId]);

        // 7. Waitlist Alerts
        const waitlistRes = await db.query(`
            SELECT w.id, w.status, w.preferred_date, w.preferred_time_slot,
                   c.first_name as client_first_name, c.last_name as client_last_name, 
                   c.is_vip, c.mobile_no
            FROM Waitlist w
            LEFT JOIN Clients c ON w.client_id = c.id
            WHERE w.organization_id = $1
            AND w.status IN ('Waiting', 'Notified')
            ORDER BY w.created_at DESC
        `, [orgId]);

        res.json({
            sessions: sessionsRes.rows,
            todaysSessions: todaysSessionsRes.rows,
            bills: billsRes.rows,
            refunds: refundsRes.rows,
            recentClients: recentClientsRes.rows,
            recentBills: recentBillsRes.rows,
            waitlistAlerts: waitlistRes.rows
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Notifications for user
router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const userRole = req.user.role;
        
        const result = await db.query(`
            SELECT n.*, 
                   (SELECT COUNT(*) FROM notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = $1) > 0 as is_read
            FROM notifications n
            WHERE n.organization_id = $2
              AND (
                n.is_broadcast = true 
                OR n.target_user_id = $1 
                OR n.target_role = $3
                OR (n.target_role = 'admin' AND $3 = 'super_admin')
                OR (n.target_role = 'athlete' AND $3 IN ('athlete', 'client'))
                OR (n.target_role = 'specialist' AND $3 IN ('sports_scientist', 'sports_physician', 'physiotherapist', 'nutritionist', 'massage_therapist', 'coach'))
                OR (n.target_role IS NULL AND n.target_user_id IS NULL AND n.is_broadcast IS NOT TRUE AND ($3 = 'admin' OR $3 = 'super_admin'))
              )
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [userId, orgId, userRole]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Notification
router.post('/notifications', requireAuth, async (req, res) => {
    try {
        const { title, content, type, target_role, target_user_id, is_broadcast } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            INSERT INTO notifications (organization_id, title, content, type, target_role, target_user_id, is_broadcast, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [orgId, title, content, type || 'info', target_role, target_user_id, is_broadcast || false, req.user.id]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Mark Notifications as Read
router.post('/notifications/read', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { notification_ids } = req.body;
        const userId = req.user.id;
        
        if (!Array.isArray(notification_ids)) return res.status(400).json({ error: 'notification_ids must be an array' });
        
        await client.query('BEGIN');
        for (const id of notification_ids) {
            await client.query(`
                INSERT INTO notification_reads (notification_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (notification_id, user_id) DO NOTHING
            `, [id, userId]);
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

// GET Notification Settings for Organization
router.get('/settings/notifications', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ error: 'User does not belong to an organization' });

        let result = await db.query('SELECT * FROM organization_notification_settings WHERE organization_id = $1', [orgId]);
        if (result.rows.length === 0) {
            // Upsert default settings row
            await db.query(`
                INSERT INTO organization_notification_settings (organization_id)
                VALUES ($1)
                ON CONFLICT (organization_id) DO NOTHING
            `, [orgId]);
            
            result = await db.query('SELECT * FROM organization_notification_settings WHERE organization_id = $1', [orgId]);
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT Update Notification Settings for Organization
router.put('/settings/notifications', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ error: 'User does not belong to an organization' });

        const {
            enable_email_notifications,
            enable_in_app_notifications,
            notify_signup_approval,
            notify_questionnaire_assigned,
            notify_questionnaire_completed,
            notify_emergency_leave,
            notify_outstanding_balance
        } = req.body;

        const result = await db.query(`
            INSERT INTO organization_notification_settings (
                organization_id,
                enable_email_notifications,
                enable_in_app_notifications,
                notify_signup_approval,
                notify_questionnaire_assigned,
                notify_questionnaire_completed,
                notify_emergency_leave,
                notify_outstanding_balance,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (organization_id) DO UPDATE SET
                enable_email_notifications = EXCLUDED.enable_email_notifications,
                enable_in_app_notifications = EXCLUDED.enable_in_app_notifications,
                notify_signup_approval = EXCLUDED.notify_signup_approval,
                notify_questionnaire_assigned = EXCLUDED.notify_questionnaire_assigned,
                notify_questionnaire_completed = EXCLUDED.notify_questionnaire_completed,
                notify_emergency_leave = EXCLUDED.notify_emergency_leave,
                notify_outstanding_balance = EXCLUDED.notify_outstanding_balance,
                updated_at = NOW()
            RETURNING *
        `, [
            orgId,
            enable_email_notifications !== undefined ? enable_email_notifications : true,
            enable_in_app_notifications !== undefined ? enable_in_app_notifications : true,
            notify_signup_approval !== undefined ? notify_signup_approval : true,
            notify_questionnaire_assigned !== undefined ? notify_questionnaire_assigned : true,
            notify_questionnaire_completed !== undefined ? notify_questionnaire_completed : true,
            notify_emergency_leave !== undefined ? notify_emergency_leave : true,
            notify_outstanding_balance !== undefined ? notify_outstanding_balance : true
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Unread Notifications Count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const userRole = req.user.role;
        
        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM notifications n
            WHERE n.organization_id = $1
            AND (
                n.is_broadcast = true 
                OR n.target_user_id = $2 
                OR n.target_role = $3
                OR (n.target_role = 'admin' AND $3 = 'super_admin')
                OR (n.target_role = 'athlete' AND $3 IN ('athlete', 'client'))
                OR (n.target_role = 'specialist' AND $3 IN ('sports_scientist', 'sports_physician', 'physiotherapist', 'nutritionist', 'massage_therapist', 'coach'))
                OR (n.target_role IS NULL AND n.target_user_id IS NULL AND n.is_broadcast IS NOT TRUE AND ($3 = 'admin' OR $3 = 'super_admin'))
            )
            AND NOT EXISTS (
                SELECT 1 FROM notification_reads nr 
                WHERE nr.notification_id = n.id AND nr.user_id = $2
            )
        `, [orgId, userId, userRole]);
        
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---------- Consultant-Service Mappings ----------

// GET all consultant_services for this organization
router.get('/consultant-services', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT cs.consultant_id, cs.service_id,
                   p.first_name, p.last_name, p.profession,
                   s.name as service_name
            FROM consultant_services cs
            JOIN profiles p ON cs.consultant_id = p.id
            JOIN services s ON cs.service_id = s.id
            WHERE cs.organization_id = $1
            ORDER BY s.name, p.first_name
        `, [orgId]);
        res.json(result.rows);
    } catch (error) {
        console.error('[ADMIN] Error fetching consultant-services:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST — replace the mappings for a specific service
// Body: { service_id: string, consultant_ids: string[] }
router.post('/consultant-services', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const orgId = req.user.organization_id;
        const userRole = req.user.role;

        // Admin-only gate
        if (!['admin', 'clinic_admin', 'super_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Only admins can modify service mappings.' });
        }

        const { service_id, consultant_ids } = req.body;
        if (!service_id || !Array.isArray(consultant_ids)) {
            return res.status(400).json({ error: 'service_id and consultant_ids[] are required.' });
        }

        await client.query('BEGIN');

        // Remove existing mappings for this service in this org
        await client.query(
            'DELETE FROM consultant_services WHERE service_id = $1 AND organization_id = $2',
            [service_id, orgId]
        );

        // Insert new mappings
        for (const consultantId of consultant_ids) {
            await client.query(
                'INSERT INTO consultant_services (organization_id, consultant_id, service_id) VALUES ($1, $2, $3) ON CONFLICT (consultant_id, service_id) DO NOTHING',
                [orgId, consultantId, service_id]
            );
        }

        await client.query('COMMIT');

        res.json({ success: true, count: consultant_ids.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[ADMIN] Error saving consultant-services:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PATCH Update Notification Action Status
router.patch('/notifications/:id/status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { action_status } = req.body;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            UPDATE notifications 
            SET action_status = $1
            WHERE id = $2 AND organization_id = $3
            RETURNING *
        `, [action_status, id, orgId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---------- Global Service Configurator (Panel A) ----------

// POST Create new Service / Session Type
router.post('/services', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const userRole = req.user.role;

        if (!['admin', 'clinic_admin', 'super_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Only administrators can create services.' });
        }

        const { name, category, base_price, min_duration, max_duration, is_universal, is_active } = req.body;
        if (!name) return res.status(400).json({ error: 'Service name is required.' });

        const result = await db.query(`
            INSERT INTO services (
                organization_id, name, category, base_price, min_duration, max_duration, is_universal, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            orgId, name, category || 'General', parseFloat(base_price || 0), 
            parseInt(min_duration || 30, 10), parseInt(max_duration || 120, 10), 
            is_universal !== false, is_active !== false
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Update Service / Session Type
router.patch('/services/:id', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const userRole = req.user.role;
        const { id } = req.params;

        if (!['admin', 'clinic_admin', 'super_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Only administrators can update services.' });
        }

        const { name, category, base_price, min_duration, max_duration, is_universal, is_active } = req.body;

        const updates = [];
        const params = [id, orgId];

        if (name !== undefined) {
            updates.push(`name = $${params.length + 1}`);
            params.push(name);
        }
        if (category !== undefined) {
            updates.push(`category = $${params.length + 1}`);
            params.push(category);
        }
        if (base_price !== undefined) {
            updates.push(`base_price = $${params.length + 1}`);
            params.push(parseFloat(base_price));
        }
        if (min_duration !== undefined) {
            updates.push(`min_duration = $${params.length + 1}`);
            params.push(parseInt(min_duration, 10));
        }
        if (max_duration !== undefined) {
            updates.push(`max_duration = $${params.length + 1}`);
            params.push(parseInt(max_duration, 10));
        }
        if (is_universal !== undefined) {
            updates.push(`is_universal = $${params.length + 1}`);
            params.push(Boolean(is_universal));
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${params.length + 1}`);
            params.push(Boolean(is_active));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await db.query(`
            UPDATE services 
            SET ${updates.join(', ')}
            WHERE id = $1 AND organization_id = $2
            RETURNING *
        `, params);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Service / Session Type
router.delete('/services/:id', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const userRole = req.user.role;
        const { id } = req.params;

        if (!['admin', 'clinic_admin', 'super_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Only administrators can delete services.' });
        }

        // Soft delete/deactivate if referenced in sessions
        const checkRes = await db.query('SELECT COUNT(*) FROM Sessions WHERE service_id = $1 OR session_type_id = $1', [id]);
        if (parseInt(checkRes.rows[0].count, 10) > 0) {
            await db.query('UPDATE services SET is_active = false WHERE id = $1 AND organization_id = $2', [id, orgId]);
            return res.json({ success: true, message: 'Deactivated because it is referenced in sessions.' });
        }

        const result = await db.query('DELETE FROM services WHERE id = $1 AND organization_id = $2 RETURNING *', [id, orgId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---------- Staff Override Matrix (Panel B) ----------

// GET all clinical consultants & their permitted services
router.get('/consultants', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT p.id, p.first_name, p.last_name, p.profession, u.email, u.role,
                   COALESCE(
                     (SELECT json_agg(s.id) 
                      FROM consultant_services cs 
                      JOIN services s ON cs.service_id = s.id 
                      WHERE cs.consultant_id = p.id AND cs.organization_id = $1),
                     '[]'::json
                   ) as service_ids
            FROM profiles p
            JOIN users u ON p.id = u.id
            WHERE p.organization_id = $1 AND p.is_approved = true
            AND (u.role IN ('consultant', 'sports_physician', 'physiotherapist', 'nutritionist', 'sports_scientist', 'massage_therapist') 
                 OR (u.role = 'admin' AND p.profession IS NOT NULL))
            ORDER BY p.first_name, p.last_name
        `, [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST update permitted services for a specific staff member
router.post('/consultants/:id/services', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const orgId = req.user.organization_id;
        const userRole = req.user.role;
        const { id } = req.params; // consultant_id
        const { service_ids } = req.body; // array of permitted service_ids

        if (!['admin', 'clinic_admin', 'super_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Only administrators can update staff services.' });
        }

        if (!Array.isArray(service_ids)) {
            return res.status(400).json({ error: 'service_ids must be an array.' });
        }

        await client.query('BEGIN');

        // Delete existing mappings
        await client.query(
            'DELETE FROM consultant_services WHERE consultant_id = $1 AND organization_id = $2',
            [id, orgId]
        );

        // Insert new mappings
        for (const sId of service_ids) {
            await client.query(`
                INSERT INTO consultant_services (organization_id, consultant_id, service_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (consultant_id, service_id) DO NOTHING
            `, [orgId, id, sId]);
        }

        // Generate activity event log in notification audit ledger
        await logStaffServiceUpdate(orgId, id, req.user.id, 'override', { service_ids }, client);

        await client.query('COMMIT');
        res.json({ success: true, count: service_ids.length });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router;
