const https = require('https');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.78A6t7i9ySqe5fR3EyHnrWq_MK-b0w70MpouMXdHkzM';

function listRpcs() {
    console.log('Listing available RPCs via /rest/v1/...');
    
    https.get(`${supabaseUrl}/rest/v1/?apikey=${supabaseAnonKey}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                const rpcs = Object.keys(json.paths)
                    .filter(path => path.startsWith('/rpc/'))
                    .map(path => path.replace('/rpc/', ''));
                
                console.log('Available RPCs:');
                console.log(rpcs.join(', '));
            } catch (err) {
                console.error('Error parsing response:', err.message);
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching definitions:', err.message);
    });
}

listRpcs();
