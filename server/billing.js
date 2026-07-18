import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET entitlement balance for a client
router.get('/entitlements/balance/:clientId', requireAuth, async (req, res) => {
    try {
        const { clientId } = req.params;
        const orgId = req.user.organization_id;

        const query = `
            SELECT 
                service_type,
                SUM(granted_sessions) as total_granted,
                SUM(sessions_used) as total_used,
                (SUM(granted_sessions) - SUM(sessions_used)) as sessions_remaining
            FROM cliententitlements
            WHERE client_id = $1 AND organization_id = $2 AND status = 'active'
            GROUP BY service_type
        `;
        
        const result = await db.query(query, [clientId, orgId]);
        
        const balances = result.rows.map(row => ({
            service_name: row.service_type,
            total_purchased: parseInt(row.total_granted),
            sessions_used: parseInt(row.total_used),
            sessions_remaining: parseInt(row.sessions_remaining)
        }));

        const byServiceName = {};
        result.rows.forEach(row => {
            byServiceName[row.service_type.toLowerCase().trim()] = parseInt(row.sessions_remaining);
        });

        // Fetch detailed entitlements with package names
        const pkgQuery = `
            SELECT 
                ce.service_type,
                ce.granted_sessions as total_granted,
                ce.sessions_used as total_used,
                (ce.granted_sessions - ce.sessions_used) as sessions_remaining,
                COALESCE(sp.name, 'Direct Purchase') as package_name
            FROM cliententitlements ce
            LEFT JOIN billitems bi ON ce.bill_item_id = bi.id
            LEFT JOIN servicepackages sp ON bi.package_id = sp.id
            WHERE ce.client_id = $1 AND ce.organization_id = $2 AND ce.status = 'active'
        `;
        const pkgResult = await db.query(pkgQuery, [clientId, orgId]);
        const packageEntitlements = pkgResult.rows.map(row => ({
            service_name: row.service_type,
            total_purchased: parseInt(row.total_granted) || 0,
            sessions_used: parseInt(row.total_used) || 0,
            sessions_remaining: parseInt(row.sessions_remaining) || 0,
            package_name: row.package_name
        }));

        res.json({ balances, byServiceName, packageEntitlements });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all packages
router.get('/packages', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        console.log(`[BILLING] Fetching packages for org: ${orgId}`);
        const result = await db.query('SELECT * FROM servicepackages WHERE organization_id = $1', [orgId]);
        console.log(`[BILLING] Found ${result.rows.length} packages for org: ${orgId}`);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all services
router.get('/services', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { is_active } = req.query;
        let query = 'SELECT * FROM services WHERE organization_id = $1';
        const params = [orgId];
        
        if (is_active !== undefined) {
            query += ' AND is_active = $2';
            params.push(is_active === 'true');
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        // Fallback for dev if table doesn't exist yet
        res.json([
            { id: 'physio', name: 'Physiotherapy', category: 'Clinical' },
            { id: 'sc', name: 'Strength & Conditioning', category: 'Performance' }
        ]);
    }
});

// GET billing stats
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        
        // Total Revenue (Total of all Paid/Partially Paid bills)
        const totalRevenue = await db.query(`
            SELECT SUM(total) as total FROM bills 
            WHERE organization_id = $1 AND status != 'Pending'
        `, [orgId]);

        // Pending Revenue
        const pendingRevenue = await db.query(`
            SELECT SUM(total - COALESCE((SELECT SUM(amount) FROM billpayments WHERE bill_id = bills.id), 0)) as pending
            FROM bills
            WHERE organization_id = $1 AND status != 'Paid'
        `, [orgId]);

        // Today's Collections
        const todayCollections = await db.query(`
            SELECT SUM(amount) as total FROM billpayments
            WHERE organization_id = $1 AND DATE(created_at) = CURRENT_DATE
        `, [orgId]);

        // Payment Method Distribution
        const methods = await db.query(`
            SELECT payment_method, SUM(amount) as total
            FROM billpayments
            WHERE organization_id = $1
            GROUP BY payment_method
        `, [orgId]);

        res.json({
            total_revenue: parseFloat(totalRevenue.rows[0].total || 0),
            pending_revenue: parseFloat(pendingRevenue.rows[0].pending || 0),
            today_collections: parseFloat(todayCollections.rows[0].total || 0),
            payment_methods: methods.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all bills/invoices
router.get('/invoices', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { client_id, status } = req.query;

        let query = `
            SELECT b.*, 
                   c.first_name as client_first_name, c.last_name as client_last_name, c.uhid as client_uhid, c.is_vip as client_is_vip,
                   r.name as referral_source_name,
                   o.name as organization_name, o.logo_url as organization_logo, o.official_name as organization_official_name, o.official_address as organization_official_address,
                   s.first_name as staff_first_name, s.last_name as staff_last_name
            FROM bills b
            LEFT JOIN clients c ON b.client_id = c.id
            LEFT JOIN referralsources r ON b.referral_source_id = r.id
            LEFT JOIN organizations o ON b.organization_id = o.id
            LEFT JOIN profiles s ON b.billed_by_id = s.id
            WHERE b.organization_id = $1
        `;
        const params = [orgId];

        if (client_id) {
            query += ` AND b.client_id = $${params.length + 1}`;
            params.push(client_id);
        }
        if (status && status !== 'All') {
            query += ` AND b.status = $${params.length + 1}`;
            params.push(status);
        }

        query += ' ORDER BY b.created_at DESC';

        const result = await db.query(query, params);

        // For each bill, fetch items and payments
        const bills = await Promise.all(result.rows.map(async (bill) => {
            const items = await db.query(`
                SELECT bi.*, p.name as package_name, bi.package_id
                FROM billitems bi
                LEFT JOIN servicepackages p ON bi.package_id = p.id
                WHERE bi.bill_id = $1
            `, [bill.id]);

            const itemsWithEntitlements = await Promise.all(items.rows.map(async (i) => {
                let entitlements = [];
                if (i.package_id) {
                    const services = await db.query(`
                        SELECT ps.*, s.name as service_type, ps.sessions_included as default_sessions
                        FROM packageservices ps
                        JOIN services s ON ps.service_id = s.id
                        WHERE ps.package_id = $1
                    `, [i.package_id]);
                    entitlements = services.rows;
                }
                return {
                    ...i,
                    name: i.package_name || 'Custom',
                    price: parseFloat(i.total),
                    entitlements
                };
            }));

            const payments = await db.query(`
                SELECT SUM(amount) as paid FROM billpayments WHERE bill_id = $1
            `, [bill.id]);

            const staffName = bill.staff_first_name 
                ? `${bill.staff_first_name} ${bill.staff_last_name}`
                : (bill.billing_staff_name && bill.billing_staff_name !== "undefined undefined" ? bill.billing_staff_name : "Staff User");

            return {
                ...bill,
                client_name: `${bill.client_first_name} ${bill.client_last_name}`,
                billing_staff_name: staffName,
                billed_by_name: staffName,
                paid_amount: parseFloat(payments.rows[0].paid || 0),
                remaining_due: parseFloat(bill.total) - parseFloat(payments.rows[0].paid || 0),
                items: itemsWithEntitlements
            };
        }));

        res.json(bills);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET referral sources
router.get('/referral-sources', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM referralsources WHERE organization_id = $1 ORDER BY name', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST referral source
router.post('/referral-sources', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const orgId = req.user.organization_id;
        const result = await db.query(
            'INSERT INTO referralsources (organization_id, name) VALUES ($1, $2) RETURNING *',
            [orgId, name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET subscriptions
router.get('/subscriptions', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT s.*, 
                   c.first_name as client_first_name, c.last_name as client_last_name, c.uhid as client_uhid, 
                   c.mobile_no as client_mobile_no, c.is_vip as client_is_vip, c.sport as client_sport,
                   p.name as package_name, p.price as package_price
            FROM subscriptions s
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN servicepackages p ON s.package_id = p.id
            WHERE s.organization_id = $1
            ORDER BY s.created_at DESC
        `, [orgId]);

        const mapped = result.rows.map(row => ({
            ...row,
            client: { 
                id: row.client_id,
                first_name: row.client_first_name, 
                last_name: row.client_last_name, 
                uhid: row.client_uhid,
                mobile_no: row.client_mobile_no,
                is_vip: row.client_is_vip,
                sport: row.client_sport
            },
            package: { name: row.package_name, price: row.package_price }
        }));

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create invoice
router.post('/invoices', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { client_id, subtotal, discount, tax_amount, total, referral_source_id, notes, include_notes_in_invoice, discount_authorized_by, items } = req.body;
        const orgId = req.user.organization_id;
        const staffId = req.user.id;
        
        // Fetch staff name from profiles
        const staffProfile = await client.query('SELECT first_name, last_name FROM profiles WHERE id = $1', [staffId]);
        const staffName = staffProfile.rows.length > 0 
            ? `${staffProfile.rows[0].first_name} ${staffProfile.rows[0].last_name}`
            : 'Staff User';

        await client.query('BEGIN');

        // 1. Create Bill
        const billResult = await client.query(`
            INSERT INTO bills (
                organization_id, client_id, amount, discount, tax_amount, total, status, 
                referral_source_id, notes, include_notes_in_invoice, 
                discount_authorized_by, billed_by_id, billed_by_name, billing_staff_name
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9, $10, $11, $12, $12)
            RETURNING *
        `, [
            orgId, client_id, subtotal, discount, tax_amount || 0, total, referral_source_id || null, 
            notes, include_notes_in_invoice || false, discount_authorized_by || null,
            staffId, staffName
        ]);
        const bill = billResult.rows[0];

        // 2. Create Bill Items
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(`
                    INSERT INTO billitems (organization_id, bill_id, package_id, amount, discount, tax_amount, total)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [orgId, bill.id, item.package_id, item.amount, item.discount || 0, item.tax_amount || 0, item.total]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json(bill);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST record payment
router.post('/payments', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { bill_id, payments } = req.body; // payments is an array of { amount, method, transactionId }
        const orgId = req.user.organization_id;
        const staffId = req.user.id;

        await client.query('BEGIN');

        // 1. Get Bill Info
        const billResult = await client.query('SELECT * FROM bills WHERE id = $1 AND organization_id = $2', [bill_id, orgId]);
        if (billResult.rows.length === 0) throw new Error('Bill not found');
        const bill = billResult.rows[0];

        // 2. Record Payments
        let totalPaidInThisAction = 0;
        for (const p of payments) {
            await client.query(`
                INSERT INTO billpayments (
                    organization_id, bill_id, client_id, amount, payment_method, transaction_id, recorded_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [orgId, bill_id, bill.client_id, p.amount, p.method, p.transactionId, staffId]);
            totalPaidInThisAction += parseFloat(p.amount);
        }

        // 3. Update Bill Status
        const existingPayments = await client.query('SELECT SUM(amount) as paid FROM billpayments WHERE bill_id = $1', [bill_id]);
        const totalPaidSoFar = parseFloat(existingPayments.rows[0].paid || 0);
        
        const isFullyPaid = totalPaidSoFar >= parseFloat(bill.total) - 0.01;
        await client.query('UPDATE bills SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
            isFullyPaid ? 'Paid' : 'Partially Paid',
            bill_id
        ]);

        // 4. Grant Entitlements (if fully paid or as per policy - usually on payment)
        // For simplicity, we'll grant all entitlements from the bill items if not already granted
        const billItems = await client.query(`
            SELECT bi.*, p.name as package_name
            FROM billitems bi
            JOIN servicepackages p ON bi.package_id = p.id
            WHERE bi.bill_id = $1
        `, [bill_id]);

        for (const item of billItems.rows) {
            // Get services in this package
            const services = await client.query(`
                SELECT ps.*, s.name as service_name
                FROM packageservices ps
                JOIN services s ON ps.service_id = s.id
                WHERE ps.package_id = $1
            `, [item.package_id]);

            for (const s of services.rows) {
                await client.query(`
                    INSERT INTO cliententitlements (
                        organization_id, client_id, service_id, service_type, granted_sessions, sessions_used, status, bill_item_id
                    ) VALUES ($1, $2, $3, $4, $5, 0, 'active', $6)
                `, [orgId, bill.client_id, s.service_id, s.service_name, s.sessions_included, item.id]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, status: isFullyPaid ? 'Paid' : 'Partially Paid' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET calculate refund for an invoice
router.get('/invoices/:id/calculate-refund', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        // 1. Fetch Bill and Items
        const billResult = await db.query('SELECT * FROM bills WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (billResult.rows.length === 0) throw new Error('Bill not found');
        const bill = billResult.rows[0];

        const itemsResult = await db.query(`
            SELECT bi.*, p.name as package_name
            FROM billitems bi
            JOIN servicepackages p ON bi.package_id = p.id
            WHERE bi.bill_id = $1
        `, [id]);

        // 2. Fetch Balances
        const balancesResult = await db.query(`
            SELECT service_type, SUM(granted_sessions) as total_granted, SUM(sessions_used) as total_used
            FROM cliententitlements
            WHERE client_id = $1 AND organization_id = $2 AND status = 'active'
            GROUP BY service_type
        `, [bill.client_id, orgId]);
        const balances = balancesResult.rows;

        let totalRefund = 0;
        const breakdown = [];

        for (const item of itemsResult.rows) {
            // Fetch services in package
            const services = await db.query(`
                SELECT ps.*, s.name as service_name
                FROM packageservices ps
                JOIN services s ON ps.service_id = s.id
                WHERE ps.package_id = $1
            `, [item.package_id]);

            const itemTotal = parseFloat(item.total);
            const totalSessionsInPkg = services.rows.reduce((sum, s) => sum + s.sessions_included, 0);
            const pricePerSession = itemTotal / (totalSessionsInPkg || 1);

            for (const s of services.rows) {
                const balance = balances.find(b => b.service_type === s.service_name);
                const globalRemaining = balance ? (parseInt(balance.total_granted) - parseInt(balance.total_used)) : s.sessions_included;
                const remainingForThisItem = Math.min(s.sessions_included, globalRemaining);
                
                const refundForService = remainingForThisItem * pricePerSession;
                totalRefund += refundForService;

                breakdown.push({
                    serviceName: `${item.package_name}: ${s.service_name}`,
                    remaining: remainingForThisItem,
                    totalPurchased: s.sessions_included,
                    calculatedRefund: refundForService
                });
            }
        }

        res.json({ totalRefund, breakdown, billTotal: parseFloat(bill.total) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST process refund
router.post('/refunds', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { billId, clientId, amount, refundMode, transactionId, refundProofUrl, notes, isOverride, authorizedBy, reverseEntitlements } = req.body;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        // 1. Insert Refund
        const refundResult = await client.query(`
            INSERT INTO refunds (
                bill_id, client_id, organization_id, amount, refund_mode, transaction_id, 
                refund_proof_url, notes, is_override, authorized_by, is_entitlement_reversed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            billId, clientId, orgId, amount, refundMode, transactionId || null,
            refundProofUrl || null, notes || null, isOverride || false, authorizedBy || null,
            reverseEntitlements || false
        ]);
        const refund = refundResult.rows[0];

        // 2. Reverse Entitlements if requested
        if (reverseEntitlements) {
            await client.query(`
                UPDATE cliententitlements 
                SET status = 'Cancelled', notes = $1
                WHERE bill_item_id IN (SELECT id FROM billitems WHERE bill_id = $2)
            `, [`Refunded on ${new Date().toISOString()}`, billId]);
        }

        // 3. Update Bill Status if fully refunded (optional logic, usually keeps as 'Paid' but shows refund linked)
        // For now we just record it.

        await client.query('COMMIT');
        res.status(201).json(refund);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// DEBUG: Dump all packages in the system (no org filter)
router.get('/debug/packages', async (req, res) => {
    try {
        const pkgRes = await db.query('SELECT * FROM packages');
        const viewRes = await db.query('SELECT * FROM servicepackages');
        res.json({
            packages: pkgRes.rows,
            servicepackages_view: viewRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create subscription
router.post('/subscriptions', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { client_id, package_id, billing_cycle, start_date, package_name, package_price } = req.body;
        const orgId = req.user.organization_id;
        const staffId = req.user.id;

        // Fetch staff name from profiles
        const staffProfile = await client.query('SELECT first_name, last_name FROM profiles WHERE id = $1', [staffId]);
        const staffName = staffProfile.rows.length > 0 
            ? `${staffProfile.rows[0].first_name} ${staffProfile.rows[0].last_name}`
            : 'Staff User';

        await client.query('BEGIN');

        // Calculate next billing date based on start_date and cycle
        let monthsToAdd = 1;
        if (billing_cycle === 'Quarterly') monthsToAdd = 3;
        else if (billing_cycle === 'Annual') monthsToAdd = 12;
        
        const nextBillingDate = new Date(start_date);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + monthsToAdd);
        const nextBillingStr = nextBillingDate.toISOString().split('T')[0];

        // 1. Create Subscription
        const subResult = await client.query(`
            INSERT INTO subscriptions (organization_id, client_id, package_id, billing_cycle, current_period_start, next_billing_date, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Active')
            RETURNING *
        `, [orgId, client_id, package_id, billing_cycle, start_date, nextBillingStr]);
        const sub = subResult.rows[0];

        // 2. Create Initial Bill
        const notes = `Initial membership bill for ${package_name || 'Package'}`;
        const billResult = await client.query(`
            INSERT INTO bills (
                organization_id, client_id, amount, total, status, date, notes, subscription_id, package_id, billed_by_id, billed_by_name, billing_staff_name
            ) VALUES ($1, $2, $3, $3, 'Pending', $4, $5, $6, $7, $8, $9, $9)
            RETURNING *
        `, [orgId, client_id, package_price || 0, start_date, notes, sub.id, package_id, staffId, staffName]);
        const bill = billResult.rows[0];

        // 3. Create Bill Item
        await client.query(`
            INSERT INTO billitems (organization_id, bill_id, package_id, amount, total)
            VALUES ($1, $2, $3, $4, $4)
        `, [orgId, bill.id, package_id, package_price || 0]);

        await client.query('COMMIT');
        res.status(201).json(sub);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST generate early invoice for subscription
router.post('/subscriptions/:id/generate-invoice', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        await client.query('BEGIN');

        const subResult = await client.query('SELECT s.*, p.name as package_name, p.price as package_price FROM subscriptions s LEFT JOIN servicepackages p ON s.package_id = p.id WHERE s.id = $1 AND s.organization_id = $2', [id, orgId]);
        if (subResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const sub = subResult.rows[0];

        const notes = `Billing cycle invoice for ${sub.package_name || 'Package'}`;
        const billResult = await client.query(`
            INSERT INTO bills (
                organization_id, client_id, amount, total, status, date, notes, subscription_id, package_id, billed_by_name, billing_staff_name
            ) VALUES ($1, $2, $3, $3, 'Pending', CURRENT_DATE, $4, $5, $6, 'Staff User', 'Staff User')
            RETURNING *
        `, [orgId, sub.client_id, sub.package_price || 0, notes, id, sub.package_id]);
        const bill = billResult.rows[0];

        await client.query(`
            INSERT INTO billitems (organization_id, bill_id, package_id, amount, total)
            VALUES ($1, $2, $3, $4, $4)
        `, [orgId, bill.id, sub.package_id, sub.package_price || 0]);

        await client.query('COMMIT');
        res.status(201).json(bill);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});



// POST cancel subscription
router.post('/subscriptions/:id/cancel', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        await db.query(
            `UPDATE subscriptions SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND organization_id = $2`,
            [id, orgId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create package
router.post('/packages', requireAuth, async (req, res) => {
    try {
        const { name, price, is_recurring } = req.body;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            INSERT INTO packages (organization_id, name, price, is_recurring)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [orgId, name, price, is_recurring || false]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET dunning alerts
router.get('/dunning-alerts', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT s.*, 
                   json_build_object('id', c.id, 'first_name', c.first_name, 'last_name', c.last_name, 'uhid', c.uhid) as client
            FROM subscriptions s
            JOIN clients c ON s.client_id = c.id
            WHERE s.organization_id = $1 AND s.status IN ('Past Due', 'Suspended')
            ORDER BY s.dunning_step DESC
        `, [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client dues
router.get('/dues', requireAuth, async (req, res) => {
    try {
        const { client_id } = req.query;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT SUM(total) as total_dues
            FROM bills
            WHERE client_id = $1 AND organization_id = $2 AND status != 'Paid'
        `, [client_id, orgId]);
        
        res.json({ dues: result.rows[0].total_dues || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export async function processRecurringSubscriptions() {
    console.log('[SCHEDULER] Checking recurring subscriptions...');
    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN');
        
        // Find subscriptions whose next_billing_date is today or in the past, and status is 'Active'
        const query = `
            SELECT s.*, p.name as package_name, p.price as package_price
            FROM subscriptions s
            JOIN servicepackages p ON s.package_id = p.id
            WHERE s.status = 'Active' AND s.next_billing_date <= CURRENT_DATE
        `;
        const res = await client.query(query);
        console.log(`[SCHEDULER] Found ${res.rows.length} subscriptions due for billing.`);
        
        for (const sub of res.rows) {
            // 1. Create a bill for this cycle
            const notes = `Billing cycle invoice for ${sub.package_name || 'Package'}`;
            const billResult = await client.query(`
                INSERT INTO bills (
                    organization_id, client_id, amount, total, status, date, notes, subscription_id, package_id, billed_by_name, billing_staff_name
                ) VALUES ($1, $2, $3, $3, 'Pending', CURRENT_DATE, $4, $5, $6, 'System Scheduler', 'System Scheduler')
                RETURNING *
            `, [sub.organization_id, sub.client_id, sub.package_price || 0, notes, sub.id, sub.package_id]);
            const bill = billResult.rows[0];
            
            // 2. Create corresponding bill item
            await client.query(`
                INSERT INTO billitems (organization_id, bill_id, package_id, amount, total)
                VALUES ($1, $2, $3, $4, $4)
            `, [sub.organization_id, bill.id, sub.package_id, sub.package_price || 0]);
            
            // 3. Update subscription next billing date based on billing cycle
            let monthsToAdd = 1;
            if (sub.billing_cycle === 'Quarterly') monthsToAdd = 3;
            else if (sub.billing_cycle === 'Annual') monthsToAdd = 12;
            
            const nextBillingDate = new Date(sub.next_billing_date);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + monthsToAdd);
            const nextBillingStr = nextBillingDate.toISOString().split('T')[0];
            
            await client.query(`
                UPDATE subscriptions
                SET last_billing_date = next_billing_date,
                    next_billing_date = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [nextBillingStr, sub.id]);
            
            console.log(`[SCHEDULER] Generated invoice ${bill.id} for subscription ${sub.id}. Next billing: ${nextBillingStr}`);
        }
        
        await client.query('COMMIT');
    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackErr) {
                console.error('[SCHEDULER] Rollback error:', rollbackErr);
            }
        }
        console.error('[SCHEDULER] Error processing subscriptions:', error);
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Run immediately on startup (after 5 seconds to let db initialize)
setTimeout(processRecurringSubscriptions, 5000);
// Check every hour
setInterval(processRecurringSubscriptions, 3600000);

export default router;
