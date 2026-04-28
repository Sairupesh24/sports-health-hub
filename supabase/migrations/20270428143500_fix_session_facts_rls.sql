-- Add INSERT policy for session_facts to allow the 'after_session_complete' trigger to work for Scientists and Admins
CREATE POLICY "Scientists and Admins can insert session facts" ON public.session_facts 
FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sports_scientist'))
);

-- Also add UPDATE policy just in case
CREATE POLICY "Scientists and Admins can update session facts" ON public.session_facts 
FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sports_scientist'))
);
