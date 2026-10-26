import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'kb-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB image limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (PNG, JPG, WEBP, GIF, SVG) are allowed for Knowledge Base'));
        }
    }
});

/**
 * Helper to check if the user is authorized to edit the Knowledge Base.
 * Admins, Super Admins, or users with profiles.has_kb_edit_access === true are authorized.
 */
async function canUserEditKB(userId, userRole) {
    if (userRole === 'admin' || userRole === 'super_admin') {
        return true;
    }
    try {
        const res = await db.query(
            `SELECT has_kb_edit_access FROM profiles WHERE id = $1`,
            [userId]
        );
        return Boolean(res.rows[0]?.has_kb_edit_access);
    } catch {
        return false;
    }
}

// 1. GET /api/knowledge-base/articles - Retrieve all articles
router.get('/articles', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const isEditor = await canUserEditKB(userId, userRole);

        let query = `
            SELECT a.id, a.category, a.title, a.slug, a.description, a.module_href, 
                   a.tags, a.sort_order, a.section_number, a.parent_id, a.is_published, a.created_at, a.updated_at,
                   a.created_by, a.updated_by,
                   u.email as author_email,
                   CONCAT(p.first_name, ' ', p.last_name) as author_name,
                   p.profession as author_profession
            FROM knowledge_base_articles a
            LEFT JOIN users u ON a.updated_by = u.id
            LEFT JOIN profiles p ON a.updated_by = p.id
            WHERE (a.organization_id = $1 OR a.organization_id IS NULL)
        `;
        const params = [orgId];

        // Non-editors can ONLY view published articles
        if (!isEditor) {
            query += ` AND a.is_published = true`;
        }

        query += ` ORDER BY a.section_number ASC NULLS LAST, a.sort_order ASC, a.created_at ASC`;

        const articlesRes = await db.query(query, params);
        const rows = articlesRes.rows || [];

        // Count stats
        const publishedCount = rows.filter(r => r.is_published).length;
        const draftCount = rows.filter(r => !r.is_published).length;

        res.json({
            success: true,
            can_edit: isEditor,
            stats: {
                total: rows.length,
                published: publishedCount,
                drafts: draftCount
            },
            articles: rows
        });
    } catch (err) {
        console.error('[KB] Error fetching articles:', err);
        res.status(500).json({ error: 'Failed to retrieve Knowledge Base articles' });
    }
});

// 2. GET /api/knowledge-base/articles/:id - Retrieve single article with full content
router.get('/articles/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const isEditor = await canUserEditKB(userId, userRole);

        const query = `
            SELECT a.*, 
                   u.email as author_email,
                   CONCAT(p.first_name, ' ', p.last_name) as author_name,
                   p.profession as author_profession,
                   p.avatar_url as author_avatar
            FROM knowledge_base_articles a
            LEFT JOIN users u ON a.updated_by = u.id
            LEFT JOIN profiles p ON a.updated_by = p.id
            WHERE a.id = $1 AND (a.organization_id = $2 OR a.organization_id IS NULL)
        `;
        const result = await db.query(query, [id, orgId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const article = result.rows[0];

        // If unpublished and user is not an editor, forbid access
        if (!article.is_published && !isEditor) {
            return res.status(403).json({ error: 'This article is currently in draft mode.' });
        }

        res.json({
            success: true,
            can_edit: isEditor,
            article
        });
    } catch (err) {
        console.error('[KB] Error fetching article by ID:', err);
        res.status(500).json({ error: 'Failed to retrieve article details' });
    }
});

// 3. POST /api/knowledge-base/articles - Create a new article (draft or published)
router.post('/articles', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const orgId = req.user.organization_id;

        const isEditor = await canUserEditKB(userId, userRole);
        if (!isEditor) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to author Knowledge Base guides.' });
        }

        const {
            id,
            category = 'general',
            title,
            description = '',
            content = '',
            module_href = '',
            tags = [],
            sort_order = 0,
            section_number = '',
            parent_id = null,
            is_published = false,
            change_summary = 'Initial draft creation'
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        // Generate clean ID if not provided
        const articleId = (id && id.trim())
            ? id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
            : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

        // Fetch author profile
        const authorRes = await db.query(
            `SELECT p.first_name, p.last_name, u.email, u.role
             FROM users u
             LEFT JOIN profiles p ON p.id = u.id
             WHERE u.id = $1`,
            [userId]
        );
        const author = authorRes.rows[0] || {};
        const authorName = `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email || 'Author';

        const insertQuery = `
            INSERT INTO knowledge_base_articles (
                id, organization_id, category, title, description, content,
                module_href, tags, sort_order, section_number, parent_id, is_published, created_by, updated_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $13, NOW(), NOW())
            RETURNING *
        `;
        const result = await db.query(insertQuery, [
            articleId,
            orgId,
            category,
            title.trim(),
            description.trim(),
            content,
            module_href.trim(),
            JSON.stringify(tags),
            sort_order,
            section_number ? section_number.trim() : null,
            parent_id ? parent_id.trim() : null,
            Boolean(is_published),
            userId
        ]);

        const createdArticle = result.rows[0];

        // Record initial revision
        await db.query(`
            INSERT INTO knowledge_base_revisions (
                article_id, organization_id, edited_by, editor_name, editor_role,
                previous_content, new_content, change_summary, is_published_state
            ) VALUES ($1, $2, $3, $4, $5, '', $6, $7, $8)
        `, [
            articleId,
            orgId,
            userId,
            authorName,
            author.role || userRole,
            content,
            change_summary,
            Boolean(is_published)
        ]);

        // Record in central audit_logs (fail-safe)
        try {
            await db.query(`
                INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
                VALUES ($1, 'knowledge_base', $2, 'kb_article_created', $3, $4::jsonb)
            `, [
                orgId,
                articleId,
                userId,
                JSON.stringify({
                    article_id: articleId,
                    title: title.trim(),
                    category,
                    is_published: Boolean(is_published),
                    actor_id: userId,
                    actor_name: authorName,
                    actor_email: author.email,
                    actor_role: userRole,
                    summary: `Created new Knowledge Base article "${title.trim()}" as ${is_published ? 'Published' : 'Draft'}`
                })
            ]);
        } catch (auditErr) {
            console.warn('[KB] Warning: Audit log entry skipped:', auditErr.message);
        }

        res.status(201).json({
            success: true,
            message: is_published ? 'Article created and published live!' : 'Article saved as draft.',
            article: createdArticle
        });
    } catch (err) {
        console.error('[KB] Error creating article:', err);
        res.status(500).json({ error: 'Failed to create Knowledge Base article: ' + (err.message || 'Server error') });
    }
});

// 4. PUT /api/knowledge-base/articles/:id - Update an existing article (save draft or toggle publish)
router.put('/articles/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const orgId = req.user.organization_id;

        const isEditor = await canUserEditKB(userId, userRole);
        if (!isEditor) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to edit the Knowledge Base.' });
        }

        // Fetch current article state
        const existingRes = await db.query(
            `SELECT * FROM knowledge_base_articles WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
            [id, orgId]
        );

        if (existingRes.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found.' });
        }

        const currentArticle = existingRes.rows[0];

        const {
            title = currentArticle.title,
            category = currentArticle.category,
            description = currentArticle.description,
            content = currentArticle.content,
            module_href = currentArticle.module_href,
            tags = currentArticle.tags,
            sort_order = currentArticle.sort_order,
            section_number = currentArticle.section_number,
            parent_id = currentArticle.parent_id,
            is_published = currentArticle.is_published,
            change_summary = 'Updated content and guidelines'
        } = req.body;

        // Fetch editor details
        const editorRes = await db.query(
            `SELECT p.first_name, p.last_name, u.email, u.role
             FROM users u
             LEFT JOIN profiles p ON p.id = u.id
             WHERE u.id = $1`,
            [userId]
        );
        const editor = editorRes.rows[0] || {};
        const editorName = `${editor.first_name || ''} ${editor.last_name || ''}`.trim() || editor.email || 'Editor';

        const updatedRes = await db.query(`
            UPDATE knowledge_base_articles
            SET title = $1,
                category = $2,
                description = $3,
                content = $4,
                module_href = $5,
                tags = $6::jsonb,
                sort_order = $7,
                section_number = $8,
                parent_id = $9,
                is_published = $10,
                updated_by = $11,
                updated_at = NOW()
            WHERE id = $12 AND (organization_id = $13 OR organization_id IS NULL)
            RETURNING *
        `, [
            title.trim(),
            category,
            description ? description.trim() : '',
            content,
            module_href ? module_href.trim() : '',
            JSON.stringify(tags || []),
            sort_order,
            section_number ? section_number.trim() : null,
            parent_id ? parent_id.trim() : null,
            Boolean(is_published),
            userId,
            id,
            orgId
        ]);

        const updatedArticle = updatedRes.rows[0];

        // Save revision
        await db.query(`
            INSERT INTO knowledge_base_revisions (
                article_id, organization_id, edited_by, editor_name, editor_role,
                previous_content, new_content, change_summary, is_published_state
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            id,
            orgId,
            userId,
            editorName,
            editor.role || userRole,
            currentArticle.content,
            content,
            change_summary,
            Boolean(is_published)
        ]);

        // Action string for audit log
        let auditAction = 'kb_article_updated';
        if (Boolean(currentArticle.is_published) !== Boolean(is_published)) {
            auditAction = is_published ? 'kb_article_published' : 'kb_article_unpublished';
        }

        // Insert into central audit_logs (fail-safe)
        try {
            await db.query(`
                INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
                VALUES ($1, 'knowledge_base', $2, $3, $4, $5::jsonb)
            `, [
                orgId,
                id,
                auditAction,
                userId,
                JSON.stringify({
                    article_id: id,
                    title: title.trim(),
                    category,
                    previous_published: currentArticle.is_published,
                    is_published: Boolean(is_published),
                    actor_id: userId,
                    actor_name: editorName,
                    actor_email: editor.email,
                    actor_role: userRole,
                    summary: `${editorName} updated "${title.trim()}" (Status: ${is_published ? 'Published' : 'Draft'})`
                })
            ]);
        } catch (auditErr) {
            console.warn('[KB] Warning: Audit log entry skipped on update:', auditErr.message);
        }

        res.json({
            success: true,
            message: Boolean(is_published)
                ? 'Article published live!'
                : 'Draft saved successfully.',
            article: updatedArticle
        });
    } catch (err) {
        console.error('[KB] Error updating article:', err);
        res.status(500).json({ error: 'Failed to update article: ' + (err.message || 'Server error') });
    }
});

// 5. DELETE /api/knowledge-base/articles/:id - Delete an article
router.delete('/articles/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const orgId = req.user.organization_id;

        const isEditor = await canUserEditKB(userId, userRole);
        if (!isEditor) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to delete articles.' });
        }

        const articleRes = await db.query(
            `SELECT title, section_number FROM knowledge_base_articles WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
            [id, orgId]
        );

        if (articleRes.rows.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const { title: articleTitle, section_number: secNum } = articleRes.rows[0];

        // If cascade requested and section has children, delete subtopics as well
        if (req.query.cascade === 'true' && secNum) {
            await db.query(`DELETE FROM knowledge_base_articles WHERE section_number LIKE $1`, [`${secNum}.%`]);
        }

        await db.query(`DELETE FROM knowledge_base_articles WHERE id = $1`, [id]);

        // Audit log (fail-safe)
        try {
            await db.query(`
                INSERT INTO audit_logs (organization_id, entity_type, entity_id, action, performed_by, details)
                VALUES ($1, 'knowledge_base', $2, 'kb_article_deleted', $3, $4::jsonb)
            `, [
                orgId,
                id,
                userId,
                JSON.stringify({
                    article_id: id,
                    title: articleTitle,
                    actor_id: userId,
                    actor_role: userRole,
                    summary: `Deleted Knowledge Base article "${articleTitle}"`
                })
            ]);
        } catch (auditErr) {
            console.warn('[KB] Warning: Audit log entry skipped on delete:', auditErr.message);
        }

        res.json({ success: true, message: 'Article deleted successfully.' });
    } catch (err) {
        console.error('[KB] Error deleting article:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// 6. GET /api/knowledge-base/articles/:id/revisions - Get revision history
router.get('/articles/:id/revisions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            SELECT id, article_id, editor_name, editor_role, change_summary, is_published_state, created_at
            FROM knowledge_base_revisions
            WHERE article_id = $1 AND (organization_id = $2 OR organization_id IS NULL)
            ORDER BY created_at DESC
            LIMIT 50
        `, [id, orgId]);

        res.json({
            success: true,
            revisions: result.rows || []
        });
    } catch (err) {
        console.error('[KB] Error fetching revisions:', err);
        res.status(500).json({ error: 'Failed to fetch revision history' });
    }
});

// 7. POST /api/knowledge-base/upload - Upload an image for embedding in articles
router.post('/upload', requireAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        const publicUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            url: publicUrl,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (err) {
        console.error('[KB] Upload error:', err);
        res.status(500).json({ error: 'Image upload failed' });
    }
});

export default router;
