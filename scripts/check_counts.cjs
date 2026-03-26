const https = require('https');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.78A6t7i9ySqe5fR3EyHnrWq_MK-b0w70MpouMXdHkzM';

function checkCounts() {
    console.log('Checking counts for organizations and profiles...');
    
    https.get(`${supabaseUrl}/rest/v1/organizations?select=count&apikey=${supabaseAnonKey}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Organizations: ${json[0].count}`);
            } catch (err) { console.error('Org Check Failed'); }
        });
    });

    https.get(`${supabaseUrl}/rest/v1/profiles?select=count&apikey=${supabaseAnonKey}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Profiles: ${json[0].count}`);
            } catch (err) { console.error('Profile Check Failed'); }
        });
    });
}

checkCounts();
