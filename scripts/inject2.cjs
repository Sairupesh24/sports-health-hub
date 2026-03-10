const fs = require('fs');

// Read env variables manually
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/['"]+/g, '');
    }
});

const URL = envVars['VITE_SUPABASE_URL'];
const KEY = envVars['VITE_SUPABASE_SERVICE_ROLE_KEY'];

const therapistId = "b1b8be45-31ba-44f3-be99-df4e40510edb"
const orgId = "84cbcd50-0a25-4c01-add2-45eac2bd0dce"
const clientId = "8aa008c2-3982-411a-bcc4-1fe4017a4c49"

const today = new Date();
const start1 = new Date(today); start1.setHours(today.getHours() + 1);
const end1 = new Date(today); end1.setHours(today.getHours() + 2);
const start2 = new Date(today); start2.setHours(today.getHours() + 3);
const end2 = new Date(today); end2.setHours(today.getHours() + 4);

const payload = [
    {
        organization_id: orgId,
        therapist_id: therapistId,
        client_id: clientId,
        service_type: "Physiotherapy",
        status: "Planned",
        scheduled_start: start1.toISOString(),
        scheduled_end: end1.toISOString(),
        actual_start: start1.toISOString(),
        actual_end: end1.toISOString()
    },
    {
        organization_id: orgId,
        therapist_id: therapistId,
        client_id: clientId,
        service_type: "Performance Training",
        status: "Planned",
        scheduled_start: start2.toISOString(),
        scheduled_end: end2.toISOString(),
        actual_start: start2.toISOString(),
        actual_end: end2.toISOString()
    }
];

fetch(`${URL}/rest/v1/sessions`, {
    method: 'POST',
    headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
})
    .then(res => res.json())
    .then(data => {
        console.log("Successfully injected test sessions for today:");
        console.log(data.map(d => `${d.service_type} at ${d.scheduled_start}`));
    })
    .catch(err => console.error("Injection failed:", err));
