import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function debugStats() {
    const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select('*, packages(name, price)')
    
    if (subError) {
        console.error('Error fetching subs:', subError)
        return
    }

    console.log(`Subscriptions found: ${subs.length}`)
    subs.forEach(s => {
        console.log(JSON.stringify(s, null, 2))
    })
}

debugStats()
