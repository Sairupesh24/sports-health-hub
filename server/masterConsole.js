import express from 'express';
import { db } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = express.Router();

// Middleware to check for super_admin role
const requireSuperAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super admin role required.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/master-console/metrics
 */
router.get('/metrics', requireSuperAdmin, async (req, res) => {
  try {
    const totalOrgs = await db.query('SELECT COUNT(*) FROM organizations');
    const activeOrgs = await db.query('SELECT COUNT(*) FROM organizations WHERE status = $1', ['active']);
    const disabledOrgs = await db.query('SELECT COUNT(*) FROM organizations WHERE status IN ($1, $2)', ['disabled', 'suspended']);
    
    // For now, these tables might not exist or be empty
    let totallocations = 0;
    try {
        const locRes = await db.query('SELECT COUNT(*) FROM locations');
        totallocations = parseInt(locRes.rows[0].count, 10);
    } catch(e) {}

    const totalConsultants = await db.query('SELECT COUNT(*) FROM users WHERE role = $1', ['consultant']);

    res.json({
      total_organizations: parseInt(totalOrgs.rows[0].count, 10),
      active_organizations: parseInt(activeOrgs.rows[0].count, 10),
      disabled_organizations: parseInt(disabledOrgs.rows[0].count, 10),
      total_locations: totallocations,
      total_consultants: parseInt(totalConsultants.rows[0].count, 10)
    });
  } catch (error) {
    console.error('Error in /master-console/metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/master-console/organizations
 */
router.get('/organizations', requireSuperAdmin, async (req, res) => {
  try {
    const query = `
      SELECT
        o.id,
        o.name,
        o.org_code,
        o.status,
        o.created_at,
        (SELECT COUNT(*) FROM profiles p WHERE p.organization_id = o.id) AS user_count
      FROM organizations o
      ORDER BY o.created_at DESC
    `;
    const result = await db.query(query);
    
    // Map to the format the frontend expects
    const organizations = result.rows.map(org => ({
        ...org,
        location_count: 0,
        consultant_count: 0,
        client_count: 0,
        subscription_plan: 'pro' // Default plan
    }));

    res.json(organizations);
  } catch (error) {
    console.error('Error in /master-console/organizations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/master-console/organizations/:id
 */
router.get('/organizations/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const orgRes = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
    const org = orgRes.rows[0];
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    // Aggregate counts
    const locRes = await db.query('SELECT COUNT(*) FROM locations WHERE organization_id = $1', [id]).catch(() => ({ rows: [{ count: 0 }] }));
    const profRes = await db.query('SELECT COUNT(*) FROM profiles WHERE organization_id = $1', [id]);
    
    // For consultants and clients, we need those tables
    let consultantCount = 0;
    try {
        const consRes = await db.query('SELECT COUNT(*) FROM profiles p JOIN users u ON p.id = u.id WHERE p.organization_id = $1 AND u.role = $2', [id, 'consultant']);
        consultantCount = parseInt(consRes.rows[0].count, 10);
    } catch(e) {}

    let clientCount = 0;
    try {
        const cliRes = await db.query('SELECT COUNT(*) FROM Clients WHERE organization_id = $1', [id]);
        clientCount = parseInt(cliRes.rows[0].count, 10);
    } catch(e) {}

    res.json({
        ...org,
        location_count: parseInt(locRes.rows[0].count, 10),
        consultant_count: consultantCount,
        client_count: clientCount
    });
  } catch (error) {
    console.error('Error in /master-console/organizations/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/master-console/organizations/:id
 */
router.patch('/organizations/:id', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Whitelist allowed columns for update
    const allowedColumns = [
        'name', 'official_name', 'official_address', 'contact_email', 'contact_phone',
        'clinic_latitude', 'clinic_longitude', 'geofence_radius', 'enable_geofencing',
        'enable_ip_locking', 'allowed_ips', 'uhid_prefix', 'logo_url'
    ];
    
    const keys = Object.keys(updates).filter(k => allowedColumns.includes(k));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid update fields' });
    
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => updates[k]);
    
    try {
        await db.query(`UPDATE organizations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id, ...values]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH /master-console/organizations/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/master-console/check-prefix
 */
router.get('/check-prefix', requireSuperAdmin, async (req, res) => {
    const { prefix, excludeId } = req.query;
    try {
        const query = 'SELECT id FROM organizations WHERE uhid_prefix = $1 AND id != $2';
        const result = await db.query(query, [prefix, excludeId || '00000000-0000-0000-0000-000000000000']);
        res.json({ available: result.rows.length === 0 });
    } catch (error) {
        console.error('Error in /master-console/check-prefix:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/master-console/onboard-organization
 */
router.post('/onboard-organization', requireSuperAdmin, async (req, res) => {
    const { name, email, firstName, lastName, phone, role } = req.body;
    
    try {
        // 1. Create Organization
        const orgCode = Math.floor(100000 + Math.random() * 900000).toString();
        const orgRes = await db.query(
            'INSERT INTO organizations (name, org_code, contact_email, contact_phone) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, orgCode, email, phone]
        );
        const organizationId = orgRes.rows[0].id;

        // 2. Create Admin User
        const userId = crypto.randomUUID();
        const password = Math.random().toString(36).slice(-10); // Generate temp password
        const passwordHash = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [userId, email.toLowerCase(), passwordHash, 'admin']
        );

        await db.query(
            'INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved) VALUES ($1, $2, $3, $4, $5)',
            [userId, firstName, lastName, organizationId, true]
        );

        // 3. Seed default services
        const defaultservices = [
            'Physiotherapy', 'Strength & Conditioning', 'Nutrition', 'Consultation'
        ];
        for (const serviceName of defaultservices) {
            await db.query(
                'INSERT INTO services (organization_id, name, category) VALUES ($1, $2, $3)',
                [organizationId, serviceName, 'General']
            );
        }

        res.json({ 
            success: true, 
            data: { 
                organizationId, 
                adminEmail: email, 
                tempPassword: password,
                orgCode 
            } 
        });
    } catch (error) {
        console.error('Error in /onboard-organization:', error);
        res.status(500).json({ error: error.message || 'Onboarding failed' });
    }
});

/**
 * POST /api/master-console/bulk-create-users
 */
router.post('/bulk-create-users', requireSuperAdmin, async (req, res) => {
    const { users, organizationId } = req.body;
    const results = {
        successful: 0,
        failed: 0,
        errors: []
    };

    for (const user of users) {
        try {
            const userId = crypto.randomUUID();
            const tempPassword = user.password || Math.random().toString(36).slice(-10);
            const passwordHash = await bcrypt.hash(tempPassword, 10);

            await db.query(
                'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                [userId, user.email.toLowerCase(), passwordHash, user.role]
            );

            await db.query(
                'INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved) VALUES ($1, $2, $3, $4, $5)',
                [userId, user.firstName, user.lastName, organizationId, true]
            );

            results.successful++;
        } catch (error) {
            results.failed++;
            results.errors.push({ email: user.email, error: error.message });
        }
    }

    res.json({ success: true, data: results });
});

/**
 * GET /api/master-console/packages
 */
router.get('/packages', requireSuperAdmin, async (req, res) => {
    const { organization_id } = req.query;
    try {
        const query = `
            SELECT 
                p.id, p.name, p.description, p.price,
                json_agg(
                    json_build_object(
                        'id', ps.id,
                        'sessions_included', ps.sessions_included,
                        'service', json_build_object('name', s.name)
                    )
                ) as items
            FROM packages p
            LEFT JOIN packageservices ps ON p.id = ps.package_id
            LEFT JOIN services s ON ps.service_id = s.id
            WHERE p.organization_id = $1 AND p.deleted_at IS NULL
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(query, [organization_id]);
        console.log(`[BILLING] Found ${result.rows.length} packages`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

/**
 * GET /api/master-console/injuries
 */
router.get('/injuries', requireSuperAdmin, async (req, res) => {
    const { organization_id } = req.query;
    try {
        const result = await db.query(
            'SELECT * FROM injury_master_data WHERE organization_id = $1 ORDER BY region ASC, injury_type ASC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching injuries:', error);
        res.status(500).json({ error: 'Failed to fetch injury data' });
    }
});

/**
 * DELETE /api/master-console/injuries
 */
router.delete('/injuries', requireSuperAdmin, async (req, res) => {
    const { organization_id } = req.query;
    try {
        await db.query('DELETE FROM injury_master_data WHERE organization_id = $1', [organization_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting injuries:', error);
        res.status(500).json({ error: 'Failed to clear injury data' });
    }
});

/**
 * POST /api/master-console/packages
 * Bulk upsert packages and their items
 */
router.post('/packages', requireSuperAdmin, async (req, res) => {
    const { organizationId, packages } = req.body;
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        const processedIds = [];
        
        for (const pkg of packages) {
            console.log(`[MASTER CONSOLE] Upserting package: ${pkg.name} for org: ${organizationId}`);
            const pkgRes = await client.query(
                `INSERT INTO packages (organization_id, name, description, price) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (organization_id, name) 
                 DO UPDATE SET description = EXCLUDED.description, price = EXCLUDED.price, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                 RETURNING id`,
                [organizationId, pkg.name, pkg.description, pkg.price]
            );
            const packageId = pkgRes.rows[0].id;
            console.log(`[MASTER CONSOLE] Package upserted with ID: ${packageId}`);
            processedIds.push(packageId);

            // 2. Clear existing items for this package
            await client.query('DELETE FROM packageservices WHERE package_id = $1', [packageId]);

            // 3. Insert new items
            for (const item of pkg.items) {
                // Ensure service exists or find its ID
                const serviceRes = await client.query(
                    'SELECT id FROM services WHERE organization_id = $1 AND name = $2',
                    [organizationId, item.service_name]
                );
                
                let serviceId;
                if (serviceRes.rows.length === 0) {
                    const newService = await client.query(
                        'INSERT INTO services (organization_id, name, category) VALUES ($1, $2, $3) RETURNING id',
                        [organizationId, item.service_name, 'General']
                    );
                    serviceId = newService.rows[0].id;
                } else {
                    serviceId = serviceRes.rows[0].id;
                }

                await client.query(
                    'INSERT INTO packageservices (package_id, service_id, sessions_included) VALUES ($1, $2, $3)',
                    [packageId, serviceId, item.sessions_included]
                );
            }
        }

        // 4. Soft delete packages not in the list
        if (processedIds.length > 0) {
            await client.query(
                'UPDATE packages SET deleted_at = CURRENT_TIMESTAMP WHERE organization_id = $1 AND id != ALL($2)',
                [organizationId, processedIds]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error upserting packages:', error);
        res.status(500).json({ error: error.message || 'Failed to save packages' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/master-console/injuries
 * Bulk upsert injury master data
 */
router.post('/injuries', requireSuperAdmin, async (req, res) => {
    const { organizationId, items } = req.body;
    
    try {
        let insertedCount = 0;
        for (const item of items) {
            const check = await db.query(
                `SELECT id FROM injury_master_data 
                 WHERE (organization_id = $1 OR (organization_id IS NULL AND $1 IS NULL)) 
                   AND region = $2 
                   AND injury_type = $3 
                   AND diagnosis = $4`,
                [organizationId || null, item.region, item.injury_type, item.diagnosis]
            );
            
            if (check.rows.length === 0) {
                await db.query(
                    `INSERT INTO injury_master_data (organization_id, region, injury_type, diagnosis) 
                     VALUES ($1, $2, $3, $4)`,
                    [organizationId || null, item.region, item.injury_type, item.diagnosis]
                );
                insertedCount++;
            }
        }
        res.json({ success: true, count: insertedCount });
    } catch (error) {
        console.error('Error upserting injuries:', error);
        res.status(500).json({ error: 'Failed to save injury data' });
    }
});

export default router;

