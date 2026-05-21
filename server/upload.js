import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';

const router = express.Router();

// Ensure upload directory exists — use absolute path to be CWD-independent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit to support high-res mobile uploads
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp|heic|heif|pdf/i;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype === 'application/octet-stream';
        
        if (extname || mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, PNG, WEBP, HEIC) and PDFs are allowed'));
        }
    }
});

router.post('/logo', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ publicUrl });
});

router.post('/documents', upload.array('documents', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const results = req.files.map(file => ({
        name: file.originalname,
        type: file.mimetype,
        path: `/uploads/${file.filename}`
    }));
    
    res.json({ files: results });
});

router.post('/single', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const publicUrl = `/uploads/${req.file.filename}`;
        res.json({ publicUrl });
    });
});

// GET Signed URL for a document
router.get('/url', async (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) return res.status(400).json({ error: 'Path is required' });

        // If it's a local upload
        if (filePath.startsWith('/uploads')) {
            return res.json({ signedUrl: filePath });
        }

        // Legacy Supabase signed URL generation via REST API
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return res.status(500).json({ error: 'Supabase credentials missing on backend' });
        }

        const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/client-documents/${filePath}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ expiresIn: 3600 })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to sign URL');

        // The signedURL returned is a relative path like /storage/v1/render/image/signed/...
        // We need to prepend the Supabase URL
        res.json({ signedUrl: `${supabaseUrl}${data.signedURL}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
