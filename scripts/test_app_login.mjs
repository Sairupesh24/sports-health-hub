import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf-8');
const envMatchesUrl = envText.match(/VITE_SUPABASE_URL=[\"']?([^\"'\n\r]+)[\"']?/);
const envMatchesAnon = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY=[\"']?([^\"'\n\r]+)[\"']?/);

const url = envMatchesUrl ? envMatchesUrl[1] : '';
const anonKey = envMatchesAnon ? envMatchesAnon[1] : '';

console.log("Testing Login using .env connection settings:");
console.log("URL:", url);
console.log("Anon Key prefix:", anonKey.substring(0, 15) + "...");

const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testLogin(email, password) {
    console.log(`\nAttempting login for ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        console.error("FAIL:", error.message);
        if (error.message.includes("Invalid login credentials")) {
            console.log("-> This could be due to a wrong password OR an invalid Anon Key for this project!");
        }
    } else {
        console.log("SUCCESS! Logged in as:", data.user.id);
    }
}

async function runTests() {
    await testLogin('new_master@ishpo.com', 'password123'); // The one I created
    await testLogin('admin3445@ishpo.com', 'password123');  // The existing one
}

runTests();
