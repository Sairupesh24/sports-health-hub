import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function testRPC() {
    const orgId = "95d6393e-68ab-4839-9b35-a11562cfc150"
    const { data, error } = await supabase.rpc('fn_get_admin_billing_stats', {
        p_org_id: orgId
    })
    
    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('RPC Results:', JSON.stringify(data, null, 2))
}

testRPC()
