import express from "express";
import { db } from "./db.js";
import { requireAuth } from "./middleware.js";

const router = express.Router();
router.use(requireAuth);

// ============================================================
// PROJECTS
// ============================================================

// GET /api/planner/projects — List all projects in user's organization
router.get("/projects", async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const result = await db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM planner_work_items w WHERE w.project_id = p.id AND w.deleted_at IS NULL) as total_items,
              (SELECT COUNT(*) FROM planner_work_items w WHERE w.project_id = p.id AND w.status = 'completed' AND w.deleted_at IS NULL) as completed_items,
              (SELECT COUNT(*) FROM planner_work_items w WHERE w.project_id = p.id AND w.due_date < CURRENT_DATE AND w.status != 'completed' AND w.deleted_at IS NULL) as overdue_items
       FROM planner_projects p
       WHERE (p.organization_id = $1 OR p.organization_id IS NULL)
         AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [orgId]
    );

    const projects = result.rows.map((row) => {
      const total = parseInt(row.total_items, 10) || 0;
      const completed = parseInt(row.completed_items, 10) || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : row.progress || 0;

      return {
        ...row,
        progress,
        open_items: total - completed,
        overdue_items: parseInt(row.overdue_items, 10) || 0,
      };
    });

    res.json({ projects });
  } catch (err) {
    console.error("Error fetching planner projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// POST /api/planner/projects — Create new project
router.post("/projects", async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const userId = req.user.id;
    const {
      name, code, description, department, priority, status,
      start_date, target_date, budget, currency, template
    } = req.body;

    const projectCode = (code || name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");

    const result = await db.query(
      `INSERT INTO planner_projects (
        organization_id, name, code, description, department, priority, status,
        start_date, target_date, budget, currency, owner_id, manager_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *`,
      [
        orgId, name, projectCode, description || null, department || "General",
        priority || "medium", status || "not_started",
        start_date || null, target_date || null,
        budget ? parseFloat(budget) : 0, currency || "INR", userId
      ]
    );

    const project = result.rows[0];

    // Seed default workstreams if requested
    if (template && template !== "blank") {
      const defaultWorkstreams = template === "software"
        ? ["Discovery & Design", "Backend & APIs", "Frontend & UI", "QA & Testing"]
        : template === "marketing"
        ? ["Strategy & Copy", "Design Assets", "Campaign Launch", "Analytics"]
        : ["Planning", "Implementation", "Training & Review"];

      for (let i = 0; i < defaultWorkstreams.length; i++) {
        await db.query(
          `INSERT INTO planner_workstreams (project_id, name, sort_order)
           VALUES ($1, $2, $3)`,
          [project.id, defaultWorkstreams[i], i]
        );
      }
    }

    res.status(201).json({ project });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// GET /api/planner/projects/:id — Get project detail
router.get("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM planner_work_items w WHERE w.project_id = p.id AND w.deleted_at IS NULL) as total_items,
              (SELECT COUNT(*) FROM planner_work_items w WHERE w.project_id = p.id AND w.status = 'completed' AND w.deleted_at IS NULL) as completed_items
       FROM planner_projects p
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const row = result.rows[0];
    const total = parseInt(row.total_items, 10) || 0;
    const completed = parseInt(row.completed_items, 10) || 0;
    row.progress = total > 0 ? Math.round((completed / total) * 100) : row.progress || 0;

    res.json({ project: row });
  } catch (err) {
    console.error("Error fetching project detail:", err);
    res.status(500).json({ error: "Failed to fetch project detail" });
  }
});

// ============================================================
// WORK ITEMS
// ============================================================

// GET /api/planner/projects/:id/work-items — List work items for project
router.get("/projects/:id/work-items", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT w.*, ws.name as workstream_name
       FROM planner_work_items w
       LEFT JOIN planner_workstreams ws ON w.workstream_id = ws.id
       WHERE w.project_id = $1 AND w.deleted_at IS NULL
       ORDER BY w.sort_order ASC, w.created_at ASC`,
      [id]
    );

    res.json({ work_items: result.rows });
  } catch (err) {
    console.error("Error fetching work items:", err);
    res.status(500).json({ error: "Failed to fetch work items" });
  }
});

// POST /api/planner/projects/:id/work-items — Create work item
router.post("/projects/:id/work-items", async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.user.id;
    const {
      title, description, status, priority, assignee_id,
      workstream_id, parent_id, start_date, due_date, estimated_hours,
      is_milestone, is_critical
    } = req.body;

    const result = await db.query(
      `INSERT INTO planner_work_items (
        project_id, title, description, status, priority, assignee_id, creator_id,
        workstream_id, parent_id, start_date, due_date, estimated_hours,
        is_milestone, is_critical
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        projectId, title, description || null, status || "planned",
        priority || "medium", assignee_id || userId, userId,
        workstream_id || null, parent_id || null,
        start_date || null, due_date || null,
        estimated_hours ? parseFloat(estimated_hours) : 0,
        Boolean(is_milestone), Boolean(is_critical)
      ]
    );

    res.status(201).json({ work_item: result.rows[0] });
  } catch (err) {
    console.error("Error creating work item:", err);
    res.status(500).json({ error: "Failed to create work item" });
  }
});

// PUT /api/planner/work-items/:id — Update work item
router.put("/work-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, status, priority, assignee_id,
      start_date, due_date, estimated_hours, sort_order
    } = req.body;

    const result = await db.query(
      `UPDATE planner_work_items
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assignee_id = COALESCE($5, assignee_id),
           start_date = COALESCE($6, start_date),
           due_date = COALESCE($7, due_date),
           estimated_hours = COALESCE($8, estimated_hours),
           sort_order = COALESCE($9, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND deleted_at IS NULL
       RETURNING *`,
      [
        title, description, status, priority, assignee_id,
        start_date, due_date, estimated_hours ? parseFloat(estimated_hours) : null,
        sort_order ? parseInt(sort_order, 10) : null, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Work item not found" });
    }

    res.json({ work_item: result.rows[0] });
  } catch (err) {
    console.error("Error updating work item:", err);
    res.status(500).json({ error: "Failed to update work item" });
  }
});

// DELETE /api/planner/work-items/:id — Soft delete work item
router.delete("/work-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE planner_work_items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting work item:", err);
    res.status(500).json({ error: "Failed to delete work item" });
  }
});

// ============================================================
// MY WORK
// ============================================================

// GET /api/planner/my-work — Assigned work items for logged in user
router.get("/my-work", async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT w.*, p.name as project_name, p.code as project_code
       FROM planner_work_items w
       JOIN planner_projects p ON w.project_id = p.id
       WHERE w.assignee_id = $1 AND w.deleted_at IS NULL
       ORDER BY w.due_date ASC NULLS LAST`,
      [userId]
    );

    res.json({ work_items: result.rows });
  } catch (err) {
    console.error("Error fetching my work:", err);
    res.status(500).json({ error: "Failed to fetch my work" });
  }
});

export default router;
