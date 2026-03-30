const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const repair = async () => {
    const tables = [
        {
            name: 'saqc_items',
            sql: `CREATE TABLE IF NOT EXISTS public.saqc_items (
                id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
                org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                exercise_id UUID NOT NULL REFERENCES public.exercises(id),
                sets INTEGER DEFAULT 1,
                primary_input_type TEXT,
                additional_info TEXT
            );`
        },
        {
            name: 'circuit_items',
            sql: `CREATE TABLE IF NOT EXISTS public.circuit_items (
                id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
                org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                circuit_name TEXT,
                rounds INTEGER DEFAULT 1,
                description TEXT
            );`
        },
        {
            name: 'sport_science_items',
            sql: `CREATE TABLE IF NOT EXISTS public.sport_science_items (
                id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
                org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                questionnaire_id UUID REFERENCES public.questionnaires(id)
            );`
        },
        {
            name: 'warmup_items',
            sql: `CREATE TABLE IF NOT EXISTS public.warmup_items (
                id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
                org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                warmup_name TEXT,
                video_url TEXT
            );`
        },
        {
            name: 'note_items',
            sql: `CREATE TABLE IF NOT EXISTS public.note_items (
                id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
                org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                content TEXT
            );`
        }
    ];

    for (const t of tables) {
        console.log(`Repairing ${t.name}...`);
        const { error: e1 } = await supabase.rpc('exec_sql', { query: t.sql });
        if (e1) {
            console.error(`Error creating ${t.name}:`, e1.message);
            continue;
        }
        
        const rlsSql = `ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY;
                        DO $$ BEGIN
                          DROP POLICY IF EXISTS "Org access for ${t.name}" ON public.${t.name};
                        EXCEPTION WHEN OTHERS THEN NULL; END $$;
                        CREATE POLICY "Org access for ${t.name}" ON public.${t.name} FOR ALL USING (org_id = public.get_my_org_id());`;
        
        const { error: e2 } = await supabase.rpc('exec_sql', { query: rlsSql });
        if (e2) console.error(`Error applying RLS to ${t.name}:`, e2.message);
        else console.log(`${t.name} repaired successfully.`);
    }
};

repair();
