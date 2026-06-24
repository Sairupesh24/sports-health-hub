import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET Organizations for dropdown
router.get('/organizations', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ error: 'User not linked to an organization' });

        const result = await db.query(
            'SELECT name FROM clientorganizations WHERE organization_id = $1 ORDER BY name',
            [orgId]
        );
        res.json(result.rows.map(r => r.name));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new Organization
router.post('/organizations', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = await db.query(
            'INSERT INTO clientorganizations (organization_id, name) VALUES ($1, $2) ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
            [orgId, name]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Referral Sources
router.get('/referral-sources', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(
            'SELECT name FROM referralsources WHERE organization_id = $1 ORDER BY name',
            [orgId]
        );
        res.json(result.rows.map(r => r.name));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new Referral Source
router.post('/referral-sources', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { name } = req.body;
        const result = await db.query(
            'INSERT INTO referralsources (organization_id, name) VALUES ($1, $2) ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
            [orgId, name]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Client List with search and date range
router.get('/', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { search, startDate, endDate } = req.query;

        let query = `
            SELECT c.*,
                   COALESCE((
                       SELECT SUM(b.total - COALESCE((SELECT SUM(bp.amount) FROM billpayments bp WHERE bp.bill_id = b.id), 0))
                       FROM bills b
                       WHERE b.client_id = c.id AND b.status IN ('Pending', 'Partially Paid')
                   ), 0) as outstanding_balance
            FROM clients c
            WHERE c.organization_id = $1
        `;
        const params = [orgId];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.uhid ILIKE $${params.length} OR c.mobile_no ILIKE $${params.length})`;
        }

        if (startDate) {
            params.push(startDate);
            query += ` AND c.registered_on::date >= $${params.length}::date`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND c.registered_on::date <= $${params.length}::date`;
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Client by ID
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        console.log(`[DEBUG] Fetching client ${id} for org ${orgId}`);

        const clientResult = await db.query(
            'SELECT * FROM clients WHERE id = $1 AND organization_id = $2',
            [id, orgId]
        );

        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = clientResult.rows[0];

        // Fetch linked profile if exists
        const profileResult = await db.query(
            'SELECT p.id, p.ams_role, u.email FROM profiles p JOIN users u ON p.id = u.id WHERE p.uhid = $1 OR u.email = $2 LIMIT 1',
            [client.uhid, client.email]
        );
        const profile = profileResult.rows[0] || null;

        // Fetch admin remarks if user is admin
        let adminRemarks = '';
        if (req.user.role === 'admin' || req.user.role === 'super_admin') {
            const remarksResult = await db.query(
                'SELECT remarks FROM clientadminnotes WHERE client_id = $1',
                [id]
            );
            if (remarksResult.rows.length > 0) {
                adminRemarks = remarksResult.rows[0].remarks;
            }
        }

        res.json({
            ...client,
            linked_profile: profile,
            admin_remarks: adminRemarks
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Client (VIP, Remarks)
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const { is_vip, admin_remarks, assigned_consultant_id } = req.body;

        if (is_vip !== undefined) {
            await db.query(
                'UPDATE clients SET is_vip = $1 WHERE id = $2 AND organization_id = $3',
                [is_vip, id, orgId]
            );
        }

        if (admin_remarks !== undefined && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            await db.query(
                'INSERT INTO clientadminnotes (client_id, remarks, updated_by) VALUES ($1, $2, $3) ON CONFLICT (client_id) DO UPDATE SET remarks = EXCLUDED.remarks, updated_by = EXCLUDED.updated_by',
                [id, admin_remarks, req.user.id]
            );
        }

        if (assigned_consultant_id !== undefined) {
            await db.query(
                'UPDATE clients SET assigned_consultant_id = $1 WHERE id = $2 AND organization_id = $3',
                [assigned_consultant_id, id, orgId]
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client therapist history
router.get('/:id/therapist-history', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT h.id, h.client_id, h.new_consultant_id as therapist_id, h.created_at as assigned_at, h.change_reason,
                   p.first_name, p.last_name, p.profession
            FROM client_assignment_history h
            JOIN profiles p ON h.new_consultant_id = p.id
            WHERE h.client_id = $1
            ORDER BY h.created_at DESC
        `, [id]);
        
        const mapped = result.rows.map(row => ({
            ...row,
            therapist: {
                first_name: row.first_name,
                last_name: row.last_name,
                profession: row.profession
            }
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Toggle AMS Access
router.post('/:id/ams-access', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        const orgId = req.user.organization_id;

        // Find client
        const clientRes = await db.query('SELECT uhid, email, first_name, last_name FROM clients WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (clientRes.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
        const client = clientRes.rows[0];

        // Find profile
        const profileRes = await db.query(`
            SELECT p.id FROM profiles p 
            JOIN users u ON p.id = u.id 
            WHERE p.uhid = $1 OR (u.email = $2 AND u.email IS NOT NULL)
            LIMIT 1
        `, [client.uhid, client.email]);
        
        let profileId;

        if (profileRes.rows.length === 0) {
            if (!enabled) {
                return res.json({ success: true, ams_role: null });
            }

            if (!client.email) {
                return res.status(400).json({ error: 'Client must have an email address to enable AMS access.' });
            }

            // Auto-create user account
            const password = Math.random().toString(36).slice(-8);
            const bcrypt = await import('bcrypt');
            const passwordHash = await bcrypt.default.hash(password, 10);
            const userId = (await import('crypto')).randomUUID();

            const clientDb = await db.connect();
            try {
                await clientDb.query('BEGIN');
                await clientDb.query(
                    'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                    [userId, client.email, passwordHash, 'athlete']
                );
                await clientDb.query(
                    'INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved, uhid, ams_role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [userId, client.first_name, client.last_name, orgId, true, client.uhid, 'athlete']
                );
                // Try to link profile to client record (safe if column doesn't exist)
                try {
                    await clientDb.query('UPDATE clients SET profile_id = $1 WHERE id = $2', [userId, id]);
                } catch (e) {}
                
                await clientDb.query('COMMIT');
                profileId = userId;
            } catch (err) {
                await clientDb.query('ROLLBACK');
                throw err;
            } finally {
                clientDb.release();
            }
        } else {
            profileId = profileRes.rows[0].id;
            const newRole = enabled ? 'athlete' : null;
            await db.query('UPDATE profiles SET ams_role = $1 WHERE id = $2', [newRole, profileId]);
        }

        const finalRole = enabled ? 'athlete' : null;
        res.json({ success: true, ams_role: finalRole });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Client sessions
router.get('/:id/sessions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const { startDate, endDate, sessionType } = req.query;

        let query = `
            SELECT s.*, 
                   p.first_name as therapist_first_name, p.last_name as therapist_last_name,
                   psd.pain_score, psd.clinical_notes
            FROM sessions s
            LEFT JOIN profiles p ON COALESCE(s.therapist_id, s.scientist_id) = p.id
            LEFT JOIN physiosessiondetails psd ON s.id = psd.session_id
            WHERE s.client_id = $1 AND s.organization_id = $2
        `;
        const params = [id, orgId];

        if (startDate) {
            query += ` AND s.scheduled_start >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND s.scheduled_start <= $${params.length + 1}`;
            params.push(endDate);
        }
        if (sessionType && sessionType !== 'all') {
            query += ` AND s.service_type = $${params.length + 1}`;
            params.push(sessionType);
        }

        query += ' ORDER BY s.scheduled_start DESC';

        const result = await db.query(query, params);
        
        // Map to match frontend expectations
        const mapped = result.rows.map(r => ({
            ...r,
            therapist: { first_name: r.therapist_first_name, last_name: r.therapist_last_name },
            physio_session_details: r.pain_score !== null ? [{ pain_score: r.pain_score, clinical_notes: r.clinical_notes }] : []
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Client bills
router.get('/:id/bills', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            SELECT b.*, 
                   r.name as referral_source_name
            FROM bills b
            LEFT JOIN referralsources r ON b.referral_source_id = r.id
            WHERE b.client_id = $1 AND b.organization_id = $2 AND b.deleted_at IS NULL
            ORDER BY b.created_at DESC
        `, [id, orgId]);

        // For each bill, fetch items and payments
        const bills = await Promise.all(result.rows.map(async (bill) => {
            const items = await db.query(`
                SELECT bi.*, p.name as package_name
                FROM billitems bi
                LEFT JOIN servicepackages p ON bi.package_id = p.id
                WHERE bi.bill_id = $1
            `, [bill.id]);

            const payments = await db.query(`
                SELECT SUM(amount) as paid FROM billpayments WHERE bill_id = $1
            `, [bill.id]);

            return {
                ...bill,
                referral_sources: { name: bill.referral_source_name },
                packages: { name: items.rows[0]?.package_name || 'Multiple/Custom' },
                paid_amount: Number(payments.rows[0].paid || 0),
                remaining_due: Math.max(0, Number(bill.total) - Number(payments.rows[0].paid || 0))
            };
        }));

        res.json(bills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Client refunds
router.get('/:id/refunds', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const result = await db.query(
            'SELECT * FROM refunds WHERE client_id = $1 AND organization_id = $2 ORDER BY created_at DESC',
            [id, orgId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Client Enquiry Context
router.get('/:id/enquiry', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            SELECT e.*, 
                   TRIM(e.first_name || ' ' || COALESCE(e.last_name, '')) as name,
                   e.mobile_no as contact,
                   o.name as org_name, o.logo_url
            FROM enquiries e
            LEFT JOIN Organizations o ON e.organization_id = o.id
            WHERE e.linked_client_id = $1 AND e.organization_id = $2
            LIMIT 1
        `, [id, orgId]);

        res.json({ data: result.rows[0] || null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Enquiry (Auth)
router.post('/enquiries', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { name, contact, first_name, last_name, mobile_no, ...rest } = req.body;
        
        let fName = first_name;
        let lName = last_name;
        
        if (name && !fName) {
            const parts = name.split(' ');
            fName = parts[0];
            lName = parts.slice(1).join(' ');
        }
        
        const keys = ['organization_id', 'first_name', 'last_name', 'mobile_no', ...Object.keys(rest)];
        const values = [orgId, fName, lName, contact || mobile_no, ...Object.values(rest)];
        
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO enquiries (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET All Enquiries for Org
router.get('/enquiries/all', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT *,
                   TRIM(first_name || ' ' || COALESCE(last_name, '')) as name,
                   mobile_no as contact
            FROM enquiries 
            WHERE organization_id = $1 
            ORDER BY created_at DESC
        `, [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Enquiry Interactions
router.get('/enquiries/:id/interactions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT ei.*, p.first_name, p.last_name
            FROM enquiryinteractions ei
            LEFT JOIN profiles p ON ei.created_by = p.id
            WHERE ei.enquiry_id = $1
            ORDER BY ei.created_at ASC
        `, [id]);

        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Interaction
router.post('/enquiries/:id/interactions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { interaction_type, response_text, follow_up_required, follow_up_at } = req.body;
        const userId = req.user.id;
        
        const result = await db.query(`
            INSERT INTO enquiryinteractions (enquiry_id, interaction_type, response_text, follow_up_required, follow_up_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [id, interaction_type, response_text, follow_up_required || false, follow_up_at || null, userId]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Enquiry (Status, etc.)
router.patch('/enquiries/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const orgId = req.user.organization_id;
        
        const keys = Object.keys(updates);
        if (keys.length === 0) return res.status(400).json({ error: 'No updates provided' });
        
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = Object.values(updates);
        values.push(id, orgId);
        
        const query = `UPDATE enquiries SET ${setClause} WHERE id = $${keys.length + 1} AND organization_id = $${keys.length + 2} RETURNING *`;
        
        const result = await db.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Enquiry not found' });
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Register Client
router.post('/register', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const orgId = req.user.organization_id;
        if (!orgId) throw new Error('Organization link missing');

        await client.query('BEGIN');

        // 1. Generate UHID
        const uhidRes = await client.query('SELECT generate_uhid_func($1) as uhid', [orgId]);
        const uhid = uhidRes.rows[0].uhid;

        // 2. Insert Client
        const {
            honorific, first_name, middle_name, last_name, gender, mobile_no,
            aadhaar_no, blood_group, dob, age, email, alternate_mobile_no,
            occupation, sport, athlete_type, org_name, address, locality,
            pincode, city, district, state, country, has_insurance,
            insurance_provider, insurance_policy_no, insurance_validity,
            insurance_coverage_amount, is_vip, referral_source, referral_source_detail,
            admin_remarks, document_paths
        } = req.body;

        const insertQuery = `
            INSERT INTO clients (
                organization_id, uhid, honorific, first_name, middle_name, last_name,
                gender, mobile_no, aadhaar_no, blood_group, dob, age, email,
                alternate_mobile_no, occupation, sport, athlete_type, org_name,
                address, locality, pincode, city, district, state, country,
                has_insurance, insurance_provider, insurance_policy_no,
                insurance_validity, insurance_coverage_amount, is_vip,
                referral_source, referral_source_detail, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
            RETURNING id
        `;

        const values = [
            orgId, uhid, honorific, first_name, middle_name, last_name,
            gender, mobile_no, aadhaar_no, blood_group, dob || null, age, email,
            alternate_mobile_no, occupation, sport, athlete_type, org_name,
            address, locality, pincode, city, district, state, country,
            has_insurance, insurance_provider, insurance_policy_no,
            insurance_validity || null, insurance_coverage_amount, is_vip,
            referral_source, referral_source_detail, req.user.id
        ];

        const clientRes = await client.query(insertQuery, values);
        const clientId = clientRes.rows[0].id;

        // 3. Handle Admin Remarks
        if (admin_remarks && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            await client.query(
                'INSERT INTO clientadminnotes (client_id, remarks, updated_by) VALUES ($1, $2, $3)',
                [clientId, admin_remarks, req.user.id]
            );
        }

        // 4. Handle Documents (if paths provided from upload)
        if (document_paths && Array.isArray(document_paths)) {
            for (const doc of document_paths) {
                await client.query(`
                    INSERT INTO clientdocuments (
                        client_id, organization_id, document_name, category, 
                        file_path, uploaded_by, uploaded_by_role
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    clientId, orgId, doc.name, doc.category || 'Other', 
                    doc.path, req.user.id, req.user.role || 'Staff'
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, uhid, clientId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration Error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET client by profile_id
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT * FROM clients WHERE profile_id = $1', [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST bulk clients
router.post('/bulk', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { clients } = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        const results = [];
        
        for (const c of clients) {
            // Generate UHID if not provided
            let uhid = c.uhid;
            if (!uhid) {
                const uhidRes = await client.query('SELECT generate_uhid_func($1) as generate_uhid', [orgId]);
                uhid = uhidRes.rows[0].generate_uhid;
            }
            
            const keys = Object.keys(c).filter(k => k !== 'uhid' && k !== 'organization_id');
            const placeholders = keys.map((_, i) => `$${i + 3}`).join(', ');
            const values = keys.map(k => c[k]);
            
            await client.query(`
                INSERT INTO clients (organization_id, uhid, ${keys.join(', ')})
                VALUES ($1, $2, ${placeholders})
            `, [orgId, uhid, ...values]);
            results.push({ uhid, first_name: c.first_name, last_name: c.last_name });
        }
        
        await client.query('COMMIT');
        res.status(201).json({ success: true, count: results.length });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET client field config
router.get('/field-config', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT * FROM client_field_config WHERE organization_id = $1
        `, [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST/PUT client field config (upsert)
router.post('/field-config', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { configs } = req.body; // Array of {field_name, is_mandatory}
        
        for (const config of configs) {
            await db.query(`
                INSERT INTO client_field_config (organization_id, field_name, is_mandatory, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (organization_id, field_name)
                DO UPDATE SET is_mandatory = EXCLUDED.is_mandatory, updated_at = NOW()
            `, [orgId, config.field_name, config.is_mandatory]);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client admin notes
router.get('/:id/admin-notes', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT remarks FROM client_admin_notes 
            WHERE client_id = $1 AND organization_id = $2
        `, [id, orgId]);
        
        res.json(result.rows[0] || { remarks: "" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client groups
router.get('/groups/all', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT cg.*, 
                   (SELECT json_agg(m.client_id) FROM client_group_members m WHERE m.group_id = cg.id) as client_group_members
            FROM client_groups cg
            WHERE cg.organization_id = $1
            ORDER BY cg.created_at DESC
        `, [orgId]);
        
        // Map to match frontend expected structure {client_id: string}[]
        const mapped = result.rows.map(row => ({
            ...row,
            client_group_members: (row.client_group_members || []).map(id => ({ client_id: id }))
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Client Group
router.post('/groups', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        
        const result = await db.query(`
            INSERT INTO client_groups (organization_id, name, created_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [orgId, name, userId]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Update Group Members
router.post('/groups/:id/members', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { memberIds } = req.body;
        const userId = req.user.id;
        
        await client.query('BEGIN');
        
        // Delete existing
        await client.query('DELETE FROM client_group_members WHERE group_id = $1', [id]);
        
        // Insert new
        if (memberIds && memberIds.length > 0) {
            for (const memberId of memberIds) {
                await client.query(`
                    INSERT INTO client_group_members (group_id, client_id, added_by)
                    VALUES ($1, $2, $3)
                `, [id, memberId, userId]);
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

// DELETE Client Group
router.delete('/groups/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        
        await db.query('DELETE FROM client_groups WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
