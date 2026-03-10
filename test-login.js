import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseKey = 'sb_publishable_JIxocgRVcXQFFH6msmQ26Q_Qz-ficgl'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
    const email = 'testsuperadmin@gmail.com'
    console.log('Attempting signup:', email)

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password: 'superadmin123',
        options: {
            data: {
                first_name: 'Master',
                last_name: 'Admin',
            }
        }
    })

    if (signupError) {
        console.error('Signup Error:', signupError)
        return;
    }
    console.log('Signup Success:', signupData.user?.id)
}

testAuth()
