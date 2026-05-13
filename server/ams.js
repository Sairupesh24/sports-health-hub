import express from 'express';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const router = express.Router();

// GET training programs
router.get('/programs', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM trainingprograms WHERE organization_id = $1 ORDER BY created_at DESC', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Questionnaires
router.get('/questionnaires', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM questionnaires WHERE organization_id = $1 ORDER BY created_at DESC', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Questionnaire
router.post('/questionnaires', requireAuth, async (req, res) => {
    try {
        const { name, classification, questions } = req.body;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            INSERT INTO questionnaires (organization_id, name, classification, questions, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [orgId, name, classification, JSON.stringify(questions), req.user.id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Update Questionnaire
router.patch('/questionnaires/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, classification, questions } = req.body;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            UPDATE questionnaires 
            SET name = COALESCE($1, name),
                classification = COALESCE($2, classification),
                questions = COALESCE($3, questions)
            WHERE id = $4 AND organization_id = $5
            RETURNING *
        `, [name, classification, questions ? JSON.stringify(questions) : null, id, orgId]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Questionnaire
router.delete('/questionnaires/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        await db.query('DELETE FROM questionnaires WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET program details with days and items
router.get('/programs/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        
        const programRes = await db.query('SELECT * FROM trainingprograms WHERE id = $1 AND organization_id = $2', [id, orgId]);
        if (programRes.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
        
        const daysRes = await db.query(`
            SELECT wd.*, 
            (
                SELECT json_agg(wi.*)
                FROM workoutitems wi
                WHERE wi.workout_day_id = wd.id
            ) as items
            FROM workoutdays wd
            WHERE wd.program_id = $1
            ORDER BY wd.display_order ASC
        `, [id]);
        
        res.json({
            ...programRes.rows[0],
            days: daysRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST add day to program
router.post('/programs/:id/days', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, display_order } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            INSERT INTO workoutdays (program_id, organization_id, title, display_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [id, orgId, title, display_order]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET mobile specialist dashboard stats
router.get('/mobile-dashboard/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        // 1. Attendance Status
        const attendanceRes = await db.query(`
            SELECT * FROM hrattendancelogs 
            WHERE profile_id = $1 
            AND created_at >= $2 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [userId, todayStart.toISOString()]);
        
        const lastLog = attendanceRes.rows[0] || null;
        const isCheckedIn = lastLog?.type === 'check_in';
        
        // 2. Sessions Today
        const sessionsRes = await db.query(`
            SELECT id, status FROM Sessions 
            WHERE scientist_id = $1 
            AND scheduled_start >= $2 
            AND scheduled_start <= $3
        `, [userId, todayStart.toISOString(), todayEnd.toISOString()]);
        
        const totalSessions = sessionsRes.rows.length;
        const remainingSessions = sessionsRes.rows.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled').length;
        const inProgressSessions = sessionsRes.rows.filter(s => s.status === 'In Progress').length;
        
        // 3. Active Clients
        const clientsRes = await db.query(`
            SELECT COUNT(*) FROM Clients 
            WHERE primary_scientist_id = $1 
            AND deleted_at IS NULL
        `, [userId]);
        
        // 4. Pending Tasks (Forms awaiting review)
        const pendingTasksRes = await db.query(`
            SELECT COUNT(*) FROM form_responses 
            WHERE specialist_id = $1 
            AND status = 'completed' 
            AND clinical_interpretation IS NULL
        `, [userId]);
        
        // 5. Active Sessions (Checked-In Athletes)
        const activeSessionsRes = await db.query(`
            SELECT s.id, s.scheduled_start, s.status, s.session_mode, s.group_name,
                   json_build_object(
                       'id', c.id, 
                       'first_name', c.first_name, 
                       'last_name', c.last_name, 
                       'uhid', c.uhid, 
                       'is_vip', c.is_vip, 
                       'sport', c.sport, 
                       'org_name', c.org_name
                   ) as client
            FROM Sessions s
            JOIN Clients c ON s.client_id = c.id
            WHERE s.scientist_id = $1 
            AND s.status = 'Checked In'
            ORDER BY s.scheduled_start ASC
            LIMIT 10
        `, [userId]);
        
        res.json({
            data: {
                isCheckedIn,
                todaySessions: totalSessions,
                remainingSessions,
                inProgressSessions,
                activeClients: parseInt(clientsRes.rows[0].count),
                pendingTasks: parseInt(pendingTasksRes.rows[0].count),
                activeSessions: activeSessionsRes.rows
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET mobile active client IDs for the specialist this month
router.get('/mobile-active', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        
        // Individual sessions
        const individualRes = await db.query(`
            SELECT DISTINCT client_id FROM Sessions 
            WHERE scientist_id = $1 
            AND session_mode = 'Individual'
            AND scheduled_start >= $2 
            AND scheduled_start <= $3
            AND client_id IS NOT NULL
        `, [userId, start.toISOString(), end.toISOString()]);
        
        // Group sessions
        const groupSessionsRes = await db.query(`
            SELECT id FROM Sessions 
            WHERE scientist_id = $1 
            AND session_mode = 'Group'
            AND scheduled_start >= $2 
            AND scheduled_start <= $3
        `, [userId, start.toISOString(), end.toISOString()]);
        
        const groupSessionIds = groupSessionsRes.rows.map(s => s.id);
        let groupClientIds = [];
        if (groupSessionIds.length > 0) {
            const attendanceRes = await db.query(`
                SELECT DISTINCT client_id FROM group_attendance 
                WHERE session_id = ANY($1)
                AND client_id IS NOT NULL
            `, [groupSessionIds]);
            groupClientIds = attendanceRes.rows.map(a => a.client_id);
        }
        
        const individualClientIds = individualRes.rows.map(r => r.client_id);
        const allActiveIds = Array.from(new Set([...individualClientIds, ...groupClientIds]));
        
        res.json(allActiveIds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        // 1. Today's sessions
        const sessionsRes = await db.query(`
            SELECT s.*, c.first_name, c.last_name, st.name as session_type_name
            FROM Sessions s
            LEFT JOIN Clients c ON s.client_id = c.id
            LEFT JOIN SessionTypes st ON s.service_id = st.id
            WHERE s.scientist_id = $1 
            AND s.scheduled_start >= $2 
            AND s.scheduled_start <= $3
            ORDER BY s.scheduled_start ASC
        `, [userId, todayStart.toISOString(), todayEnd.toISOString()]);
        
        // 2. Client count
        const clientsRes = await db.query(`
            SELECT COUNT(*) FROM Clients 
            WHERE organization_id = $1 
            AND (primary_scientist_id = $2 OR primary_scientist_id IS NULL)
        `, [orgId, userId]);
        
        // 3. Template count
        const templatesRes = await db.query(`
            SELECT COUNT(*) FROM SessionTemplates 
            WHERE scientist_id = $1
        `, [userId]);
        
        res.json({
            todaySessions: sessionsRes.rows,
            clientCount: parseInt(clientsRes.rows[0].count),
            templateCount: parseInt(templatesRes.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET single workout day with detailed items
router.get('/workout-days/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT wd.*, 
                   (
                       SELECT json_agg(item_data)
                       FROM (
                           SELECT wi.*, 
                                  li_data.lift,
                                  saqc_data.saqc,
                                  circ_data.circuit
                           FROM workoutitems wi
                           LEFT JOIN LATERAL (
                               SELECT json_build_object(
                                   'id', li.id,
                                   'exercise_id', li.exercise_id,
                                   'sets', li.sets,
                                   'reps', li.reps,
                                   'load_type', li.load_type,
                                   'load_value', li.load_value,
                                   'tempo', li.tempo,
                                   'rest_time_secs', li.rest_time_secs,
                                   'additional_info', li.additional_info,
                                   'workout_grouping', li.workout_grouping,
                                   'exercise', (SELECT json_build_object('id', e.id, 'name', e.name) FROM exercises e WHERE e.id = li.exercise_id)
                               ) as lift
                               FROM liftitems li 
                               WHERE li.workout_item_id = wi.id
                           ) li_data ON TRUE
                           LEFT JOIN LATERAL (
                               SELECT json_build_object(
                                   'id', si.id,
                                   'exercise_id', si.exercise_id,
                                   'sets', si.sets,
                                   'reps', si.reps,
                                   'exercise', (SELECT json_build_object('id', e.id, 'name', e.name) FROM exercises e WHERE e.id = si.exercise_id)
                               ) as saqc
                               FROM saqcitems si 
                               WHERE si.workout_item_id = wi.id
                           ) saqc_data ON TRUE
                           LEFT JOIN LATERAL (
                               SELECT json_build_object('id', ci.id, 'title', ci.title) as circuit
                               FROM circuititems ci 
                               WHERE ci.workout_item_id = wi.id
                           ) circ_data ON TRUE
                           WHERE wi.workout_day_id = wd.id
                           ORDER BY wi.display_order ASC
                       ) item_data
                   ) as items
            FROM workoutdays wd
            WHERE wd.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Workout day not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Bulk Book Sessions (from SportsScientistBookSessionModal)
router.post('/sessions/bulk', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { sessions, sessionMode, groupName, selectedClientIds } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;

        await client.query('BEGIN');

        // 1. Insert the sessions
        const insertedSessions = [];
        for (const session of sessions) {
            const keys = ['organization_id', 'created_by'];
            const values = [orgId, userId];
            let placeholders = ['$1', '$2'];
            let idx = 3;

            for (const [k, v] of Object.entries(session)) {
                if (v !== undefined) {
                    keys.push(k);
                    values.push(v);
                    placeholders.push(`$${idx}`);
                    idx++;
                }
            }

            const query = `INSERT INTO Sessions (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
            const sRes = await client.query(query, values);
            insertedSessions.push({ id: sRes.rows[0].id });
        }

        // 2. If Group mode, create attendance rows and sync group architecture
        if (sessionMode === "Group" && selectedClientIds && selectedClientIds.length > 0) {
            for (const session of insertedSessions) {
                for (const clientId of selectedClientIds) {
                    await client.query(`
                        INSERT INTO group_attendance (session_id, client_id, attendance_status)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (session_id, client_id) DO NOTHING
                    `, [session.id, clientId, 'Present']);
                }
            }

            // Sync group architecture
            let groupId;
            const groupCheck = await client.query('SELECT id FROM client_groups WHERE organization_id = $1 AND name = $2', [orgId, groupName]);
            if (groupCheck.rows.length > 0) {
                groupId = groupCheck.rows[0].id;
            } else {
                const newGroup = await client.query(`
                    INSERT INTO client_groups (organization_id, name, created_by)
                    VALUES ($1, $2, $3) RETURNING id
                `, [orgId, groupName, userId]);
                groupId = newGroup.rows[0].id;
            }

            for (const clientId of selectedClientIds) {
                await client.query(`
                    INSERT INTO client_group_members (group_id, client_id, added_by)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (group_id, client_id) DO NOTHING
                `, [groupId, clientId, userId]);
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

// POST Performance Assessment
router.post('/performance-assessments', requireAuth, async (req, res) => {
    try {
        const { athlete_id, category, test_name, metrics } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;

        const result = await db.query(`
            INSERT INTO performance_assessments (
                organization_id, athlete_id, category, test_name, metrics, recorded_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [orgId, athlete_id, category, test_name, JSON.stringify(metrics || {}), userId]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Performance Assessments for athlete
router.get('/performance-assessments', requireAuth, async (req, res) => {
    try {
        const { athlete_id, category, test_name } = req.query;
        const orgId = req.user.organization_id;
        
        let query = 'SELECT * FROM performance_assessments WHERE organization_id = $1';
        const params = [orgId];
        
        if (athlete_id) {
            query += ` AND athlete_id = $${params.length + 1}`;
            params.push(athlete_id);
        }
        if (category) {
            query += ` AND category = $${params.length + 1}`;
            params.push(category);
        }
        if (test_name) {
            query += ` AND test_name = $${params.length + 1}`;
            params.push(test_name);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Max PR records for athlete
router.get('/max-pr-records', requireAuth, async (req, res) => {
    try {
        const { athlete_id, exercise_ids } = req.query;
        const targetAthleteId = athlete_id || req.user.id;
        
        let query = `
            SELECT mpr.exercise_id, mpr.value, e.name as exercise_name
            FROM max_pr_records mpr
            JOIN exercises e ON mpr.exercise_id = e.id
            WHERE mpr.athlete_id = $1 AND mpr.is_current = true
        `;
        const params = [targetAthleteId];
        
        if (exercise_ids) {
            const ids = exercise_ids.split(',');
            query += ` AND mpr.exercise_id = ANY($2)`;
            params.push(ids);
        }
        
        const result = await db.query(query, params);
        const mapped = result.rows.map(row => ({
            exercise_id: row.exercise_id,
            value: row.value,
            exercise: { name: row.exercise_name }
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Workout Completion
router.post('/workout-completions', requireAuth, async (req, res) => {
    try {
        const { athlete_id, workout_day_id, org_id, completed_at, overall_notes, completion_status } = req.body;
        const result = await db.query(`
            INSERT INTO athlete_workout_completions (
                athlete_id, workout_day_id, organization_id, completed_at, overall_notes, completion_status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [athlete_id || req.user.id, workout_day_id, org_id, completed_at || new Date().toISOString(), overall_notes, completion_status || 'completed']);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Workout History for athlete
router.get('/workout-history/:athleteId', requireAuth, async (req, res) => {
    try {
        const { athleteId } = req.params;
        const result = await db.query(`
            SELECT awc.*, 
                   (
                       SELECT json_agg(L)
                       FROM (
                           SELECT ail.*, e.name as exercise_name
                           FROM athlete_item_logs ail
                           LEFT JOIN workoutitems wi ON ail.workout_item_id = wi.id
                           LEFT JOIN liftitems li ON wi.id = li.id
                           LEFT JOIN exercises e ON li.exercise_id = e.id
                           WHERE ail.athlete_id = awc.athlete_id
                             AND ail.logged_at >= awc.completed_at - INTERVAL '1 hour'
                             AND ail.logged_at <= awc.completed_at + INTERVAL '1 hour'
                       ) L
                   ) as logs
            FROM athlete_workout_completions awc
            WHERE awc.athlete_id = $1
            ORDER BY awc.completed_at DESC
        `, [athleteId]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Athlete Item Logs (Bulk)
router.post('/item-logs', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const logs = req.body; // Expecting an array
        if (!Array.isArray(logs)) return res.status(400).json({ error: 'Expected array of logs' });
        
        await client.query('BEGIN');
        const results = [];
        
        for (const log of logs) {
            const res = await client.query(`
                INSERT INTO athlete_item_logs (
                    organization_id, workout_item_id, athlete_id, logged_at, sets_completed, rpe, notes, skipped
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                log.org_id, 
                log.workout_item_id, 
                log.athlete_id || req.user.id, 
                log.logged_at || new Date().toISOString(), 
                JSON.stringify(log.sets_completed), 
                log.rpe, 
                log.notes, 
                log.skipped || false
            ]);
            results.push(res.rows[0]);
        }
        
        await client.query('COMMIT');
        res.status(201).json(results);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET exercises list
router.get('/exercises', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { limit, gym_environment } = req.query;
        
        let query = 'SELECT id, name, category, equipment_type FROM exercises WHERE (organization_id = $1 OR organization_id IS NULL)';
        const params = [orgId];
        
        if (gym_environment) {
            if (gym_environment === "average_gym") {
                query += ' AND equipment_type IN (\'average_gym\', \'minimal_equipment\', \'calisthenics\')';
            } else if (gym_environment === "minimal_equipment") {
                query += ' AND equipment_type IN (\'minimal_equipment\', \'calisthenics\')';
            } else if (gym_environment === "calisthenics") {
                query += ' AND equipment_type = \'calisthenics\'';
            }
        }
        
        query += ' ORDER BY name';
        if (limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(limit);
        } else {
            query += ' LIMIT 1000';
        }
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Bulk Assignments for Org
router.get('/bulk-assignments', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT ba.*, 
                   q.name as questionnaire_name,
                   p.first_name || ' ' || p.last_name as specialist_full_name,
                   (
                       SELECT json_agg(r) 
                       FROM (
                           SELECT fr.id, fr.status, fr.client_id,
                                  pr.first_name || ' ' || pr.last_name as client_full_name,
                                  pr.uhid as client_uhid
                           FROM form_responses fr
                           LEFT JOIN profiles pr ON fr.client_id = pr.id
                           WHERE fr.bulk_assignment_id = ba.id
                       ) r
                   ) as responses
            FROM bulk_assignments ba
            LEFT JOIN questionnaires q ON ba.questionnaire_id = q.id
            LEFT JOIN profiles p ON ba.specialist_id = p.id
            WHERE ba.organization_id = $1
            ORDER BY ba.created_at DESC
        `, [orgId]);
        
        // Map to match frontend expected structure
        const mapped = result.rows.map(row => ({
            ...row,
            questionnaire: { name: row.questionnaire_name },
            specialist: { full_name: row.specialist_full_name },
            responses: (row.responses || []).map(r => ({
                ...r,
                client: { full_name: r.client_full_name, uhid: r.client_uhid }
            }))
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Update Form Response
router.patch('/form-responses/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { clinical_interpretation, status, response_data, submitted_at } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            UPDATE form_responses 
            SET clinical_interpretation = COALESCE($1, clinical_interpretation),
                status = COALESCE($2, status),
                response_data = COALESCE($3, response_data),
                submitted_at = COALESCE($4, submitted_at)
            WHERE id = $5 AND organization_id = $6
            RETURNING *
        `, [clinical_interpretation, status, response_data ? JSON.stringify(response_data) : null, submitted_at, id, orgId]);
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Batch Responses for an assignment
router.get('/batch-responses/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT fr.*, 
                   p.first_name || ' ' || p.last_name as client_full_name,
                   p.uhid as client_uhid
            FROM form_responses fr
            LEFT JOIN profiles p ON fr.client_id = p.id
            WHERE fr.bulk_assignment_id = $1 AND fr.organization_id = $2
            ORDER BY fr.created_at DESC
        `, [id, orgId]);
        
        const mapped = result.rows.map(row => ({
            ...row,
            client: { full_name: row.client_full_name, uhid: row.client_uhid }
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Bulk Assignment
router.post('/bulk-assignments', requireAuth, async (req, res) => {
    try {
        const { questionnaire_id, total_clients, status } = req.body;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            INSERT INTO bulk_assignments (organization_id, questionnaire_id, specialist_id, total_clients, responded_count, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [orgId, questionnaire_id, req.user.id, total_clients, 0, status || 'active']);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Form Responses (Bulk)
router.post('/form-responses/bulk', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const responses = req.body;
        if (!Array.isArray(responses)) return res.status(400).json({ error: 'Expected array' });
        
        await client.query('BEGIN');
        const results = [];
        for (const r of responses) {
            const res = await client.query(`
                INSERT INTO form_responses (organization_id, form_id, client_id, specialist_id, bulk_assignment_id, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [req.user.organization_id, r.form_id, r.client_id, req.user.id, r.bulk_assignment_id, r.status || 'pending']);
            results.push(res.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(results);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST Bulk Notifications
router.post('/notifications/bulk', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const notifications = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        for (const n of notifications) {
            await client.query(`
                INSERT INTO notifications (organization_id, title, content, type, target_user_id, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [orgId, n.title, n.message || n.content, n.type || 'info', n.user_id || n.target_user_id, req.user.id]);
        }
        await client.query('COMMIT');
        res.status(201).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET Notifications for User
router.get('/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            SELECT n.*, 
                   p.first_name as sender_first_name, 
                   p.last_name as sender_last_name, 
                   p.profession as sender_profession
            FROM notifications n
            LEFT JOIN profiles p ON n.sender_id = p.id
            WHERE n.organization_id = $1 
              AND (n.is_broadcast = true OR n.target_user_id = $2)
            ORDER BY n.created_at DESC
        `, [orgId, userId]);
        
        const mapped = result.rows.map(row => ({
            ...row,
            sender: {
                first_name: row.sender_first_name,
                last_name: row.sender_last_name,
                profession: row.sender_profession
            }
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Notification Reads
router.get('/notifications/reads', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT notification_id FROM notification_reads WHERE user_id = $1', [userId]);
        res.json(result.rows.map(r => r.notification_id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Mark Notifications as Read
router.post('/notifications/read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationIds } = req.body;
        
        if (!notificationIds || !Array.isArray(notificationIds)) {
            return res.status(400).json({ error: 'notificationIds array required' });
        }
        
        for (const id of notificationIds) {
            await db.query(`
                INSERT INTO notification_reads (notification_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (notification_id, user_id) DO NOTHING
            `, [id, userId]);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Wellness Logs for Athlete
router.get('/wellness-logs', requireAuth, async (req, res) => {
    try {
        const { athlete_id, days } = req.query;
        const orgId = req.user.organization_id;
        
        let query = 'SELECT * FROM wellness_logs WHERE organization_id = $1';
        const params = [orgId];
        
        if (athlete_id) {
            query += ' AND athlete_id = $2';
            params.push(athlete_id);
        }
        
        if (days) {
            query += ` AND created_at >= NOW() - INTERVAL '${days} days'`;
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET External Training Summary
router.get('/training-summary', requireAuth, async (req, res) => {
    try {
        const { client_id, days } = req.query;
        const orgId = req.user.organization_id;
        
        let query = `
            SELECT e.*, p.first_name, p.last_name
            FROM external_training_summary e
            LEFT JOIN profiles p ON e.client_id = p.id
            WHERE e.organization_id = $1
        `;
        const params = [orgId];
        
        if (client_id) {
            query += ' AND e.client_id = $2';
            params.push(client_id);
        }
        
        if (days) {
            query += ` AND e.training_date >= NOW() - INTERVAL '${days} days'`;
        }
        
        query += ' ORDER BY e.training_date DESC LIMIT 10';
        
        const result = await db.query(query, params);
        const mapped = result.rows.map(r => ({
            ...r,
            client: { id: r.client_id, first_name: r.first_name, last_name: r.last_name }
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Athletes for Coach
router.get('/athletes', requireAuth, async (req, res) => {
    try {
        const { team } = req.query;
        const orgId = req.user.organization_id;
        
        let query = `
            SELECT p.*, u.email
            FROM profiles p
            JOIN users u ON p.id = u.id
            WHERE p.organization_id = $1 AND p.ams_role = 'athlete'
        `;
        const params = [orgId];
        
        if (team && team !== 'all') {
            query += ' AND p.team = $2';
            params.push(team);
        }
        
        const athletesRes = await db.query(query, params);
        
        const athletes = await Promise.all(athletesRes.rows.map(async (athlete) => {
            const logs = await db.query('SELECT * FROM wellness_logs WHERE athlete_id = $1 ORDER BY created_at DESC LIMIT 30', [athlete.id]);
            const sessions = await db.query('SELECT * FROM external_training_summary WHERE client_id = $1 ORDER BY training_date DESC LIMIT 10', [athlete.id]);
            
            return {
                ...athlete,
                wellness_logs: logs.rows,
                training_sessions: sessions.rows
            };
        }));
        
        res.json(athletes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client groups
router.get('/groups', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM client_groups WHERE organization_id = $1 ORDER BY name', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET client group members
router.get('/group-members', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM client_group_members');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Batches
router.get('/batches', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query('SELECT * FROM batches WHERE organization_id = $1 ORDER BY name', [orgId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET Program Assignments
router.get('/program-assignments', requireAuth, async (req, res) => {
    try {
        const { athlete_id, batch_id, status } = req.query;
        const orgId = req.user.organization_id;
        
        let query = `
            SELECT pa.*, 
                   tp.name as program_name,
                   (
                       SELECT json_agg(day_data)
                       FROM (
                           SELECT wd.*, 
                                  (
                                      SELECT json_agg(item_data)
                                      FROM (
                                          SELECT wi.*, 
                                                 li.sets, li.reps, li.load_value, li.tempo, li.rest_time_secs, li.workout_grouping, li.each_side, li.additional_info, li.exercise_id,
                                                 e.name as exercise_name
                                          FROM workoutitems wi
                                          LEFT JOIN liftitems li ON wi.id = li.workout_item_id
                                          LEFT JOIN exercises e ON li.exercise_id = e.id
                                          WHERE wi.workout_day_id = wd.id
                                          ORDER BY wi.display_order ASC
                                      ) item_data
                                  ) as items
                           FROM workoutdays wd
                           WHERE wd.program_id = tp.id
                           ORDER BY wd.display_order ASC
                       ) day_data
                   ) as program_days
            FROM program_assignments pa
            JOIN trainingprograms tp ON pa.program_id = tp.id
            WHERE pa.organization_id = $1
        `;
        const params = [orgId];
        
        if (athlete_id) {
            query += ' AND pa.athlete_id = $2';
            params.push(athlete_id);
        } else if (batch_id) {
            query += ' AND pa.batch_id = $2';
            params.push(batch_id);
        }
        
        if (status) {
            query += ` AND pa.status = $${params.length + 1}`;
            params.push(status);
        }
        
        const result = await db.query(query, params);
        
        // Map to match frontend expectations
        const mapped = result.rows.map(row => ({
            ...row,
            program: {
                name: row.program_name,
                days: row.program_days.map(day => ({
                    ...day,
                    items: day.items.map(item => ({
                        ...item,
                        lift_items: {
                            id: item.id, // This is wi.id actually, but frontend uses lift_items.exercise
                            exercise_id: item.exercise_id,
                            sets: item.sets,
                            reps: item.reps,
                            load_value: item.load_value,
                            tempo: item.tempo,
                            rest_time_secs: item.rest_time_secs,
                            workout_grouping: item.workout_grouping,
                            each_side: item.each_side,
                            additional_info: item.additional_info,
                            exercise: { name: item.exercise_name }
                        }
                    }))
                }))
            }
        }));
        
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Program Assignment
router.delete('/program-assignments/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        await db.query('DELETE FROM program_assignments WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Workout Item
router.delete('/workout-items/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        // Verify ownership via day -> program -> org
        await db.query(`
            DELETE FROM workoutitems 
            WHERE id = $1 AND organization_id = $2
        `, [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Workout Item
router.post('/workout-items', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { workout_day_id, item_type, display_order, details } = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        
        const itemRes = await client.query(`
            INSERT INTO workoutitems (workout_day_id, item_type, display_order)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [workout_day_id, item_type, display_order]);
        
        const newItem = itemRes.rows[0];
        
        if (item_type === 'lift' || item_type === 'saqc') {
            await client.query(`
                INSERT INTO liftitems (
                    id, exercise_id, sets, reps, load_value, tempo, rest_time_secs, additional_info, workout_grouping, each_side
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                newItem.id, details.exercise_id, details.sets, details.reps, details.load_value, 
                details.tempo, details.rest_time_secs, details.additional_info, details.workout_grouping, details.each_side
            ]);
        }
        
        await client.query('COMMIT');
        
        // Return full item with details
        const fullItemRes = await db.query(`
            SELECT wi.*, li.sets, li.reps, li.load_value, li.tempo, li.rest_time_secs, li.additional_info, li.workout_grouping, li.each_side,
                   e.name as exercise_name
            FROM workoutitems wi
            LEFT JOIN liftitems li ON wi.id = li.id
            LEFT JOIN exercises e ON li.exercise_id = e.id
            WHERE wi.id = $1
        `, [newItem.id]);
        
        res.status(201).json(fullItemRes.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// PATCH Update Workout Item
router.patch('/workout-items/:id', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { item_type, display_order, details } = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        
        await client.query(`
            UPDATE workoutitems 
            SET item_type = COALESCE($1, item_type),
                display_order = COALESCE($2, display_order)
            WHERE id = $3
        `, [item_type, display_order, id]);
        
        if (item_type === 'lift' || item_type === 'saqc') {
            await client.query(`
                INSERT INTO liftitems (
                    id, exercise_id, sets, reps, load_value, tempo, rest_time_secs, additional_info, workout_grouping, each_side
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO UPDATE SET
                    exercise_id = EXCLUDED.exercise_id,
                    sets = EXCLUDED.sets,
                    reps = EXCLUDED.reps,
                    load_value = EXCLUDED.load_value,
                    tempo = EXCLUDED.tempo,
                    rest_time_secs = EXCLUDED.rest_time_secs,
                    additional_info = EXCLUDED.additional_info,
                    workout_grouping = EXCLUDED.workout_grouping,
                    each_side = EXCLUDED.each_side
            `, [
                id, details.exercise_id, details.sets, details.reps, details.load_value, 
                details.tempo, details.rest_time_secs, details.additional_info, details.workout_grouping, details.each_side
            ]);
        }
        
        await client.query('COMMIT');
        
        // Return full item with details
        const fullItemRes = await db.query(`
            SELECT wi.*, li.sets, li.reps, li.load_value, li.tempo, li.rest_time_secs, li.additional_info, li.workout_grouping, li.each_side,
                   e.name as exercise_name
            FROM workoutitems wi
            LEFT JOIN liftitems li ON wi.id = li.id
            LEFT JOIN exercises e ON li.exercise_id = e.id
            WHERE wi.id = $1
        `, [id]);
        
        res.json(fullItemRes.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// GET Batch Members
router.get('/batches/:id/members', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT p.id, p.first_name, p.last_name, p.uhid
            FROM batch_members bm
            JOIN profiles p ON bm.athlete_id = p.id
            WHERE bm.batch_id = $1
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create Batch
router.post('/batches', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            INSERT INTO batches (name, organization_id, created_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [name, orgId, req.user.id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Update Batch
router.patch('/batches/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            UPDATE batches 
            SET name = $1 
            WHERE id = $2 AND organization_id = $3
            RETURNING *
        `, [name, id, orgId]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Update Batch Members (Sync)
router.post('/batches/:id/members', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { athlete_ids } = req.body;
        
        await client.query('BEGIN');
        // 1. Remove old members
        await client.query('DELETE FROM batch_members WHERE batch_id = $1', [id]);
        // 2. Add new members
        for (const athleteId of athlete_ids) {
            await client.query(`
                INSERT INTO batch_members (batch_id, athlete_id)
                VALUES ($1, $2)
            `, [id, athleteId]);
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

// DELETE Remove Member from Batch
router.delete('/batches/:id/members/:athleteId', requireAuth, async (req, res) => {
    try {
        const { id, athleteId } = req.params;
        await db.query('DELETE FROM batch_members WHERE batch_id = $1 AND athlete_id = $2', [id, athleteId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Program Assignments (Bulk)
router.post('/program-assignments/bulk', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { assignments } = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        const results = [];
        for (const a of assignments) {
            const res = await client.query(`
                INSERT INTO program_assignments (
                    program_id, athlete_id, batch_id, start_date, organization_id, status
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [a.program_id, a.athlete_id || null, a.batch_id || null, a.start_date, orgId, a.status || 'active']);
            results.push(res.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(results);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// POST Sync Workout Items for a Day
router.post('/workout-days/:id/sync-items', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { items } = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        
        // 1. Delete existing items
        await client.query('DELETE FROM workoutitems WHERE workout_day_id = $1 AND organization_id = $2', [id, orgId]);
        
        // 2. Insert new items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemRes = await client.query(`
                INSERT INTO workoutitems (workout_day_id, organization_id, item_type, display_order)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [id, orgId, item.type || 'lift', i]);
            
            const newItemId = itemRes.rows[0].id;
            
            if (item.type === 'lift' || !item.type) {
                await client.query(`
                    INSERT INTO liftitems (
                        id, organization_id, exercise_id, sets, reps, load_value, load_type, 
                        tempo, rest_time_secs, workout_grouping, each_side, additional_info
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    newItemId, orgId, item.exerciseId, item.sets, item.reps, item.weight, item.load_type || 'absolute',
                    item.tempo, item.rest_time_secs, item.workout_grouping, item.each_side, item.additional_info
                ]);
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

// POST Wellness Log
router.post('/wellness-logs', requireAuth, async (req, res) => {
    try {
        const { sleep_score, stress_level, soreness_level, fatigue_level, soreness_data } = req.body;
        const orgId = req.user.organization_id;
        const athleteId = req.user.id;
        
        const result = await db.query(`
            INSERT INTO wellness_logs (organization_id, athlete_id, sleep_score, stress_level, soreness_level, fatigue_level, soreness_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [orgId, athleteId, sleep_score, stress_level, soreness_level, fatigue_level, JSON.stringify(soreness_data)]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Quick Assign Workout
router.post('/quick-assign', requireAuth, async (req, res) => {
    const client = await db.connect();
    try {
        const { title, days, startDate, athleteIds, batchId } = req.body;
        const orgId = req.user.organization_id;
        
        await client.query('BEGIN');
        
        // 1. Create Transient Program
        const programRes = await client.query(`
            INSERT INTO trainingprograms (name, description, organization_id, coach_id, status, is_template)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [title, 'Ad-hoc workout assigned from calendar', orgId, req.user.id, 'active', false]);
        
        const programId = programRes.rows[0].id;
        
        // 2. Create Days and Items
        for (let dIdx = 0; dIdx < days.length; dIdx++) {
            const day = days[dIdx];
            const dayRes = await client.query(`
                INSERT INTO workoutdays (program_id, organization_id, title, display_order)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [programId, orgId, day.title || 'Untitled Workout', dIdx]);
            
            const dayId = dayRes.rows[0].id;
            
            for (let iIdx = 0; iIdx < day.items.length; iIdx++) {
                const item = day.items[iIdx];
                const itemRes = await client.query(`
                    INSERT INTO workoutitems (workout_day_id, organization_id, item_type, display_order)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, [dayId, orgId, 'lift', iIdx]);
                
                const itemId = itemRes.rows[0].id;
                
                await client.query(`
                    INSERT INTO liftitems (
                        id, organization_id, exercise_id, sets, reps, load_value, load_type, 
                        tempo, rest_time_secs, workout_grouping, each_side, additional_info
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    itemId, orgId, item.exerciseId, item.sets, item.reps, item.weight, item.load_type || 'absolute',
                    item.tempo, item.rest_time_secs, item.workout_grouping, item.each_side, item.additional_info
                ]);
            }
        }
        
        // 3. Assign
        if (batchId) {
            await client.query(`
                INSERT INTO program_assignments (program_id, batch_id, start_date, organization_id, status)
                VALUES ($1, $2, $3, $4, $5)
            `, [programId, batchId, startDate, orgId, 'active']);
        } else if (athleteIds && athleteIds.length > 0) {
            for (const aId of athleteIds) {
                await client.query(`
                    INSERT INTO program_assignments (program_id, athlete_id, start_date, organization_id, status)
                    VALUES ($1, $2, $3, $4, $5)
                `, [programId, aId, startDate, orgId, 'active']);
            }
        }
        
        await client.query('COMMIT');
        res.status(201).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// --- Scientific Resources ---
// GET all scientific resources
router.get('/resources', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { athleteId, category } = req.query;
        
        let query = `
            SELECT sr.*, 
                   (SELECT json_build_object('first_name', c.first_name, 'last_name', c.last_name, 'uhid', c.uhid) 
                    FROM clients c WHERE c.id = sr.athlete_id) as athlete
            FROM scientific_resources sr
            WHERE sr.organization_id = $1
        `;
        const params = [orgId];
        let paramIndex = 2;

        if (athleteId) {
            query += ` AND sr.athlete_id = $${paramIndex}`;
            params.push(athleteId);
            paramIndex++;
        }

        if (category && category !== 'all') {
            query += ` AND sr.category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        query += ` ORDER BY sr.created_at DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Create scientific resource
router.post('/resources', requireAuth, async (req, res) => {
    try {
        const { title, category, type, description, url, thumbnail_url, tags, is_public } = req.body;
        const orgId = req.user.organization_id;
        const result = await db.query(`
            INSERT INTO scientific_resources (
                organization_id, title, category, type, description, url, thumbnail_url, tags, is_public, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [orgId, title, category, type, description || null, url, thumbnail_url || null, tags || [], is_public || false, req.user.id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH Update scientific resource
router.patch('/resources/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const orgId = req.user.organization_id;

        const keys = Object.keys(updates);
        if (keys.length === 0) return res.status(400).json({ error: 'No updates provided' });

        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = Object.values(updates);
        values.push(id, orgId);

        const query = `UPDATE scientific_resources SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} AND organization_id = $${keys.length + 2} RETURNING *`;
        const result = await db.query(query, values);
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE scientific resource
router.delete('/resources/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        await db.query('DELETE FROM scientific_resources WHERE id = $1 AND organization_id = $2', [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Template Endpoints ───────────────────────────────────────────────────────

// GET training templates
router.get('/templates', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const programs = await db.query(
            `SELECT tp.*, 
                    json_build_object('full_name', p.full_name) AS coach
             FROM training_programs tp
             LEFT JOIN profiles p ON tp.coach_id = p.id
             WHERE tp.org_id = $1 AND tp.is_template = true
             ORDER BY tp.created_at DESC`,
            [orgId]
        );

        // For each program, fetch days and items
        const results = [];
        for (const program of programs.rows) {
            const days = await db.query(
                `SELECT * FROM workout_days WHERE program_id = $1 ORDER BY display_order`,
                [program.id]
            );

            const daysWithItems = [];
            for (const day of days.rows) {
                const items = await db.query(
                    `SELECT wi.*, 
                            json_build_object(
                                'exercise_id', li.exercise_id,
                                'sets', li.sets,
                                'reps', li.reps,
                                'load_value', li.load_value,
                                'tempo', li.tempo,
                                'rest_time_secs', li.rest_time_secs,
                                'workout_grouping', li.workout_grouping,
                                'each_side', li.each_side,
                                'additional_info', li.additional_info,
                                'exercise', json_build_object('name', e.name)
                            ) AS lift_items
                     FROM workout_items wi
                     LEFT JOIN lift_items li ON wi.id = li.id
                     LEFT JOIN exercises e ON li.exercise_id = e.id
                     WHERE wi.workout_day_id = $1
                     ORDER BY wi.display_order`,
                    [day.id]
                );
                daysWithItems.push({ ...day, items: items.rows });
            }
            results.push({ ...program, days: daysWithItems });
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create training template
router.post('/templates', requireAuth, async (req, res) => {
    try {
        const { name, days } = req.body;
        const orgId = req.user.organization_id;
        const userId = req.user.id;

        const programResult = await db.query(
            `INSERT INTO training_programs (name, description, org_id, coach_id, status, is_template)
             VALUES ($1, $2, $3, $4, 'active', true)
             RETURNING *`,
            [name || 'Workout Template', 'Pre-built workout template', orgId, userId]
        );
        const program = programResult.rows[0];

        if (days && days.length) {
            for (let di = 0; di < days.length; di++) {
                const day = days[di];
                const dayResult = await db.query(
                    `INSERT INTO workout_days (program_id, org_id, title, display_order)
                     VALUES ($1, $2, $3, $4) RETURNING *`,
                    [program.id, orgId, day.title || 'Untitled Workout', di]
                );
                const dayRow = dayResult.rows[0];

                if (day.items) {
                    for (let ii = 0; ii < day.items.length; ii++) {
                        const item = day.items[ii];
                        const itemResult = await db.query(
                            `INSERT INTO workout_items (workout_day_id, org_id, item_type, display_order)
                             VALUES ($1, $2, 'lift', $3) RETURNING *`,
                            [dayRow.id, orgId, ii]
                        );
                        const itemRow = itemResult.rows[0];

                        await db.query(
                            `INSERT INTO lift_items (id, org_id, exercise_id, sets, reps, load_value, tempo, rest_time_secs, workout_grouping, each_side, additional_info)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                            [
                                itemRow.id, orgId, item.exerciseId,
                                item.sets, item.reps, item.weight || 0,
                                item.tempo || '0-0-0-0', item.rest_time_secs || 60,
                                item.workout_grouping || '', item.each_side || false,
                                item.additional_info || ''
                            ]
                        );
                    }
                }
            }
        }

        res.status(201).json(program);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update training template (replaces days/items)
router.put('/templates/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, days } = req.body;
        const orgId = req.user.organization_id;

        // Update program name
        await db.query(
            `UPDATE training_programs SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND org_id = $3`,
            [name, id, orgId]
        );

        // Delete old days (cascade handles items/lifts)
        await db.query(`DELETE FROM workout_days WHERE program_id = $1`, [id]);

        // Re-create days and items
        if (days && days.length) {
            for (let di = 0; di < days.length; di++) {
                const day = days[di];
                const dayResult = await db.query(
                    `INSERT INTO workout_days (program_id, org_id, title, display_order)
                     VALUES ($1, $2, $3, $4) RETURNING *`,
                    [id, orgId, day.title || 'Untitled Workout', di]
                );
                const dayRow = dayResult.rows[0];

                if (day.items) {
                    for (let ii = 0; ii < day.items.length; ii++) {
                        const item = day.items[ii];
                        const itemResult = await db.query(
                            `INSERT INTO workout_items (workout_day_id, org_id, item_type, display_order)
                             VALUES ($1, $2, 'lift', $3) RETURNING *`,
                            [dayRow.id, orgId, ii]
                        );
                        const itemRow = itemResult.rows[0];

                        await db.query(
                            `INSERT INTO lift_items (id, org_id, exercise_id, sets, reps, load_value, tempo, rest_time_secs, workout_grouping, each_side, additional_info)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                            [
                                itemRow.id, orgId, item.exerciseId,
                                item.sets, item.reps, item.weight || 0,
                                item.tempo || '0-0-0-0', item.rest_time_secs || 60,
                                item.workout_grouping || '', item.each_side || false,
                                item.additional_info || ''
                            ]
                        );
                    }
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE training template
router.delete('/templates/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.organization_id;
        await db.query(`DELETE FROM training_programs WHERE id = $1 AND org_id = $2`, [id, orgId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET External Training Summary
router.get('/external-training-summary', requireAuth, async (req, res) => {
    try {
        const { client_id } = req.query;
        const orgId = req.user.organization_id;
        const result = await db.query(
            'SELECT training_date, training_load FROM external_training_summary WHERE client_id = $1 AND organization_id = $2 ORDER BY training_date ASC',
            [client_id, orgId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST Performance Assessments
router.post('/performance-assessments', requireAuth, async (req, res) => {
    try {
        const payload = req.body; // Array of results
        if (!Array.isArray(payload)) return res.status(400).json({ error: 'Payload must be an array' });

        const client = await db.connect();
        try {
            await client.query('BEGIN');
            for (const item of payload) {
                await client.query(`
                    INSERT INTO performance_assessments (
                        athlete_id, category, test_name, metrics, recorded_by, organization_id
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [item.athlete_id, item.category, item.test_name, JSON.stringify(item.metrics), req.user.id, req.user.organization_id]);
            }
            await client.query('COMMIT');
            res.status(201).json({ success: true, count: payload.length });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET training sessions
router.get('/training-sessions', requireAuth, async (req, res) => {
    try {
        const { athlete_id, start_date } = req.query;
        const orgId = req.user.organization_id;
        
        let query = 'SELECT session_date, calculated_load FROM training_sessions WHERE athlete_id = $1 AND organization_id = $2';
        const params = [athlete_id, orgId];
        
        if (start_date) {
            query += ' AND session_date >= $3';
            params.push(start_date);
        }
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET athlete item logs for strength analytics
router.get('/athlete-item-logs', requireAuth, async (req, res) => {
    try {
        const { athlete_id } = req.query;
        const orgId = req.user.organization_id;
        
        const result = await db.query(`
            SELECT ail.logged_at AS created_at, 
                   ail.sets_completed,
                   wi.id AS workout_item_id,
                   li.exercise_id,
                   e.name AS exercise_name,
                   e.category AS exercise_category
            FROM athlete_item_logs ail
            JOIN workoutitems wi ON ail.workout_item_id = wi.id
            JOIN liftitems li ON wi.id = li.id
            JOIN exercises e ON li.exercise_id = e.id
            WHERE ail.athlete_id = $1 AND ail.organization_id = $2
            ORDER BY ail.logged_at ASC
        `, [athlete_id, orgId]);
        
        const expanded = [];
        result.rows.forEach(row => {
            const sets = typeof row.sets_completed === 'string' ? JSON.parse(row.sets_completed) : (row.sets_completed || []);
            if (Array.isArray(sets)) {
                sets.forEach(set => {
                    expanded.push({
                        weight_kg: set.weight_kg,
                        reps: set.reps,
                        created_at: row.created_at,
                        exercise_id: row.exercise_id,
                        exercises: {
                            name: row.exercise_name,
                            category: row.exercise_category
                        }
                    });
                });
            }
        });
        
        res.json(expanded);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET exercise history for an athlete
router.get('/exercise-history/:exerciseId', requireAuth, async (req, res) => {
    try {
        const { exerciseId } = req.params;
        const athleteId = req.user.id;
        
        const lastRes = await db.query(`
            SELECT ail.sets_completed, ail.logged_at
            FROM athlete_item_logs ail
            JOIN liftitems li ON ail.workout_item_id = li.id
            WHERE li.exercise_id = $1 AND ail.athlete_id = $2
            ORDER BY ail.logged_at DESC
            LIMIT 1
        `, [exerciseId, athleteId]);
        
        const allRes = await db.query(`
            SELECT ail.sets_completed
            FROM athlete_item_logs ail
            JOIN liftitems li ON ail.workout_item_id = li.id
            WHERE li.exercise_id = $1 AND ail.athlete_id = $2
        `, [exerciseId, athleteId]);
        
        let best = null;
        allRes.rows.forEach(row => {
            const sets = typeof row.sets_completed === 'string' ? JSON.parse(row.sets_completed) : (row.sets_completed || []);
            if (Array.isArray(sets)) {
                sets.forEach(set => {
                    if (!best || set.weight_kg > best.weight_kg || (set.weight_kg === best.weight_kg && set.reps > best.reps)) {
                        best = { weight_kg: set.weight_kg, reps: set.reps };
                    }
                });
            }
        });
        
        let last = null;
        if (lastRes.rows[0]) {
            const sets = typeof lastRes.rows[0].sets_completed === 'string' ? JSON.parse(lastRes.rows[0].sets_completed) : (lastRes.rows[0].sets_completed || []);
            if (Array.isArray(sets) && sets.length > 0) {
                const lastSet = sets[sets.length - 1];
                last = {
                    weight_kg: lastSet.weight_kg,
                    reps: lastSet.reps,
                    date: lastRes.rows[0].logged_at
                };
            }
        }
        
        res.json({ last, best });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET performance assessments
router.get('/performance-assessments', requireAuth, async (req, res) => {
    try {
        const { athlete_id } = req.query;
        const orgId = req.user.organization_id;
        
        let query = 'SELECT * FROM performance_assessments WHERE organization_id = $1';
        const params = [orgId];
        
        if (athlete_id) {
            query += ' AND athlete_id = $2';
            params.push(athlete_id);
        }
        
        query += ' ORDER BY recorded_at DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
