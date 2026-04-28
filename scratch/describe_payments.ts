import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function describePayments() {
    const { data: payments, error } = await supabase
        .from('bill_payments')
        .select('*')
        .limit(1)
    
    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Columns:', Object.keys(payments[0]))
}

describePayments()
