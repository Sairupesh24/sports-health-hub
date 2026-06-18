import { db } from './db.js';

async function test() {
    try {
        console.log("Pool options:", db.options);
        const res = await db.query("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()");
        console.log("DB info:", res.rows[0]);

        const sessions = await db.query("SELECT COUNT(*) FROM sessions");
        console.log("Sessions count:", sessions.rows[0].count);

        const profiles = await db.query("SELECT id, first_name, last_name FROM profiles");
        console.log("Profiles in running DB:", profiles.rows);
    } catch (e) {
        console.error(e);
    }
}

test();
