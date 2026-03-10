
-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;

-- Recreate using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Non-recursive policy: user can view own profile OR org members
CREATE POLICY "Users can view org profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR organization_id = public.get_my_org_id()
  );

-- Fix the admin update policy too (same recursion issue)
DROP POLICY IF EXISTS "Admins can update org profiles" ON public.profiles;
CREATE POLICY "Admins can update org profiles" ON public.profiles
  FOR UPDATE USING (
    organization_id = public.get_my_org_id()
    AND public.has_role(auth.uid(), 'admin')
  );

-- Fix user_roles view policy (also references profiles)
DROP POLICY IF EXISTS "Admins can view org roles" ON public.user_roles;
CREATE POLICY "Admins can view org roles" ON public.user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_roles.user_id
        AND profiles.organization_id = public.get_my_org_id()
    )
  );
