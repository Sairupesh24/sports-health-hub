import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your_super_secret_jwt_string_change_in_production';
const token = jwt.sign(
  { 
    id: 'fd35fa21-0837-4d8a-a722-90595356aaec', 
    email: 'saikavuturi24@gmail.com', 
    role: 'admin', 
    is_approved: true, 
    organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925' 
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

async function run() {
    try {
        console.log("Token:", token);

        // Fetch employees
        const empRes = await fetch('http://localhost:3000/api/hr/employees?role_type=clinical', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const employees = await empRes.json();
        console.log("\nEMPLOYEES FROM API:");
        console.log(JSON.stringify(employees, null, 2));

        // Fetch appointments in day range
        // startOfDay(currentDate) in UTC is 2026-05-26T18:30:00.000Z
        // endOfDay(currentDate) in UTC is 2026-05-27T18:29:59.999Z
        const start = '2026-06-04T18:30:00.000Z';
        const end = '2026-06-05T18:29:59.999Z';
        const appRes = await fetch(`http://localhost:3000/api/appointments?start=${start}&end=${end}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const appointments = await appRes.json();
        console.log("\nAPPOINTMENTS FROM API:");
        console.log(JSON.stringify(appointments, null, 2));

    } catch (e) {
        console.error(e);
    }
}

run();
