import { supabase } from "../src/integrations/supabase/client";

async function test() {
    const { data, error } = await supabase.from('organizations').select('*');
    if (data) {
        data[0].name; // Should not be an error
    }
}
