-- Fix infinite recursion caused by get_my_org_id doing a SELECT on profiles while RLS on profiles evaluates get_my_org_id
CREATE OR REPLACE FUNCTION public.get_my_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$function$;
