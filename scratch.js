import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["consultant", "sports_physician", "physiotherapist", "nutritionist", "sports_scientist", "massage_therapist"])
      
  console.log("roleData:", roleData)
  console.log("roleError:", roleError)
}

testQuery()
