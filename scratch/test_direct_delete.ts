
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function performDelete(userId: string) {
    console.log(`Attempting to delete user: ${userId}`);
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
        console.error("Delete failed:", error.message);
    } else {
        console.log("Delete successful!");
    }
}

// Scientist Test ID from previous check
const targetId = 'fb2a359a-6914-4a48-907f-5a4475e3172f';
performDelete(targetId);
