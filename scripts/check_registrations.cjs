const https = require('https');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.78A6t7i9ySqe5fR3EyHnrWq_MK-b0w70MpouMXdHkzM';

function checkRegistrations() {
    console.log('Checking for entries in registrations...');
    
    https.get(`${supabaseUrl}/rest/v1/registrations?select=id,user_id,email&apikey=${supabaseAnonKey}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Total Registrations: ${json.length}`);
                if (json.length > 0) {
                    console.log('Registration Data:', JSON.stringify(json.slice(0, 3), null, 2));
                }
            } catch (err) { console.error('Registration Check Failed'); }
        });
    });
}

checkRegistrations();
