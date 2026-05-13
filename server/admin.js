import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET Admin Dashboard Stats
router.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        
        // 1. All Sessions (for metrics)
        const sessionsRes = await db.query(`
            SELECT s.id, s.status, s.scheduled_start, s.scheduled_end, s.service_type, s.therapist_id, s.client_id,
                   p.first_name as therapist_first_name, p.last_name as therapist_last_name,
                   c.first_name as client_first_name, c.last_name as client_last_name
            FROM Sessions s
            LEFT JOIN Profiles p ON s.therapist_id = p.id
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
        
        const result = await db.query(`
            SELECT n.*, 
                   (SELECT COUNT(*) FROM notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = $1) > 0 as is_read
            FROM notifications n
            WHERE n.organization_id = $2
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [userId, orgId]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Notification
router.post('/notifications', requireAuth, async (req, res) => {
    try {
        const { title, content, type, target_role, target_user_id } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            INSERT INTO notifications (organization_id, title, content, type, target_role, target_user_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [orgId, title, content, type || 'info', target_role, target_user_id, req.user.id]);
        
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

// GET Unread Notifications Count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM notifications n
            WHERE n.organization_id = $1
            AND (n.is_broadcast = true OR n.target_user_id = $2)
            AND NOT EXISTS (
                SELECT 1 FROM notification_reads nr 
                WHERE nr.notification_id = n.id AND nr.user_id = $2
            )
        `, [orgId, userId]);
        
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

export default router;
