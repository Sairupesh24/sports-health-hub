-- Migration: Fix RLS policies for session_types to allow sports_scientist to INSERT
-- The previous migration used FOR ALL with only USING clause, which doesn't cover INSERT (needs WITH CHECK)

-- Drop and recreate the manage policy with proper WITH CHECK
DROP POLICY IF EXISTS "Admins and Scientists can manage session types" ON public.session_types;

CREATE POLICY "Admins and Scientists can manage session types"
    ON public.session_types
    FOR ALL
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sports_scientist'))
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sports_scientist'))
    );

-- Also ensure SELECT policy exists for all org users
DROP POLICY IF EXISTS "Users can view org session types" ON public.session_types;

CREATE POLICY "Users can view org session types"
    ON public.session_types
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
