const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUyN2Y3YTYxLTIyNWQtNDcxNy04YjI1LTQ3NDFkMTk1ODAzYyIsImVtYWlsIjoiYWJoaTc5MTExQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlzX2FwcHJvdmVkIjp0cnVlLCJvcmdhbml6YXRpb25faWQiOiJkYjIwNGFhYi00YjhiLTRkZDItYTg0Mi1iYzlmNjcwMDI2OTMiLCJpYXQiOjE3OTAyNTE3OTUsImV4cCI6MTc5MDI1NTM5NX0.a0zFhXn7LCMPjnpTgQSA9d2Ii0Ckkr3AUkD78VY_KA0';
const body = JSON.stringify({ isTestRun: false });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/settings/notifications/trigger-eod-reminder',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(body);
req.end();
