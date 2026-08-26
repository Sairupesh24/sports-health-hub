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
// DAILY TASKS & PROCEDURES
// ============================================================

// GET /api/planner/daily-tasks — List all daily tasks for organization
router.get("/daily-tasks", async (req, res) => {
  try {
    const orgId = req.user?.organization_id;
    const { date } = req.query;

    let query = `
      SELECT * FROM planner_daily_tasks
      WHERE (organization_id = $1 OR organization_id IS NULL)
        AND deleted_at IS NULL
    `;
    const params = [orgId || null];

    if (date) {
      query += ` AND (date = $2 OR (deadline IS NOT NULL AND deadline >= $2 AND date <= $2))`;
      params.push(date);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error("Error fetching daily tasks:", err);
    res.status(500).json({ error: "Failed to fetch daily tasks" });
  }
});

// POST /api/planner/daily-tasks — Create or update a daily task
router.post("/daily-tasks", async (req, res) => {
  try {
    const orgId = req.user?.organization_id || null;
    const userId = req.user?.id;
    const task = req.body;

    const id = task.id || `dt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const result = await db.query(
      `INSERT INTO planner_daily_tasks (
        id, organization_id, title, description, date, time_mode, start_time, end_time,
        has_time_slot, is_set_time, deadline, deadline_time, category, priority, status,
        task_type, assigner_id, assigner_name, assignee_id, assignee_name,
        team_id, team_name, creator_id, creator_name, requires_approval,
        approver_id, approver_name, approval_status, approval_note, rejection_reason,
        reviewed_at, completed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        date = EXCLUDED.date,
        time_mode = EXCLUDED.time_mode,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        has_time_slot = EXCLUDED.has_time_slot,
        is_set_time = EXCLUDED.is_set_time,
        deadline = EXCLUDED.deadline,
        deadline_time = EXCLUDED.deadline_time,
        category = EXCLUDED.category,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        task_type = EXCLUDED.task_type,
        assigner_id = COALESCE(EXCLUDED.assigner_id, planner_daily_tasks.assigner_id),
        assigner_name = COALESCE(EXCLUDED.assigner_name, planner_daily_tasks.assigner_name),
        assignee_id = EXCLUDED.assignee_id,
        assignee_name = EXCLUDED.assignee_name,
        team_id = EXCLUDED.team_id,
        team_name = EXCLUDED.team_name,
        requires_approval = EXCLUDED.requires_approval,
        approver_id = EXCLUDED.approver_id,
        approver_name = EXCLUDED.approver_name,
        approval_status = EXCLUDED.approval_status,
        approval_note = EXCLUDED.approval_note,
        rejection_reason = EXCLUDED.rejection_reason,
        reviewed_at = EXCLUDED.reviewed_at,
        completed_at = EXCLUDED.completed_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        id,
        orgId,
        task.title,
        task.description || null,
        task.date,
        task.time_mode || null,
        task.start_time || null,
        task.end_time || null,
        Boolean(task.has_time_slot),
        Boolean(task.is_set_time),
        task.deadline || null,
        task.deadline_time || null,
        task.category || "other",
        task.priority || "medium",
        task.status || "scheduled",
        task.task_type || "individual",
        task.assigner_id || userId || null,
        task.assigner_name || null,
        task.assignee_id || null,
        task.assignee_name || null,
        task.team_id || null,
        task.team_name || null,
        task.creator_id || userId || null,
        task.creator_name || null,
        Boolean(task.requires_approval),
        task.approver_id || null,
        task.approver_name || null,
        task.approval_status || (task.requires_approval ? "pending" : null),
        task.approval_note || null,
        task.rejection_reason || null,
        task.reviewed_at || null,
        task.completed_at || null,
      ]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error("Error creating daily task:", err);
    res.status(500).json({ error: "Failed to create daily task" });
  }
});

// POST /api/planner/daily-tasks/sync — Bidirectional bulk sync of tasks
router.post("/daily-tasks/sync", async (req, res) => {
  try {
    const orgId = req.user?.organization_id || null;
    const userId = req.user?.id;
    const clientTasks = req.body?.tasks || [];

    if (Array.isArray(clientTasks) && clientTasks.length > 0) {
      for (const task of clientTasks) {
        if (!task.id || !task.title || !task.date) continue;
        await db.query(
          `INSERT INTO planner_daily_tasks (
            id, organization_id, title, description, date, time_mode, start_time, end_time,
            has_time_slot, is_set_time, deadline, deadline_time, category, priority, status,
            task_type, assigner_id, assigner_name, assignee_id, assignee_name,
            team_id, team_name, creator_id, creator_name, requires_approval,
            approver_id, approver_name, approval_status, approval_note, rejection_reason,
            reviewed_at, completed_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25,
            $26, $27, $28, $29, $30,
            $31, $32
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            date = EXCLUDED.date,
            time_mode = EXCLUDED.time_mode,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            has_time_slot = EXCLUDED.has_time_slot,
            is_set_time = EXCLUDED.is_set_time,
            deadline = EXCLUDED.deadline,
            deadline_time = EXCLUDED.deadline_time,
            category = EXCLUDED.category,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            task_type = EXCLUDED.task_type,
            assigner_id = COALESCE(EXCLUDED.assigner_id, planner_daily_tasks.assigner_id),
            assigner_name = COALESCE(EXCLUDED.assigner_name, planner_daily_tasks.assigner_name),
            assignee_id = EXCLUDED.assignee_id,
            assignee_name = EXCLUDED.assignee_name,
            team_id = EXCLUDED.team_id,
            team_name = EXCLUDED.team_name,
            requires_approval = EXCLUDED.requires_approval,
            approver_id = EXCLUDED.approver_id,
            approver_name = EXCLUDED.approver_name,
            approval_status = EXCLUDED.approval_status,
            approval_note = EXCLUDED.approval_note,
            rejection_reason = EXCLUDED.rejection_reason,
            reviewed_at = EXCLUDED.reviewed_at,
            completed_at = EXCLUDED.completed_at,
            updated_at = CURRENT_TIMESTAMP`,
          [
            task.id,
            orgId,
            task.title,
            task.description || null,
            task.date,
            task.time_mode || null,
            task.start_time || null,
            task.end_time || null,
            Boolean(task.has_time_slot),
            Boolean(task.is_set_time),
            task.deadline || null,
            task.deadline_time || null,
            task.category || "other",
            task.priority || "medium",
            task.status || "scheduled",
            task.task_type || "individual",
            task.assigner_id || userId || null,
            task.assigner_name || null,
            task.assignee_id || null,
            task.assignee_name || null,
            task.team_id || null,
            task.team_name || null,
            task.creator_id || userId || null,
            task.creator_name || null,
            Boolean(task.requires_approval),
            task.approver_id || null,
            task.approver_name || null,
            task.approval_status || null,
            task.approval_note || null,
            task.rejection_reason || null,
            task.reviewed_at || null,
            task.completed_at || null,
          ]
        );
      }
    }

    const allTasksRes = await db.query(
      `SELECT * FROM planner_daily_tasks
       WHERE (organization_id = $1 OR organization_id IS NULL)
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [orgId || null]
    );

    res.json({ tasks: allTasksRes.rows });
  } catch (err) {
    console.error("Error in tasks sync:", err);
    res.status(500).json({ error: "Failed to sync tasks" });
  }
});

// PUT /api/planner/daily-tasks/:id — Update a daily task
router.put("/daily-tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await db.query(
      `SELECT * FROM planner_daily_tasks WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const current = existing.rows[0];

    const updated = {
      title: updates.title !== undefined ? updates.title : current.title,
      description: updates.description !== undefined ? updates.description : current.description,
      date: updates.date !== undefined ? updates.date : current.date,
      time_mode: updates.time_mode !== undefined ? updates.time_mode : current.time_mode,
      start_time: updates.start_time !== undefined ? updates.start_time : current.start_time,
      end_time: updates.end_time !== undefined ? updates.end_time : current.end_time,
      has_time_slot: updates.has_time_slot !== undefined ? updates.has_time_slot : current.has_time_slot,
      is_set_time: updates.is_set_time !== undefined ? updates.is_set_time : current.is_set_time,
      deadline: updates.deadline !== undefined ? updates.deadline : current.deadline,
      deadline_time: updates.deadline_time !== undefined ? updates.deadline_time : current.deadline_time,
      category: updates.category !== undefined ? updates.category : current.category,
      priority: updates.priority !== undefined ? updates.priority : current.priority,
      status: updates.status !== undefined ? updates.status : current.status,
      task_type: updates.task_type !== undefined ? updates.task_type : current.task_type,
      assignee_id: updates.assignee_id !== undefined ? updates.assignee_id : current.assignee_id,
      assignee_name: updates.assignee_name !== undefined ? updates.assignee_name : current.assignee_name,
      team_id: updates.team_id !== undefined ? updates.team_id : current.team_id,
      team_name: updates.team_name !== undefined ? updates.team_name : current.team_name,
      requires_approval: updates.requires_approval !== undefined ? updates.requires_approval : current.requires_approval,
      approver_id: updates.approver_id !== undefined ? updates.approver_id : current.approver_id,
      approver_name: updates.approver_name !== undefined ? updates.approver_name : current.approver_name,
      approval_status: updates.approval_status !== undefined ? updates.approval_status : current.approval_status,
      approval_note: updates.approval_note !== undefined ? updates.approval_note : current.approval_note,
      rejection_reason: updates.rejection_reason !== undefined ? updates.rejection_reason : current.rejection_reason,
      reviewed_at: updates.reviewed_at !== undefined ? updates.reviewed_at : current.reviewed_at,
      completed_at: updates.completed_at !== undefined ? updates.completed_at : current.completed_at,
    };

    const result = await db.query(
      `UPDATE planner_daily_tasks SET
        title = $1, description = $2, date = $3, time_mode = $4, start_time = $5, end_time = $6,
        has_time_slot = $7, is_set_time = $8, deadline = $9, deadline_time = $10,
        category = $11, priority = $12, status = $13, task_type = $14,
        assignee_id = $15, assignee_name = $16, team_id = $17, team_name = $18,
        requires_approval = $19, approver_id = $20, approver_name = $21,
        approval_status = $22, approval_note = $23, rejection_reason = $24,
        reviewed_at = $25, completed_at = $26, updated_at = CURRENT_TIMESTAMP
       WHERE id = $27
       RETURNING *`,
      [
        updated.title, updated.description, updated.date, updated.time_mode, updated.start_time, updated.end_time,
        updated.has_time_slot, updated.is_set_time, updated.deadline, updated.deadline_time,
        updated.category, updated.priority, updated.status, updated.task_type,
        updated.assignee_id, updated.assignee_name, updated.team_id, updated.team_name,
        updated.requires_approval, updated.approver_id, updated.approver_name,
        updated.approval_status, updated.approval_note, updated.rejection_reason,
        updated.reviewed_at, updated.completed_at, id
      ]
    );

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error("Error updating daily task:", err);
    res.status(500).json({ error: "Failed to update daily task" });
  }
});

// DELETE /api/planner/daily-tasks/:id — Soft delete daily task
router.delete("/daily-tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE planner_daily_tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting daily task:", err);
    res.status(500).json({ error: "Failed to delete daily task" });
  }
});

// ============================================================
// TEAMS
// ============================================================

// GET /api/planner/teams — List formed teams
router.get("/teams", async (req, res) => {
  try {
    const orgId = req.user?.organization_id;
    const result = await db.query(
      `SELECT * FROM planner_teams
       WHERE (organization_id = $1 OR organization_id IS NULL)
         AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [orgId || null]
    );
    res.json({ teams: result.rows });
  } catch (err) {
    console.error("Error fetching teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// POST /api/planner/teams — Create or update team
router.post("/teams", async (req, res) => {
  try {
    const orgId = req.user?.organization_id || null;
    const team = req.body;
    const id = team.id || `team_${Date.now()}`;

    const result = await db.query(
      `INSERT INTO planner_teams (
        id, organization_id, name, code, department, description, color, lead_id, lead_name, member_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        department = EXCLUDED.department,
        description = EXCLUDED.description,
        color = EXCLUDED.color,
        lead_id = EXCLUDED.lead_id,
        lead_name = EXCLUDED.lead_name,
        member_ids = EXCLUDED.member_ids,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        id,
        orgId,
        team.name,
        team.code || team.name.slice(0, 3).toUpperCase(),
        team.department || "General",
        team.description || null,
        team.color || "hsl(251 74% 60%)",
        team.lead_id || null,
        team.lead_name || null,
        JSON.stringify(team.member_ids || []),
      ]
    );

    res.status(201).json({ team: result.rows[0] });
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// PUT /api/planner/teams/:id — Update team
router.put("/teams/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await db.query(
      `UPDATE planner_teams SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        department = COALESCE($3, department),
        description = COALESCE($4, description),
        color = COALESCE($5, color),
        lead_id = COALESCE($6, lead_id),
        lead_name = COALESCE($7, lead_name),
        member_ids = CASE WHEN $8::jsonb IS NOT NULL THEN $8::jsonb ELSE member_ids END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [
        updates.name || null,
        updates.code || null,
        updates.department || null,
        updates.description || null,
        updates.color || null,
        updates.lead_id || null,
        updates.lead_name || null,
        updates.member_ids ? JSON.stringify(updates.member_ids) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ team: result.rows[0] });
  } catch (err) {
    console.error("Error updating team:", err);
    res.status(500).json({ error: "Failed to update team" });
  }
});

// DELETE /api/planner/teams/:id — Disband/Delete team
router.delete("/teams/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE planner_teams SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting team:", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

// ============================================================
// SETTINGS
// ============================================================

// GET /api/planner/settings — Get planner settings
router.get("/settings", async (req, res) => {
  try {
    const orgId = req.user?.organization_id || "default";
    const result = await db.query(
      `SELECT settings FROM planner_settings WHERE id = $1 OR organization_id = $2 ORDER BY updated_at DESC LIMIT 1`,
      [String(orgId), req.user?.organization_id || null]
    );
    if (result.rows.length > 0) {
      return res.json({ settings: result.rows[0].settings });
    }
    res.json({ settings: null });
  } catch (err) {
    console.error("Error fetching planner settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT /api/planner/settings — Save planner settings
router.put("/settings", async (req, res) => {
  try {
    const orgId = req.user?.organization_id || "default";
    const { settings } = req.body;

    const result = await db.query(
      `INSERT INTO planner_settings (id, organization_id, settings, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         settings = EXCLUDED.settings,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [String(orgId), req.user?.organization_id || null, JSON.stringify(settings)]
    );

    res.json({ settings: result.rows[0].settings });
  } catch (err) {
    console.error("Error saving planner settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// GET /api/planner/approvals — List pending approvals
router.get("/approvals", async (req, res) => {
  try {
    const orgId = req.user?.organization_id;
    const result = await db.query(
      `SELECT * FROM planner_daily_tasks
       WHERE (organization_id = $1 OR organization_id IS NULL)
         AND requires_approval = TRUE
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [orgId || null]
    );
    res.json({ approvals: result.rows });
  } catch (err) {
    console.error("Error fetching approvals:", err);
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

export default router;

