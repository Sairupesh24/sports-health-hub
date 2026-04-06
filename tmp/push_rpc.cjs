const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const sql = fs.readFileSync('supabase/migrations/20270402160500_therapist_availability_rpc.sql', 'utf8');

// Use the /rest/v1/rpc/  OR the management API
// Let's use https fetch via node native
const body = JSON.stringify({ query: sql });

const options = {
    hostname: 'fbjlgepxbyoyradaacvd.supabase.co',
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
};

// Instead, use supabase management API pg endpoint
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
}).then(r => r.text()).then(t => console.log('Response:', t)).catch(e => console.error('Error:', e));
