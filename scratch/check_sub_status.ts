import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function checkSubStatus() {
    const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('status')
        .limit(1)
    
    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Current status values found in DB:', subs)
}

checkSubStatus()
