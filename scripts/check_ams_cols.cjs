const https = require('https');

const options = {
  hostname: 'ovntmshmshunpztobqov.supabase.co',
  path: '/rest/v1/external_training_summary?limit=1',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        if (json.length > 0) {
            console.log('Columns:', Object.keys(json[0]));
            console.log('Sample Record:', json[0]);
        } else {
            console.log('No data found in external_training_summary');
        }
    } catch (e) {
        console.log('Could not parse JSON. Raw data:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
