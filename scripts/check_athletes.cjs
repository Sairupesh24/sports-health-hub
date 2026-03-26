const https = require('https');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.78A6t7i9ySqe5fR3EyHnrWq_MK-b0w70MpouMXdHkzM';

function checkAthletes() {
    console.log('Checking for athletes in profiles...');
    
    https.get(`${supabaseUrl}/rest/v1/profiles?select=id,first_name,last_name,ams_role&apikey=${supabaseAnonKey}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Total Profiles: ${json.length}`);
                const athletes = json.filter(p => p.ams_role === 'athlete');
                console.log(`Athletes found: ${athletes.length}`);
                if (athletes.length > 0) {
                    console.log('Athlete IDs:', athletes.map(a => a.id).join(', '));
                } else {
                    console.log('First 3 profiles:', JSON.stringify(json.slice(0, 3), null, 2));
                }
            } catch (err) {
                console.error('Error parsing response:', err.message);
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching data:', err.message);
    });
}

checkAthletes();
