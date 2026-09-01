/**
 * TeamComms Notification Bridge
 * ─────────────────────────────────────────────────────────────
 * Listens to the existing `system_notifications` PostgreSQL channel
 * and converts Hub events into automated HubBot messages in TeamComms.
 *
 * Attach this to the existing server by calling startNotificationBridge(io, db).
 */

import { db } from './db.js';
import { sendPushToUser } from './pushNotificationService.js';

// ─────────────────────────────────────────────────────────────
// HubBot message poster
// ─────────────────────────────────────────────────────────────

/**
 * Posts an automated message as HubBot to a channel.
 * @param {string} orgId
 * @param {string} channelName - e.g. 'hub-notifications' or 'general'
 * @param {string} messageType - automated_task | automated_appointment | etc.
 * @param {string} content     - plain text content
 * @param {object} metadata    - JSONB payload for rich card rendering
 * @param {object} io          - Socket.io server instance
 */
async function postBotMessage(orgId, channelName, messageType, content, metadata, io) {
  try {
    // Get HubBot for this org
    const botRes = await db.query(
      `SELECT id FROM chat_bots WHERE organization_id = $1 AND name = 'HubBot' LIMIT 1`,
      [orgId]
    );
    if (botRes.rows.length === 0) return;
    const botId = botRes.rows[0].id;

    // Find the target channel by name (default to hub-notifications)
    const chanRes = await db.query(
      `SELECT id FROM chat_channels WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL LIMIT 1`,
      [orgId, channelName]
    );
    if (chanRes.rows.length === 0) return;
    const channelId = chanRes.rows[0].id;

    const msgRes = await db.query(
      `INSERT INTO chat_messages
         (organization_id, channel_id, bot_id, message_type, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orgId, channelId, botId, messageType, content, JSON.stringify(metadata)]
    );
    const message = msgRes.rows[0];

    // Broadcast via Socket.io to the channel room
    if (io) {
      io.to(`${orgId}:${channelId}`).emit('new_message', {
        ...message,
        bot_name: 'HubBot',
        is_automated: true,
      });
    }
  } catch (err) {
    console.error('[NotificationBridge] Error posting bot message:', err);
  }
}

/**
 * Posts an automated DM as HubBot to a specific user.
 * @param {string} orgId
 * @param {string} targetUserId
 * @param {string} messageType
 * @param {string} content
 * @param {object} metadata
 * @param {object} io
 */
async function postBotDM(orgId, targetUserId, messageType, content, metadata, io) {
  try {
    const botRes = await db.query(
      `SELECT id FROM chat_bots WHERE organization_id = $1 AND name = 'HubBot' LIMIT 1`,
      [orgId]
    );
    if (botRes.rows.length === 0) return;
    const botId = botRes.rows[0].id;

    // Find or create a DM thread: canonical sort ensures uniqueness
    // We use a special "system DM" approach — use bot_id as sender, store in a channel
    // Instead, we post to hub-notifications and tag the user in metadata
    const chanRes = await db.query(
      `SELECT id FROM chat_channels WHERE organization_id = $1 AND name = 'hub-notifications' AND deleted_at IS NULL LIMIT 1`,
      [orgId]
    );
    if (chanRes.rows.length === 0) return;
    const channelId = chanRes.rows[0].id;

    // Ensure target user is a member of hub-notifications channel
    await db.query(
      `INSERT INTO channel_members (channel_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (channel_id, user_id) DO NOTHING`,
      [channelId, targetUserId]
    );

    const msgRes = await db.query(
      `INSERT INTO chat_messages
         (organization_id, channel_id, bot_id, message_type, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orgId, channelId, botId, messageType, content, JSON.stringify({ ...metadata, mention_user_id: targetUserId })]
    );

    if (io) {
      io.to(`${orgId}:${channelId}`).emit('new_message', {
        ...msgRes.rows[0],
        bot_name: 'HubBot',
        is_automated: true,
      });
      // Also notify the user's personal socket room
      io.to(`user:${targetUserId}`).emit('personal_notification', {
        type: messageType,
        content,
        metadata,
        created_at: new Date().toISOString(),
      });
    }

    // Web Push notification to target user
    (async () => {
      try {
        await sendPushToUser(targetUserId, {
          title: 'HubBot • Automated Alert',
          body: content || 'You have a new system alert in TeamComms',
          icon: '/logo.png',
          badge: '/favicon.svg',
          data: {
            url: metadata?.action_url || `/messenger?channel=${channelId}`,
            type: 'system',
          },
          tag: `bot-${Date.now()}`,
        });
      } catch (pushErr) {
        console.error('[WebPush] Error sending bot DM push:', pushErr);
      }
    })();
  } catch (err) {
    console.error('[NotificationBridge] Error posting bot DM:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Event → Message routing
// ─────────────────────────────────────────────────────────────

async function handleSystemNotification(notification, io) {
  const { organization_id: orgId, category, data } = notification;
  if (!orgId || !category) return;

  // Check if TeamComms is enabled and what notifications are allowed
  const settingsRes = await db.query(
    `SELECT * FROM teamcomms_settings WHERE organization_id = $1`,
    [orgId]
  );
  const settings = settingsRes.rows[0] || { is_enabled: true };
  if (!settings.is_enabled) return;

  switch (category) {
    // ── Planner: Task Assigned ──────────────────────────────
    case 'task_assigned': {
      if (!settings.notify_task_assigned) break;
      const { task_title, task_id, assignee_id, project_name, due_date } = data || {};
      const content = `📋 **Task Assigned:** "${task_title || 'New Task'}"${project_name ? ` in *${project_name}*` : ''}${due_date ? ` · Due ${new Date(due_date).toLocaleDateString()}` : ''}`;
      await postBotDM(orgId, assignee_id, 'automated_task', content, {
        module: 'planner', task_id, task_title, project_name, due_date,
        action_url: `/planner`, action_label: 'View Task',
      }, io);
      await postBotMessage(orgId, 'hub-notifications', 'automated_task', content, {
        module: 'planner', task_id, task_title,
      }, io);
      break;
    }

    // ── Planner: Task Overdue ───────────────────────────────
    case 'task_overdue': {
      if (!settings.notify_task_overdue) break;
      const { task_title, task_id, assignee_id, project_name } = data || {};
      const content = `⚠️ **Overdue Task:** "${task_title || 'Task'}"${project_name ? ` in *${project_name}*` : ''} is past its due date.`;
      await postBotDM(orgId, assignee_id, 'automated_task', content, {
        module: 'planner', task_id, task_title, action_url: `/planner`, action_label: 'View Task',
      }, io);
      break;
    }

    // ── Appointment Scheduled ───────────────────────────────
    case 'appointment_scheduled': {
      if (!settings.notify_appointment) break;
      const { client_id, consultant_id, appointment_date, appointment_time, service_type } = data || {};
      const dateStr = appointment_date ? new Date(appointment_date).toLocaleDateString() : '';
      const content = `📅 **Appointment Scheduled:** ${service_type || 'Session'} on ${dateStr}${appointment_time ? ` at ${appointment_time}` : ''}`;
      if (client_id) {
        await postBotDM(orgId, client_id, 'automated_appointment', content, {
          module: 'appointments', action_url: `/client`, action_label: 'View Appointment',
        }, io);
      }
      if (consultant_id) {
        await postBotDM(orgId, consultant_id, 'automated_appointment', content, {
          module: 'appointments', action_url: `/consultant`, action_label: 'View Schedule',
        }, io);
      }
      break;
    }

    // ── Leave Approved / Rejected ───────────────────────────
    case 'leave_approved':
    case 'leave_rejected': {
      if (!settings.notify_leave) break;
      const { employee_id, leave_type, start_date, end_date, status } = data || {};
      const statusIcon = status === 'approved' ? '✅' : '❌';
      const content = `${statusIcon} **Leave ${status === 'approved' ? 'Approved' : 'Rejected'}:** Your ${leave_type || ''} leave request for ${start_date || ''} – ${end_date || ''} has been ${status}.`;
      await postBotDM(orgId, employee_id, 'automated_leave', content, {
        module: 'hr', action_url: `/hr`, action_label: 'View Leave',
      }, io);
      break;
    }

    // ── Clinical Report Published ───────────────────────────
    case 'clinical_report_published': {
      if (!settings.notify_clinical_report) break;
      const { client_id, report_title, report_id, consultant_name } = data || {};
      const content = `🏥 **Clinical Report Ready:** "${report_title || 'Your clinical report'}"${consultant_name ? ` from ${consultant_name}` : ''} is now available.`;
      if (client_id) {
        await postBotDM(orgId, client_id, 'automated_clinical', content, {
          module: 'clinical', report_id, action_url: `/client`, action_label: 'View Report',
        }, io);
      }
      break;
    }

    // ── Meal Plan Assigned ──────────────────────────────────
    case 'meal_plan_assigned': {
      if (!settings.notify_meal_plan) break;
      const { client_id, plan_name, nutritionist_name } = data || {};
      const content = `🥗 **Meal Plan Assigned:** "${plan_name || 'New Meal Plan'}"${nutritionist_name ? ` by ${nutritionist_name}` : ''} has been assigned to you.`;
      if (client_id) {
        await postBotDM(orgId, client_id, 'automated_nutrition', content, {
          module: 'nutrition', action_url: `/client`, action_label: 'View Meal Plan',
        }, io);
      }
      break;
    }

    // ── Membership Expiring ─────────────────────────────────
    case 'membership_expiry_warning': {
      if (!settings.notify_membership_expiry) break;
      const { client_id, expiry_date, days_remaining, plan_name } = data || {};
      const content = `⏰ **Membership Expiring:** Your ${plan_name || 'membership'} expires in ${days_remaining || ''} day(s) on ${expiry_date || ''}. Please renew to continue services.`;
      if (client_id) {
        await postBotDM(orgId, client_id, 'automated_membership', content, {
          module: 'billing', expiry_date, action_url: `/client`, action_label: 'Renew Membership',
        }, io);
      }
      await postBotMessage(orgId, 'hub-notifications', 'automated_membership',
        `⏰ **Membership Expiring:** A client's ${plan_name || 'membership'} expires in ${days_remaining || ''} day(s).`, {
          module: 'billing', client_id,
        }, io);
      break;
    }

    default:
      // Unknown category — silently ignore
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// Start the bridge
// ─────────────────────────────────────────────────────────────

export async function startNotificationBridge(io) {
  let pgListenClient;

  async function connect() {
    try {
      pgListenClient = await db.connect();

      pgListenClient.on('error', (err) => {
        console.error('[NotificationBridge] PG client error, reconnecting:', err.message);
        try { pgListenClient.release(true); } catch (_) {}
        setTimeout(connect, 5000);
      });

      // Listen on existing Hub notification channel
      await pgListenClient.query('LISTEN system_notifications');
      console.log('[NotificationBridge] Listening on system_notifications channel');

      pgListenClient.on('notification', async (msg) => {
        try {
          const payload = JSON.parse(msg.payload);
          await handleSystemNotification(payload, io);
        } catch (err) {
          console.error('[NotificationBridge] Error handling notification:', err);
        }
      });
    } catch (err) {
      console.error('[NotificationBridge] Connection failed, retrying:', err.message);
      if (pgListenClient) {
        try { pgListenClient.release(true); } catch (_) {}
      }
      setTimeout(connect, 5000);
    }
  }

  connect();
}
