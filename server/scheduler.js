/**
 * TeamComms Scheduled Report Scheduler
 * ─────────────────────────────────────────────────────────────
 * Runs configured cron jobs to publish automated report messages
 * to designated TeamComms channels.
 *
 * Usage: startScheduler(io) — called once from server.js
 */

import cron from 'node-cron';
import { db } from './db.js';

// Active cron tasks — keyed by scheduled_report.id
const activeTasks = new Map();

// ─────────────────────────────────────────────────────────────
// Report generators
// ─────────────────────────────────────────────────────────────

async function generateAttendanceSummary(orgId) {
  const result = await db.query(
    `SELECT
       COUNT(DISTINCT user_id) FILTER (WHERE status = 'present') as present_count,
       COUNT(DISTINCT user_id) FILTER (WHERE status = 'absent') as absent_count,
       COUNT(DISTINCT user_id) FILTER (WHERE status = 'late') as late_count
     FROM hr_attendance
     WHERE organization_id = $1
       AND DATE(check_in) = CURRENT_DATE`,
    [orgId]
  );
  const d = result.rows[0] || {};
  return `📊 **Daily Attendance Summary** *(${new Date().toLocaleDateString()})*\n` +
    `✅ Present: **${d.present_count || 0}**\n` +
    `❌ Absent: **${d.absent_count || 0}**\n` +
    `⏰ Late: **${d.late_count || 0}**`;
}

async function generateAppointmentsToday(orgId) {
  const result = await db.query(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
     FROM appointments
     WHERE organization_id = $1
       AND DATE(appointment_date) = CURRENT_DATE`,
    [orgId]
  );
  const d = result.rows[0] || {};
  return `📅 **Today's Appointments** *(${new Date().toLocaleDateString()})*\n` +
    `Total: **${d.total || 0}** | Scheduled: **${d.scheduled || 0}** | ` +
    `Completed: **${d.completed || 0}** | Cancelled: **${d.cancelled || 0}**`;
}

async function generateBillingSummary(orgId) {
  const result = await db.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as collected,
       COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending,
       COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
     FROM billing_invoices
     WHERE organization_id = $1
       AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE)`,
    [orgId]
  );
  const d = result.rows[0] || {};
  return `💰 **Weekly Billing Summary** *(Week of ${new Date().toLocaleDateString()})*\n` +
    `Collected: **₹${Number(d.collected || 0).toLocaleString()}** | ` +
    `Pending: **₹${Number(d.pending || 0).toLocaleString()}** | ` +
    `Overdue invoices: **${d.overdue_count || 0}**`;
}

async function generateExpiringMemberships(orgId) {
  const result = await db.query(
    `SELECT COUNT(*) as count
     FROM client_memberships
     WHERE organization_id = $1
       AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       AND status = 'active'`,
    [orgId]
  );
  const count = result.rows[0]?.count || 0;
  return `⏰ **Expiring Memberships** — **${count}** membership(s) expire within the next 7 days.` +
    (count > 0 ? ' Please follow up with affected clients.' : ' All good! 🎉');
}

async function generateClinicalReportCount(orgId) {
  const result = await db.query(
    `SELECT COUNT(*) as this_week,
            COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
     FROM clinical_reports
     WHERE organization_id = $1
       AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE)`,
    [orgId]
  );
  const d = result.rows[0] || {};
  return `🏥 **Weekly Clinical Report Summary**\n` +
    `Reports this week: **${d.this_week || 0}** | Today: **${d.today || 0}**`;
}

// ─────────────────────────────────────────────────────────────
// Report type dispatcher
// ─────────────────────────────────────────────────────────────

const REPORT_GENERATORS = {
  attendance_summary: generateAttendanceSummary,
  appointments_today: generateAppointmentsToday,
  billing_summary: generateBillingSummary,
  expiring_memberships: generateExpiringMemberships,
  clinical_report_count: generateClinicalReportCount,
};

// ─────────────────────────────────────────────────────────────
// Post a report to a channel
// ─────────────────────────────────────────────────────────────

async function postScheduledReport(reportConfig, io) {
  const { id: reportId, organization_id: orgId, channel_id: channelId, report_type } = reportConfig;
  try {
    const generator = REPORT_GENERATORS[report_type];
    if (!generator) {
      console.warn(`[Scheduler] Unknown report type: ${report_type}`);
      return;
    }

    const content = await generator(orgId).catch((err) => {
      console.error(`[Scheduler] Error generating ${report_type}:`, err);
      return `📊 **${report_type.replace(/_/g, ' ')}** — Report generation encountered an error. Please check manually.`;
    });

    // Get HubBot
    const botRes = await db.query(
      `SELECT id FROM chat_bots WHERE organization_id = $1 AND name = 'HubBot' LIMIT 1`,
      [orgId]
    );
    if (botRes.rows.length === 0) return;
    const botId = botRes.rows[0].id;

    const msgRes = await db.query(
      `INSERT INTO chat_messages
         (organization_id, channel_id, bot_id, message_type, content, metadata)
       VALUES ($1, $2, $3, 'automated_report', $4, $5)
       RETURNING *`,
      [orgId, channelId, botId, content, JSON.stringify({ report_type, generated_at: new Date().toISOString() })]
    );

    // Update last_run_at
    await db.query(
      `UPDATE teamcomms_scheduled_reports SET last_run_at = NOW() WHERE id = $1`,
      [reportId]
    );

    // Broadcast
    if (io) {
      io.to(`${orgId}:${channelId}`).emit('new_message', {
        ...msgRes.rows[0],
        bot_name: 'HubBot',
        is_automated: true,
      });
    }

    console.log(`[Scheduler] Posted ${report_type} for org ${orgId}`);
  } catch (err) {
    console.error(`[Scheduler] Error posting scheduled report ${reportId}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────
// Load and schedule all active reports
// ─────────────────────────────────────────────────────────────

async function loadAndScheduleAll(io) {
  try {
    // Cancel existing tasks
    for (const [id, task] of activeTasks.entries()) {
      task.stop();
      activeTasks.delete(id);
    }

    const result = await db.query(
      `SELECT sr.*, ts.is_enabled as tc_enabled
       FROM teamcomms_scheduled_reports sr
       JOIN teamcomms_settings ts ON ts.organization_id = sr.organization_id
       WHERE sr.is_active = TRUE AND ts.is_enabled = TRUE`
    );

    for (const report of result.rows) {
      if (!cron.validate(report.cron_expression)) {
        console.warn(`[Scheduler] Invalid cron for report ${report.id}: ${report.cron_expression}`);
        continue;
      }

      const task = cron.schedule(report.cron_expression, () => {
        postScheduledReport(report, io);
      }, { timezone: 'Asia/Kolkata' });

      activeTasks.set(report.id, task);
      console.log(`[Scheduler] Scheduled ${report.report_type} (${report.cron_expression}) for org ${report.organization_id}`);
    }

    console.log(`[Scheduler] ${activeTasks.size} scheduled report(s) active`);
  } catch (err) {
    console.error('[Scheduler] Error loading scheduled reports:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Start the scheduler. Call once from server.js after io is initialized.
 * @param {object} io - Socket.io server instance
 */
export async function startScheduler(io) {
  console.log('[Scheduler] Starting TeamComms scheduled report engine...');
  await loadAndScheduleAll(io);

  // Reload every 5 minutes to pick up new/deleted reports
  cron.schedule('*/5 * * * *', async () => {
    await loadAndScheduleAll(io);
  });
}

/**
 * Trigger an immediate one-off report (e.g. from admin "Run Now" button)
 * @param {string} reportId
 * @param {object} io
 */
export async function triggerReportNow(reportId, io) {
  const result = await db.query(
    `SELECT * FROM teamcomms_scheduled_reports WHERE id = $1`,
    [reportId]
  );
  if (result.rows.length === 0) throw new Error('Report not found');
  await postScheduledReport(result.rows[0], io);
}
