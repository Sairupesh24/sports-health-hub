const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
        envVars[key] = val;
    }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_PUBLISHABLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    // Authenticate first to act like the frontend
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'saikavuturi24@gmail.com',
        password: 'Svrforever24@'
    });
    
    if (authErr) {
        console.error('Sign in failed:', authErr);
        return;
    }
    
    console.log('Logged in as:', authData.user.id);
    
    // Now fetch profile
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();
      
    if (error) {
        console.error('Profile fetch error:', error);
    } else {
        console.log('Profile data:', data);
    }
}

testFetch();
