const https = require('https');

const supabaseUrl = 'https://aobtwbhqtlyvfczovdvj.supabase.co';
// I don't have the anon key for this one, but maybe it's the same? (Unlikely)
// Or maybe I can just try to fetch the definitions without a key? (Some allow)

function checkProject() {
    console.log(`Checking project aobtwbhqtlyvfczovdvj...`);
    
    https.get(`${supabaseUrl}/rest/v1/`, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('Definitions found:', !!json.definitions);
            } catch (err) {
                console.log('Parse error or Unauthorized');
            }
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

checkProject();
