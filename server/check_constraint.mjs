import { db } from './db.js';
const r = await db.query("SELECT conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c WHERE conname = 'sessions_status_check'");
console.log('CONSTRAINT:', JSON.stringify(r.rows, null, 2));
const r2 = await db.query("SELECT id, status, scheduled_start, updated_at FROM sessions ORDER BY updated_at DESC LIMIT 5");
console.log('RECENT SESSIONS:', JSON.stringify(r2.rows, null, 2));
process.exit(0);
