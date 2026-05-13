import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Storage for report templates
const templateDir = 'public/uploads/templates';
if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, templateDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.docx', '.dotx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .docx and .dotx files are allowed'));
        }
    }
});

// --- Clinical Templates Management ---

// GET List Templates
router.get('/templates', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM report_templates WHERE organization_id = $1 ORDER BY created_at DESC', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Upload Template
router.post('/templates', requireAuth, upload.single('template'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { name, description } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            INSERT INTO report_templates (organization_id, name, file_path, description, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [orgId, name || req.file.originalname, `/uploads/templates/${req.file.filename}`, description || '', req.user.id]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Template
router.delete('/templates/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        
        // Find file path to delete from disk
        const findRes = await db.query('SELECT file_path FROM report_templates WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (findRes.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
        
        const filePath = path.join('public', findRes.rows[0].file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        await db.query('DELETE FROM report_templates WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Legacy Report Generation ---

router.post('/generate', requireAuth, async (req, res) => {
    const { module, templateId, filters } = req.body;
    const orgId = req.user.organization_id;
    const { startDate, endDate, athleteId } = filters || {};
    
    try {
        let results = [];
        
        switch (module) {
            case "registration":
                if (templateId === "client_list") {
                    let sql = `SELECT uhid, first_name, last_name, email, mobile_no, registered_on 
                               FROM clients 
                               WHERE organization_id = $1 AND deleted_at IS NULL`;
                    const params = [orgId];
                    if (startDate) {
                        params.push(startDate);
                        sql += ` AND registered_on >= $${params.length}`;
                    }
                    if (endDate) {
                        params.push(endDate);
                        sql += ` AND registered_on <= $${params.length}`;
                    }
                    sql += ` ORDER BY registered_on DESC`;
                    const resData = await db.query(sql, params);
                    results = resData.rows.map(c => ({
                        ...c,
                        full_name: `${c.first_name} ${c.last_name}`,
                        registered_on: c.registered_on
                    }));
                }
                break;
                
            case "billing":
                if (templateId === "full_transaction_ledger") {
                    let bSql = `SELECT b.id, b.total, b.status, b.payment_method, b.created_at, b.billed_by_name, 
                                       c.first_name, c.last_name 
                                FROM bills b
                                LEFT JOIN clients c ON b.client_id = c.id
                                WHERE b.organization_id = $1 AND b.deleted_at IS NULL`;
                    const bParams = [orgId];
                    
                    if (startDate) {
                        bParams.push(startDate);
                        bSql += ` AND b.created_at >= $${bParams.length}`;
                    }
                    if (endDate) {
                        bParams.push(endDate);
                        bSql += ` AND b.created_at <= $${bParams.length}`;
                    }
                    
                    const billsRes = await db.query(bSql, bParams);
                    const bills = billsRes.rows.map(b => ({
                        date: b.created_at,
                        type: "INVOICE",
                        reference: b.id.substring(0, 8).toUpperCase(),
                        client_name: `${b.first_name} ${b.last_name}`,
                        staff: b.billed_by_name || "System",
                        amount: `Rs. ${Number(b.total).toFixed(2)}`,
                        mode: b.payment_method || "—",
                        status: b.status,
                        _date: new Date(b.created_at).getTime()
                    }));
                    
                    // Add refunds if table exists
                    results = bills; // Simplified for now
                }
                break;
                
            case "clients":
                if (templateId === "workout_schedule") {
                    if (!athleteId) return res.status(400).json({ error: 'Athlete ID required' });
                    // Logic to fetch workouts for athlete
                    // Similar to reportModules.ts but using PG queries
                }
                break;
        }
        
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
