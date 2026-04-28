import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function checkSubHistory() {
    const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
    
    if (error) {
        console.error('Error fetching bills:', error)
        return
    }

    const linkedBills = bills.filter(b => b.subscription_id !== null)
    console.log(`Found ${linkedBills.length} bills with subscription_id out of ${bills.length} total bills`)
    linkedBills.forEach(b => {
        console.log(`Bill ID: ${b.id}, Sub ID: ${b.subscription_id}, Date: ${b.date}, Total: ${b.total}`)
    })

    const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select('*, client:clients(first_name, last_name)')
    
    if (subError) {
        console.error('Error fetching subs:', subError)
        return
    }

    console.log(`Found ${subs.length} subscriptions`)
    subs.forEach(s => {
        console.log(`Sub: ${s.client?.first_name} ${s.client?.last_name}, ID: ${s.id}, Next Billing: ${s.next_billing_date}`)
    })
}

checkSubHistory()
