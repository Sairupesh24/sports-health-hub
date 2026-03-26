const https = require('https');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

function checkPerformanceData() {
    console.log('Verifying performance_assessments data (SERVICE_ROLE)...');
    
    const options = {
        headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
        }
    };

    https.get(`${supabaseUrl}/rest/v1/performance_assessments?select=count`, options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`Total Assessment Records: ${json[0].count}`);
            } catch (err) {
                console.error('Error parsing response:', err.message);
                console.log('Response data:', data);
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching data:', err.message);
    });
}

checkPerformanceData();
