import express from 'express';
import { db, autoAllocateStaffServices } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();
 
// GET current user profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all employees/staff for an organization
router.get('/employees', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { role_type } = req.query;

        let query = `
            SELECT p.*, u.email, u.role,
                   (SELECT json_agg(ca.*) FROM consultantavailability ca WHERE ca.consultant_id = p.id) as consultant_availability,
                   (SELECT json_agg(ea.*) FROM emergency_alerts ea WHERE ea.staff_id = p.id AND ea.status = 'unresolved') as emergency_alerts
            FROM profiles p
            JOIN users u ON p.id = u.id
            WHERE p.organization_id = $1 AND p.is_approved = true
        `;
        const params = [orgId];

        if (role_type === 'clinical') {
            query += ` AND (u.role IN ('consultant', 'sports_physician', 'physiotherapist', 'nutritionist', 'sports_scientist', 'massage_therapist') OR (u.role = 'admin' AND p.profession IS NOT NULL))`;
        } else if (role_type === 'athlete') {
            query += ` AND (u.role = 'athlete' OR p.ams_role = 'athlete')`;
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET employee directory for HR management
router.get('/employees/directory', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT e.*, 
                   json_build_object('first_name', p.first_name, 'last_name', p.last_name, 'profession', p.profession) as profiles,
                   json_build_object('name', j.name) as jobs
            FROM hr_employees e
            LEFT JOIN profiles p ON e.profile_id = p.id
            LEFT JOIN hr_jobs j ON e.job_id = j.id
            WHERE e.organization_id = $1
        `, [orgId]);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET today's attendance status for user
router.get('/attendance/today', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];
        
        const result = await db.query(`
            SELECT * FROM hrattendancelogs 
            WHERE profile_id = $1 
            AND created_at >= $2::timestamp
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId, today]);
        
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all attendance logs for organization
router.get('/attendance/all', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT a.*, 
                   json_build_object(
                       'first_name', p.first_name, 
                       'last_name', p.last_name, 
                       'profession', p.profession,
                       'email', u.email
                   ) as profile
            FROM hrattendancelogs a
            JOIN profiles p ON a.profile_id = p.id
            JOIN users u ON p.id = u.id
            WHERE a.organization_id = $1
            ORDER BY a.created_at DESC
        `, [orgId]);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET filtered attendance logs for current user
router.get('/attendance/history', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { from, to } = req.query;
        
        let query = 'SELECT * FROM hrattendancelogs WHERE profile_id = $1';
        const params = [userId];
        
        if (from) {
            query += ` AND created_at >= $${params.length + 1}`;
            params.push(from);
        }
        if (to) {
            query += ` AND created_at <= $${params.length + 1}`;
            params.push(to);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST log attendance
router.post('/attendance/log', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const { type, latitude, longitude, distance, metadata } = req.body;
        
        const result = await db.query(`
            INSERT INTO hrattendancelogs (
                organization_id, profile_id, type, latitude, longitude, distance_from_center, is_within_geofence, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [orgId, userId, type, latitude, longitude, distance, true, JSON.stringify(metadata || {})]);
        
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all users in organization (for approval/management)
// GET HR Stats
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        
        const [empCount, pendingLeaves, approvalCount] = await Promise.all([
            db.query('SELECT COUNT(*) FROM profiles WHERE organization_id = $1', [orgId]),
            db.query('SELECT COUNT(*) FROM hrleaves WHERE organization_id = $1 AND status = \'Requested\'', [orgId]),
            db.query('SELECT COUNT(*) FROM profiles WHERE organization_id = $1 AND is_approved = false', [orgId])
        ]);

        res.json({
            data: {
                totalEmployees: parseInt(empCount.rows[0].count),
                pendingLeaves: parseInt(pendingLeaves.rows[0].count),
                pendingApprovals: parseInt(approvalCount.rows[0].count)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/users', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT p.*, u.email, u.role as current_role
            FROM profiles p
            JOIN users u ON p.id = u.id
            WHERE p.organization_id = $1
            AND u.role != 'super_admin'
            ORDER BY u.created_at DESC
        `, [orgId]);
        
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST approve user
router.post('/users/:id/approve', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { role, profession, ams_role, uhid } = req.body;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        let finalUhid = uhid || null;
        if ((role === 'client' || role === 'athlete') && !finalUhid) {
            const uhidRes = await client.query('SELECT generate_uhid_func($1) as new_uhid', [orgId]);
            finalUhid = uhidRes.rows[0].new_uhid;
        }

        // 1. Update Profile
        await client.query(`
            UPDATE profiles SET 
                is_approved = true,
                profession = $1,
                ams_role = $2,
                uhid = $3
            WHERE id = $4 AND organization_id = $5
        `, [profession || null, ams_role || null, finalUhid, id, orgId]);

        // 2. Update User Role
        await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

        // --- Auto-allocation trigger ---
        if (profession) {
            await autoAllocateStaffServices(id, profession, orgId, client);
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

// PATCH update user role
router.patch('/users/:id/role', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { role, profession, ams_role, uhid, has_calendar_access } = req.body;
        const orgId = req.user.organization_id;

        // Security check for calendar access change
        if (has_calendar_access !== undefined && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Only administrators can modify calendar access' });
        }

        await client.query('BEGIN');

        if (role) {
            await client.query('UPDATE Users SET role = $1 WHERE id = $2', [role, id]);
        }

        const updates = [];
        const params = [id, orgId];
        if (profession !== undefined) {
            updates.push(`profession = $${params.length + 1}`);
            params.push(profession);
        }
        if (ams_role !== undefined) {
            updates.push(`ams_role = $${params.length + 1}`);
            params.push(ams_role);
        }
        if (uhid !== undefined) {
            updates.push(`uhid = $${params.length + 1}`);
            params.push(uhid);
        }
        if (has_calendar_access !== undefined) {
            updates.push(`has_calendar_access = $${params.length + 1}`);
            params.push(has_calendar_access);
        }

        if (updates.length > 0) {
            await client.query(`
                UPDATE profiles SET ${updates.join(', ')}
                WHERE id = $1 AND organization_id = $2
            `, params);
        }

        // --- Auto-allocation trigger ---
        if (profession) {
            await autoAllocateStaffServices(id, profession, orgId, client);
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

// DELETE permanently delete user
router.delete('/users/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        // Verify organization match before deleting
        const profileRes = await db.query('SELECT organization_id FROM profiles WHERE id = $1', [id]);
        if (profileRes.rows.length === 0 || profileRes.rows[0].organization_id !== orgId) {
            return res.status(403).json({ error: 'Unauthorized user deletion' });
        }

        // Permanently delete user (cascades to profiles)
        await db.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create user (direct)
router.post('/users', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { email, firstName, lastName, role, profession, uhid, ams_role } = req.body;
        const orgId = req.user.organization_id;
        
        // Generate random password
        const password = Math.random().toString(36).slice(-8);
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.default.hash(password, 10);
        const userId = (await import('crypto')).randomUUID();

        await client.query('BEGIN');

        // 1. Insert User
        await client.query(
            'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [userId, email, passwordHash, role]
        );

        // 2. Insert Profile
        await client.query(
            'INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved, profession, uhid, ams_role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [userId, firstName, lastName, orgId, true, profession || null, uhid || null, ams_role || null]
        );

        // --- Auto-allocation trigger ---
        if (profession) {
            await autoAllocateStaffServices(userId, profession, orgId, client);
        }

        await client.query('COMMIT');
        res.json({ success: true, user: { email, password } });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET all leave requests for organization
router.get('/leaves', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { employee_id, status } = req.query;

        let query = `
            SELECT l.*, p.first_name, p.last_name
            FROM hrleaves l
            JOIN profiles p ON l.employee_id = p.id
            WHERE l.organization_id = $1
        `;
        const params = [orgId];

        if (employee_id) {
            query += ` AND l.employee_id = $${params.length + 1}`;
            params.push(employee_id);
        }
        if (status) {
            query += ` AND l.status = $${params.length + 1}`;
            params.push(status);
        }

        query += ' ORDER BY l.created_at DESC';

        const result = await db.query(query, params);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new leave request
router.post('/leaves', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const { leave_type, start_date, end_date, reason } = req.body;

        const result = await db.query(`
            INSERT INTO hrleaves (
                organization_id, employee_id, leave_type, start_date, end_date, reason
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [orgId, userId, leave_type, start_date, end_date, reason]);

        res.status(201).json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update leave status
router.patch('/leaves/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;

        const result = await db.query(`
            UPDATE hrleaves SET 
                status = $1,
                approved_by = $2
            WHERE id = $3 AND organization_id = $4
            RETURNING *
        `, [status, userId, id, orgId]);

        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET emergency alerts
router.get('/emergencies', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { staff_id, status } = req.query;

        let query = `
            SELECT e.*, 
                   json_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'profession', p.profession) as staff
            FROM emergency_alerts e
            JOIN profiles p ON e.staff_id = p.id
            WHERE e.organization_id = $1
        `;
        const params = [orgId];

        if (staff_id) {
            query += ` AND e.staff_id = $${params.length + 1}`;
            params.push(staff_id);
        }
        if (status) {
            query += ` AND e.status = $${params.length + 1}`;
            params.push(status);
        }

        query += ' ORDER BY e.created_at DESC';

        const result = await db.query(query, params);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET latest emergency alert for staff today
router.get('/emergency-alerts/today', requireAuth, async (req, res) => {
    try {
        const staffId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        const result = await db.query(`
            SELECT * FROM emergency_alerts 
            WHERE staff_id = $1 AND created_at >= $2
            ORDER BY created_at DESC LIMIT 1
        `, [staffId, `${today} 00:00:00`]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST emergency alert (and auto checkout)
router.post('/emergency-alerts', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { reason } = req.body;
        const staffId = req.user.id;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        // 1. Insert alert
        const alertRes = await client.query(`
            INSERT INTO emergency_alerts (organization_id, staff_id, reason, status)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [orgId, staffId, reason, 'unresolved']);

        const staffRes = await client.query('SELECT first_name, last_name FROM profiles WHERE id = $1', [staffId]);
        const staffName = staffRes.rows.length > 0 ? `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}` : 'A staff member';

        const settingsRes = await client.query(
            'SELECT enable_in_app_notifications, notify_emergency_leave FROM organization_notification_settings WHERE organization_id = $1',
            [orgId]
        );
        const shouldNotify = settingsRes.rows.length > 0
            ? (settingsRes.rows[0].enable_in_app_notifications && settingsRes.rows[0].notify_emergency_leave)
            : true;

        if (shouldNotify) {
            await client.query(`
                INSERT INTO notifications (
                    organization_id, title, content, type, target_role, category, action_payload, action_status, sender_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                orgId,
                'Emergency Leave Activated',
                `${staffName} has activated Emergency Leave.`,
                'red',
                'admin',
                'direct_action',
                JSON.stringify({ staffId, alertId: alertRes.rows[0].id }),
                'pending',
                staffId
            ]);
        }

        // 2. Handle auto checkout/leave
        const today = new Date().toISOString().split('T')[0];
        const logsRes = await client.query(`
            SELECT * FROM hrattendancelogs 
            WHERE profile_id = $1 AND created_at >= $2
            ORDER BY created_at DESC
        `, [staffId, `${today} 00:00:00`]);
        
        const logs = logsRes.rows;
        const lastCheckIn = logs.find(l => l.type === 'check_in');
        const alreadyCheckedOut = logs.some(l => l.type === 'check_out');

        if (lastCheckIn && !alreadyCheckedOut) {
            await client.query(`
                INSERT INTO hrattendancelogs (
                    organization_id, profile_id, type, latitude, longitude, 
                    distance_from_center, is_within_geofence, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                orgId, staffId, 'emergency_leave', lastCheckIn.latitude, lastCheckIn.longitude,
                lastCheckIn.distance_from_center, lastCheckIn.is_within_geofence,
                JSON.stringify({ auto: true, reason: 'emergency_leave', note: 'Auto-checked out due to emergency leave' })
            ]);
        } else if (!lastCheckIn) {
            await client.query(`
                INSERT INTO hrattendancelogs (
                    organization_id, profile_id, type, is_within_geofence, metadata
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                orgId, staffId, 'emergency_leave', false,
                JSON.stringify({ reason: 'emergency_leave', note: 'Emergency leave raised — no prior check-in for today' })
            ]);
        }

        await client.query('COMMIT');
        res.status(201).json(alertRes.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PATCH resolve emergency alert
router.patch('/emergencies/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const { status, admin_decision } = req.body;
        
        const result = await db.query(`
            UPDATE emergency_alerts 
            SET status = $1, admin_decision = $2, updated_at = NOW()
            WHERE id = $3 AND organization_id = $4
            RETURNING *
        `, [status, admin_decision, id, orgId]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET unread notifications count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const userRole = req.user.role;
        
        const result = await db.query(`
            SELECT COUNT(*)::int as count
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
        
        res.json({ unreadCount: result.rows[0].count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all staff schedules for organization
router.get('/staff-schedules', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(
            'SELECT * FROM staff_schedules WHERE organization_id = $1',
            [orgId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET individual schedule (fallback to default if none exists)
router.get('/staff-schedules/:consultant_id', requireAuth, async (req, res) => {
    try {
        const { consultant_id } = req.params;
        const orgId = req.user.organization_id;
        const result = await db.query(
            'SELECT * FROM staff_schedules WHERE consultant_id = $1 AND organization_id = $2',
            [consultant_id, orgId]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({
                consultant_id,
                shift_start: '08:00:00',
                shift_end: '17:00:00',
                breaks: []
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST upsert staff schedule
router.post('/staff-schedules', requireAuth, async (req, res) => {
    try {
        const { organization_id, consultant_id, shift_start, shift_end, breaks } = req.body;
        const orgId = organization_id || req.user.organization_id;

        if (!consultant_id) {
            return res.status(400).json({ error: 'consultant_id is required' });
        }

        let breaksJson;
        if (typeof breaks === 'string') {
            breaksJson = breaks;
        } else {
            breaksJson = JSON.stringify(breaks || []);
        }

        const query = `
            INSERT INTO staff_schedules (organization_id, consultant_id, shift_start, shift_end, breaks, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (consultant_id)
            DO UPDATE SET
                organization_id = EXCLUDED.organization_id,
                shift_start = EXCLUDED.shift_start,
                shift_end = EXCLUDED.shift_end,
                breaks = EXCLUDED.breaks,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await db.query(query, [
            orgId,
            consultant_id,
            shift_start || '08:00:00',
            shift_end || '17:00:00',
            breaksJson
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
