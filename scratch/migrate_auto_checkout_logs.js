import { db } from '../server/db.js';

async function migrate() {
  try {
    const res = await db.query(`
      UPDATE hrattendancelogs
      SET created_at = (date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata') + TIME '18:00:00') AT TIME ZONE 'Asia/Kolkata',
          metadata = jsonb_set(
            jsonb_set(
              metadata,
              '{default_checkout_time}',
              '"18:00"'
            ),
            '{remark}',
            '"Auto clock-out applied. Staff did not manually check out. Default shift end time (18:00) was enforced."'
          ),
          remark = 'Auto clock-out applied. Staff did not manually check out. Default shift end time (18:00) was enforced.'
      WHERE (type = 'check_out' OR type = 'missed_check_out')
        AND metadata->>'auto_checkout' = 'true'
    `);
    console.log('Successfully updated historical auto-checkout logs. Count:', res.rowCount);

    const logs = await db.query(`
      SELECT id, type, created_at, metadata
      FROM hrattendancelogs
      WHERE metadata->>'auto_checkout' = 'true'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('Updated logs:', JSON.stringify(logs.rows, null, 2));
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
