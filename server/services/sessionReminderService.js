/**
 * Daily End-of-Day Session Reconciliation Reminder Service
 * ─────────────────────────────────────────────────────────────
 * Audits sessions scheduled for the current day across the clinic.
 * Detects:
 *   1. Unfinalized statuses (Planned, Scheduled, In Progress, Pending)
 *   2. Completed sessions with missing/empty clinical/SOAP notes
 *
 * Sends personalized digests strictly containing each practitioner's
 * own pending sessions via:
 *   - Registered Email Address (HTML formatted digest)
 *   - TeamComms Messenger Account (HubBot automated card + socket + web push)
 */

import nodemailer from 'nodemailer';
import { db } from '../db.js';
import { sendPushToUser } from '../pushNotificationService.js';

// Configure Nodemailer transporter — identical settings to auth.js password-reset flow
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.email.ap-hyderabad-1.oci.oraclecloud.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Check if SMTP is configured (mirrors auth.js logic exactly).
 * Only treat as dev/simulation mode if SMTP_PASS is absent or a known placeholder.
 * When real credentials are configured (e.g. OCI Email Delivery), this returns false
 * and real emails are sent via the same transporter used for password reset.
 */
function isDevSmtp() {
  return (
    !process.env.SMTP_PASS ||
    process.env.SMTP_PASS === 'your_smtp_password' ||
    process.env.SMTP_PASS === 'your_password'
  );
}

/**
 * Format timestamp to 12-hour time string in Asia/Kolkata timezone
 */
function formatTimeIST(dateVal) {
  if (!dateVal) return '--:--';
  const d = new Date(dateVal);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date to human readable string in Asia/Kolkata timezone
 */
function formatDateIST(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Fetch or auto-create HubBot for an organization,
 * ensuring bot exists in users and profiles tables so it can establish direct message threads.
 */
export async function getOrCreateHubBot(orgId) {
  let botId;
  const res = await db.query(
    `SELECT id FROM chat_bots WHERE organization_id = $1 AND name = 'HubBot' LIMIT 1`,
    [orgId]
  );
  if (res.rows.length > 0) {
    botId = res.rows[0].id;
  } else {
    const ins = await db.query(
      `INSERT INTO chat_bots (organization_id, name, description)
       VALUES ($1, 'HubBot', 'Automated system notifications from Sports Health Hub')
       RETURNING id`,
      [orgId]
    );
    botId = ins.rows[0].id;
  }

  // Ensure system user & profile exist for HubBot so direct_message_threads foreign keys are satisfied
  const botEmail = `hubbot_${botId.replace(/-/g, '')}@ishpo.internal`;
  await db.query(
    `INSERT INTO users (id, email, role)
     VALUES ($1, $2, 'bot')
     ON CONFLICT (id) DO UPDATE SET role = 'bot'`,
    [botId, botEmail]
  );

  await db.query(
    `INSERT INTO profiles (id, first_name, last_name, organization_id, ams_role, profession, is_approved)
     VALUES ($1, 'HubBot', '', $2, 'System Bot', 'Automated Assistant', true)
     ON CONFLICT (id) DO UPDATE SET 
       first_name = 'HubBot',
       last_name = '',
       organization_id = COALESCE(profiles.organization_id, EXCLUDED.organization_id),
       ams_role = 'System Bot',
       profession = 'Automated Assistant'`,
    [botId, orgId]
  );

  return botId;
}

/**
 * Get or create a private 1-on-1 Direct Message thread between HubBot and a practitioner.
 * This guarantees strict privacy so no other clinic staff can view this practitioner's reminders.
 */
export async function getOrCreateBotDMThread(orgId, botId, practitionerId) {
  // Ensure practitioner profile exists (in case user was created without profile record)
  const pCheck = await db.query(`SELECT id FROM profiles WHERE id = $1`, [practitionerId]);
  if (pCheck.rows.length === 0) {
    const uRes = await db.query(`SELECT email, role FROM users WHERE id = $1`, [practitionerId]);
    const email = uRes.rows[0]?.email || 'user';
    const parts = email.split('@')[0].split(/[._-]/);
    const fn = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || 'Staff';
    const ln = parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || '';
    await db.query(
      `INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (id) DO NOTHING`,
      [practitionerId, fn, ln, orgId]
    );
  }

  const [userA, userB] = [botId, practitionerId].sort();

  const dmRes = await db.query(
    `INSERT INTO direct_message_threads (organization_id, user_a, user_b, last_message_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (organization_id, user_a, user_b)
     DO UPDATE SET last_message_at = NOW()
     RETURNING *`,
    [orgId, userA, userB]
  );

  return dmRes.rows[0].id;
}

/**
 * Ensure hub-notifications channel exists and user is a member (for general announcements only)
 */
async function ensureHubNotificationsChannel(orgId, userId) {
  let chanRes = await db.query(
    `SELECT id FROM chat_channels WHERE organization_id = $1 AND name = 'hub-notifications' AND deleted_at IS NULL LIMIT 1`,
    [orgId]
  );

  let channelId;
  if (chanRes.rows.length === 0) {
    const newChan = await db.query(
      `INSERT INTO chat_channels (organization_id, name, description, channel_type, is_read_only)
       VALUES ($1, 'hub-notifications', 'Automated alerts and general notices', 'automated', false)
       RETURNING id`,
      [orgId]
    );
    channelId = newChan.rows[0].id;
  } else {
    channelId = chanRes.rows[0].id;
  }

  if (userId) {
    await db.query(
      `INSERT INTO channel_members (channel_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (channel_id, user_id) DO NOTHING`,
      [channelId, userId]
    );
  }

  return channelId;
}

/**
 * Query all pending sessions for an organization for the given date,
 * strictly mapped to the assigned practitioner.
 */
export async function getPendingSessionsForOrg(orgId, targetDate, scopeOptions = {}) {
  const requireStatusUpdate = scopeOptions.require_status_update !== false;
  const requireNotes = scopeOptions.require_notes !== false;

  const query = `
    SELECT 
        s.id AS session_id,
        s.organization_id,
        s.client_id,
        COALESCE(s.therapist_id, s.scientist_id) AS practitioner_id,
        s.service_type,
        s.status,
        s.scheduled_start,
        s.scheduled_end,
        s.session_notes,
        psd.id AS psd_id,
        psd.clinical_notes,
        psd.treatment_type,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.uhid AS client_uhid,
        c.sport AS client_sport,
        p.first_name AS practitioner_first_name,
        p.last_name AS practitioner_last_name,
        p.ams_role AS practitioner_role,
        p.profession AS practitioner_profession,
        u.email AS practitioner_email,
        u.role AS user_role
    FROM "sessions" s
    JOIN profiles p ON p.id = COALESCE(s.therapist_id, s.scientist_id)
    JOIN users u ON u.id = p.id
    LEFT JOIN clients c ON c.id = s.client_id
    LEFT JOIN physiosessiondetails psd ON psd.session_id = s.id
    WHERE s.organization_id = $1
      AND (s.scheduled_start AT TIME ZONE 'Asia/Kolkata')::date = $2::date
      AND (
          -- Condition A: Unfinalized status
          ($3::boolean IS TRUE AND s.status NOT IN ('Completed', 'Cancelled', 'No Show'))
          OR
          -- Condition B: Completed but notes are missing/empty
          ($4::boolean IS TRUE AND s.status = 'Completed' AND (
              (psd.id IS NULL OR psd.clinical_notes IS NULL OR TRIM(psd.clinical_notes) = '')
              AND
              (s.session_notes IS NULL OR TRIM(s.session_notes) = '')
          ))
      )
    ORDER BY s.scheduled_start ASC;
  `;

  const result = await db.query(query, [
    orgId,
    targetDate,
    requireStatusUpdate,
    requireNotes,
  ]);

  // Group strictly by practitioner_id
  const practitionerMap = new Map();

  for (const row of result.rows) {
    const pId = row.practitioner_id;
    if (!pId) continue;

    if (!practitionerMap.has(pId)) {
      practitionerMap.set(pId, {
        practitioner_id: pId,
        first_name: row.practitioner_first_name || 'Specialist',
        last_name: row.practitioner_last_name || '',
        name: `${row.practitioner_first_name || ''} ${row.practitioner_last_name || ''}`.trim() || 'Practitioner',
        email: row.practitioner_email,
        role: row.practitioner_role || row.practitioner_profession || row.user_role || 'Specialist',
        profession: row.practitioner_profession || '',
        user_role: row.user_role || '',
        ams_role: row.practitioner_role || '',
        pending_sessions: [],
      });
    }

    const isStatusPending = !['Completed', 'Cancelled', 'No Show'].includes(row.status);
    const isNotesMissing =
      row.status === 'Completed' &&
      (!row.clinical_notes || !row.clinical_notes.trim()) &&
      (!row.session_notes || !row.session_notes.trim());

    let actionNeeded = 'Status Update';
    let actionDescription = `Status is currently "${row.status}"`;
    if (row.status === 'Completed' && isNotesMissing) {
      actionNeeded = 'Clinical Notes';
      actionDescription = 'Missing SOAP / Clinical documentation';
    } else if (isStatusPending && isNotesMissing) {
      actionNeeded = 'Status & Notes';
      actionDescription = `Status is "${row.status}" & documentation missing`;
    }

    const clientName = `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim() || 'Athlete';

    // DIRECT LINK: Each practitioner receives links only to their own calendar / session
    const pRecord = practitionerMap.get(pId);
    const calendarUrl = getPractitionerCalendarUrl(pRecord);
    const sessionLink = `${calendarUrl}?session_id=${row.session_id}&date=${targetDate}`;

    practitionerMap.get(pId).pending_sessions.push({
      session_id: row.session_id,
      client_name: clientName,
      client_uhid: row.client_uhid || '',
      client_sport: row.client_sport || '',
      service_type: row.service_type || 'Consultation / Therapy',
      status: row.status,
      start_time: formatTimeIST(row.scheduled_start),
      end_time: formatTimeIST(row.scheduled_end),
      action_needed: actionNeeded,
      action_description: actionDescription,
      session_link: sessionLink,
    });
  }

  return Array.from(practitionerMap.values());
}

/**
 * Determine the dedicated calendar / schedule route for a practitioner based on their role and profession.
 * - Sports Physician, Physiotherapist, Consultant, Doctor -> /consultant/schedule
 * - Nutritionist -> /nutritionist/schedule
 * - Sports Scientist, Coach, AMS -> /sports-scientist/schedule
 * - Admin, FOE, Manager -> /admin/calendar
 */
export function getPractitionerCalendarUrl(practitioner) {
  const roleStr = [
    practitioner?.role,
    practitioner?.user_role,
    practitioner?.profession,
    practitioner?.practitioner_profession,
    practitioner?.ams_role,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Sports Physician, Physiotherapist, Consultant, Doctor, Massage Therapist
  if (
    roleStr.includes('physician') ||
    roleStr.includes('physio') ||
    roleStr.includes('consultant') ||
    roleStr.includes('massage') ||
    roleStr.includes('doctor') ||
    roleStr.includes('clinical')
  ) {
    return '/consultant/schedule';
  }

  // Nutritionist
  if (roleStr.includes('nutrition')) {
    return '/nutritionist/schedule';
  }

  // Sports Scientist / Coach / AMS
  if (roleStr.includes('scientist') || roleStr.includes('coach') || roleStr.includes('ams')) {
    return '/sports-scientist/schedule';
  }

  // Admin / Front Office
  if (roleStr.includes('admin') || roleStr.includes('manager') || roleStr.includes('foe')) {
    return '/admin/calendar';
  }

  return '/consultant/schedule';
}

/**
 * Generate responsive HTML email for a practitioner's pending sessions
 */
export function generateReconciliationEmailHtml({ practitioner, orgName, appUrl, targetDateFormatted }) {
  const count = practitioner.pending_sessions.length;
  const calendarUrl = getPractitionerCalendarUrl(practitioner);
  const consoleUrl = `${appUrl || 'http://localhost:3001'}${calendarUrl}`;

  const sessionRowsHtml = practitioner.pending_sessions
    .map((s, idx) => {
      const isStatusIssue = s.action_needed.includes('Status');
      const badgeBg = isStatusIssue ? '#FEF3C7' : '#E0E7FF';
      const badgeColor = isStatusIssue ? '#B45309' : '#3730A3';
      const sessionUrl = `${appUrl || 'http://localhost:3001'}${s.session_link}`;

      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 14px 12px; font-size: 13px; color: #1E293B; font-weight: 600;">
            ${s.start_time} - ${s.end_time}
          </td>
          <td style="padding: 14px 12px; font-size: 13px; color: #1E293B;">
            <div style="font-weight: 700;">${s.client_name}</div>
            <div style="font-size: 11px; color: #64748B;">${s.client_uhid ? `UHID: ${s.client_uhid}` : ''} ${s.client_sport ? `• ${s.client_sport}` : ''}</div>
          </td>
          <td style="padding: 14px 12px; font-size: 13px; color: #475569;">
            ${s.service_type}
          </td>
          <td style="padding: 14px 12px; font-size: 12px;">
            <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
              ${s.action_needed}
            </span>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">${s.action_description}</div>
          </td>
          <td style="padding: 14px 12px; text-align: right;">
            <a href="${sessionUrl}" style="display: inline-block; background: #0D9488; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
              Update →
            </a>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Session Reconciliation Reminder</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Brand Header -->
        <div style="background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%); padding: 28px 32px; color: #ffffff;">
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #99F6E4; margin-bottom: 6px;">
            ${orgName || 'ISHPO Sports Health Hub'} • Daily Shift Close
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
            Daily Session Reconciliation Reminder
          </h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #CCFBF1; opacity: 0.9;">
            ${targetDateFormatted || 'Today\'s Schedule'}
          </p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #1E293B; margin-top: 0; line-height: 1.5;">
            Hi <strong>${practitioner.name}</strong>,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            As your shift wraps up, our records show you have <strong>${count} session(s)</strong> from today that require status reconciliation or missing clinical/SOAP documentation.
          </p>

          <!-- Sessions Table -->
          <div style="margin: 24px 0; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; font-weight: 700;">Time</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; font-weight: 700;">Client</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; font-weight: 700;">Service</th>
                  <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; font-weight: 700;">Pending Item</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; font-weight: 700;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${sessionRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Main CTA -->
          <div style="text-align: center; margin: 32px 0 16px 0;">
            <a href="${consoleUrl}" style="display: inline-block; background: #0D9488; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);">
              Open Clinician Console & Finalize Sessions
            </a>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 8px;">
              Direct access to update attendance and save clinical documentation.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 11px; color: #94A3B8; text-align: center; line-height: 1.5;">
          This is an automated system reminder configured by your clinic administrator in <strong>Notification Settings</strong>.<br/>
          If you have already finalized these records, please ignore this notice.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatch email reminder to a single practitioner.
 * Uses the SAME OCI Email Delivery transporter (SMTP_HOST/SMTP_USER/SMTP_PASS)
 * as the password reset flow in auth.js.
 */
async function sendPractitionerEmail({ practitioner, orgName, appUrl, targetDateFormatted }) {
  if (!practitioner.email) {
    console.warn(`[SessionReminder] Practitioner ${practitioner.practitioner_id} has no email address`);
    return { success: false, reason: 'No email' };
  }

  const subject = `Action Required: Daily Session Reconciliation - ${targetDateFormatted}`;
  const html = generateReconciliationEmailHtml({ practitioner, orgName, appUrl, targetDateFormatted });

  if (isDevSmtp()) {
    console.log(`[SessionReminder DEV] SMTP not configured — simulating email to ${practitioner.email}`);
    console.log(`[SessionReminder DEV] Subject: ${subject}`);
    console.log(`[SessionReminder DEV] Sessions pending: ${practitioner.pending_sessions.length}`);
    return { success: true, simulated: true };
  }

  try {
    console.log(`[SessionReminder] Sending email via OCI Email Delivery to ${practitioner.email} (${practitioner.name})`);
    const res = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ishpo.com',
      to: practitioner.email,
      subject,
      html,
    });
    console.log(`[SessionReminder] ✓ Email sent to ${practitioner.email} — messageId: ${res.messageId}`);
    return { success: true, messageId: res.messageId };
  } catch (err) {
    console.error(`[SessionReminder] ✗ Failed to send email to ${practitioner.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch TeamComms HubBot alert to a single practitioner as a private 1-on-1 Direct Message.
 * This guarantees complete privacy: only this practitioner can see their pending sessions and counts.
 */
async function sendPractitionerTeamComms({ orgId, practitioner, io, appUrl, targetDateFormatted }) {
  try {
    const botId = await getOrCreateHubBot(orgId);
    // Private 1-on-1 DM thread between HubBot and this practitioner ONLY
    const dmThreadId = await getOrCreateBotDMThread(orgId, botId, practitioner.practitioner_id);

    const count = practitioner.pending_sessions.length;
    const sessionListMarkdown = practitioner.pending_sessions
      .map(
        (s) =>
          `• **${s.start_time}** — *${s.client_name}* (${s.service_type}): ⚠️ ${s.action_needed === 'Status Update' ? `Status is "${s.status}"` : 'SOAP / Clinical notes missing'}`
      )
      .join('\n');

    const content =
      `📋 **Daily Session Reconciliation Reminder** • *${targetDateFormatted}*\n\n` +
      `Hi **${practitioner.name}**, you have **${count} session(s)** from today that need your attention before shift end:\n\n` +
      `${sessionListMarkdown}\n\n` +
      `👉 Please update session attendance and record clinical notes in your console.`;

    const calendarUrl = getPractitionerCalendarUrl(practitioner);
    const metadata = {
      module: 'clinical',
      action_label: 'Update Sessions',
      action_url: calendarUrl,
      mention_user_id: practitioner.practitioner_id,
      session_count: count,
      target_date: targetDateFormatted,
    };

    // 1. Insert chat_messages as a private Direct Message from HubBot (channel_id = NULL)
    const msgRes = await db.query(
      `INSERT INTO chat_messages
         (organization_id, channel_id, dm_thread_id, user_id, bot_id, message_type, content, metadata)
       VALUES ($1, NULL, $2, $3, $3, 'automated_session_reminder', $4, $5)
       RETURNING *`,
      [orgId, dmThreadId, botId, content, JSON.stringify(metadata)]
    );

    // 2. Update direct_message_threads timestamp for sidebar sorting
    await db.query(
      `UPDATE direct_message_threads SET last_message_at = NOW() WHERE id = $1`,
      [dmThreadId]
    );

    const fullMessage = {
      ...msgRes.rows[0],
      first_name: 'HubBot',
      last_name: '',
      bot_name: 'HubBot',
      bot_avatar: null,
      role: 'System Bot',
      is_automated: true,
      reactions: [],
      attachments: [],
    };

    // 3. Broadcast strictly to this DM thread and practitioner's socket room (never to public channels)
    if (io) {
      io.to(`dm:${dmThreadId}`).emit('new_dm_message', fullMessage);
      io.to(`user:${practitioner.practitioner_id}`).emit('new_dm_message', fullMessage);
      io.to(`user:${practitioner.practitioner_id}`).emit('new_message', fullMessage);
      io.to(`user:${practitioner.practitioner_id}`).emit('dm_notification', {
        dm_thread_id: dmThreadId,
        sender_id: botId,
        sender_name: 'HubBot',
        content: `Daily Session Reconciliation: ${count} pending session(s)`,
        created_at: new Date().toISOString(),
      });
      io.to(`user:${practitioner.practitioner_id}`).emit('personal_notification', {
        type: 'session_eod_reminder',
        title: 'Daily Session Reconciliation',
        content: `You have ${count} session(s) needing status updates or clinical notes.`,
        metadata,
        created_at: new Date().toISOString(),
      });
    }

    // 4. Trigger Web Push Notification to practitioner's devices
    sendPushToUser(practitioner.practitioner_id, {
      title: 'HubBot • Session Reconciliation Required',
      body: `You have ${count} session(s) needing status updates or notes.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: `/messenger?dm=${dmThreadId}`,
        type: 'session_reminder',
        dm_thread_id: dmThreadId,
      },
      tag: `session-remind-${practitioner.practitioner_id}-${Date.now()}`,
    }).catch((pushErr) => console.error('[SessionReminder WebPush Error]:', pushErr));

    return { success: true, messageId: fullMessage.id, dmThreadId };
  } catch (err) {
    console.error(`[SessionReminder] Failed to send TeamComms reminder to ${practitioner.practitioner_id}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Execute full daily reconciliation sweep for an organization
 * @param {string} orgId
 * @param {object} io - Socket.io instance
 * @param {object} options - { targetDate, isTestRun }
 */
export async function runReconciliationSweep(orgId, io, options = {}) {
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0];
  const isTestRun = options.isTestRun === true;

  // 1. Fetch organization notification settings
  const settingsRes = await db.query(
    `SELECT * FROM organization_notification_settings WHERE organization_id = $1`,
    [orgId]
  );
  const settings = settingsRes.rows[0] || {};

  // If globally disabled and not a forced test run, skip
  if (settings.enable_eod_session_reminder === false && !isTestRun) {
    return {
      skipped: true,
      reason: 'Daily session reconciliation reminders are disabled in Notification Settings',
    };
  }

  // Parse channel options
  let channels = { email: true, teamcomms: true };
  if (settings.eod_reminder_channels) {
    channels = typeof settings.eod_reminder_channels === 'string'
      ? JSON.parse(settings.eod_reminder_channels)
      : settings.eod_reminder_channels;
  }

  // Parse scope options
  let scope = { require_status_update: true, require_notes: true };
  if (settings.eod_reminder_scope) {
    scope = typeof settings.eod_reminder_scope === 'string'
      ? JSON.parse(settings.eod_reminder_scope)
      : settings.eod_reminder_scope;
  }

  // 2. Fetch org details
  const orgRes = await db.query(`SELECT id, name FROM organizations WHERE id = $1`, [orgId]);
  const orgName = orgRes.rows[0]?.name || 'Sports Health Clinic';

  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  const targetDateFormatted = formatDateIST(targetDate);

  // 3. Find pending sessions grouped strictly by practitioner
  const practitionersWithPending = await getPendingSessionsForOrg(orgId, targetDate, scope);

  let emailsDispatched = 0;
  let teamcommsDispatched = 0;
  const dispatchResults = [];

  for (const practitioner of practitionersWithPending) {
    const pResult = {
      practitioner_id: practitioner.practitioner_id,
      name: practitioner.name,
      email: practitioner.email,
      pending_count: practitioner.pending_sessions.length,
      email_status: 'skipped',
      teamcomms_status: 'skipped',
    };

    // Deliver Email (Strictly containing this practitioner's sessions)
    if (channels.email) {
      const emailRes = await sendPractitionerEmail({
        practitioner,
        orgName,
        appUrl,
        targetDateFormatted,
      });
      pResult.email_status = emailRes.success ? (emailRes.simulated ? 'simulated' : 'sent') : 'failed';
      if (emailRes.success) emailsDispatched++;
    }

    // Deliver TeamComms (Strictly containing this practitioner's sessions)
    if (channels.teamcomms) {
      const tcRes = await sendPractitionerTeamComms({
        orgId,
        practitioner,
        io,
        appUrl,
        targetDateFormatted,
      });
      pResult.teamcomms_status = tcRes.success ? 'sent' : 'failed';
      if (tcRes.success) teamcommsDispatched++;
    }

    dispatchResults.push(pResult);
  }

  // 4. Update last_run_at timestamp on organization_notification_settings
  if (!isTestRun) {
    await db.query(
      `UPDATE organization_notification_settings SET eod_last_run_at = NOW() WHERE organization_id = $1`,
      [orgId]
    );
  }

  return {
    success: true,
    organization_id: orgId,
    organization_name: orgName,
    target_date: targetDate,
    target_date_formatted: targetDateFormatted,
    is_test_run: isTestRun,
    total_practitioners_with_pending: practitionersWithPending.length,
    total_pending_sessions: practitionersWithPending.reduce((sum, p) => sum + p.pending_sessions.length, 0),
    channels_configured: channels,
    dispatched_counts: {
      email: emailsDispatched,
      teamcomms: teamcommsDispatched,
    },
    practitioners: dispatchResults,
  };
}
