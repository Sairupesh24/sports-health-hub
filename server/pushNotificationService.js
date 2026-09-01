import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VAPID_FILE = path.join(__dirname, '.vapid_keys.json');

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

// If VAPID keys are not set in environment, load from or save to .vapid_keys.json
try {
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    if (fs.existsSync(VAPID_FILE)) {
      const data = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
      vapidKeys = data;
    } else {
      const generated = webpush.generateVAPIDKeys();
      vapidKeys = {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
      };
      fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
      console.log('[WebPush] Generated new persistent VAPID keys in .vapid_keys.json');
    }
  }

  const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:support@ishpo.com';
  webpush.setVapidDetails(contactEmail, vapidKeys.publicKey, vapidKeys.privateKey);
  console.log('[WebPush] VAPID details configured successfully');
} catch (err) {
  console.error('[WebPush] Error setting up VAPID details:', err);
}

/** Get the public VAPID key to send to the browser */
export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

/**
 * Ensure table user_push_subscriptions exists
 */
export async function ensurePushSubscriptionsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, endpoint)
      );
      CREATE INDEX IF NOT EXISTS idx_push_subs_user ON user_push_subscriptions(user_id);
    `);
  } catch (err) {
    console.error('[WebPush] Failed to ensure user_push_subscriptions table:', err.message);
  }
}

/**
 * Save or update a user's push subscription
 */
export async function savePushSubscription(userId, subscription, userAgent = '') {
  if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Invalid subscription data');
  }

  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;

  if (!p256dh || !auth) {
    throw new Error('Missing subscription keys (p256dh or auth)');
  }

  await ensurePushSubscriptionsTable();

  const query = `
    INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET p256dh = $3, auth = $4, user_agent = $5, updated_at = NOW()
    RETURNING id
  `;

  const result = await db.query(query, [userId, endpoint, p256dh, auth, userAgent]);
  return result.rows[0];
}

/**
 * Remove a user's push subscription
 */
export async function removePushSubscription(userId, endpoint) {
  if (!userId || !endpoint) return;
  await db.query(
    `DELETE FROM user_push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
    [userId, endpoint]
  );
}

/**
 * Send push notification to a single user (to all their subscribed devices)
 */
export async function sendPushToUser(userId, payload) {
  if (!userId || !vapidKeys.publicKey || !vapidKeys.privateKey) return;

  try {
    const res = await db.query(
      `SELECT id, endpoint, p256dh, auth FROM user_push_subscriptions WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) return;

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const sendPromises = res.rows.map(async (row) => {
      const sub = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(sub, payloadString, {
          TTL: 86400, // 24 hours
          urgency: 'high',
        });
      } catch (err) {
        // If expired or gone (404, 410), delete subscription
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Removing expired subscription ${row.id} for user ${userId}`);
          await db.query(`DELETE FROM user_push_subscriptions WHERE id = $1`, [row.id]).catch(() => {});
        } else {
          console.error(`[WebPush] Failed sending push to subscription ${row.id}:`, err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error('[WebPush] Error querying subscriptions for user:', err);
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const promises = uniqueIds.map((uid) => sendPushToUser(uid, payload));
  await Promise.allSettled(promises);
}

/**
 * Send push notification to all members of a channel (excluding sender)
 */
export async function sendPushToChannelMembers(channelId, senderId, payload) {
  if (!channelId) return;
  try {
    const res = await db.query(
      `SELECT user_id FROM channel_members WHERE channel_id = $1 AND (muted IS NULL OR muted = FALSE) AND user_id != $2`,
      [channelId, senderId || '00000000-0000-0000-0000-000000000000']
    );

    const memberIds = res.rows.map((r) => r.user_id);
    if (memberIds.length > 0) {
      await sendPushToUsers(memberIds, payload);
    }
  } catch (err) {
    console.error('[WebPush] Error sending channel push notifications:', err);
  }
}
