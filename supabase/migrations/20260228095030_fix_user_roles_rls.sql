-- Migration to add missing UPDATE and DELETE policies for the user_roles table
-- This allows administrators to change roles and revoke access.

-- Allow admins to update roles of users belonging to their organization
CREATE POLICY "Admins can update org roles" ON public.user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
        AND profiles.organization_id = public.get_my_org_id()
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to delete roles (revoke access) of users in their organization
CREATE POLICY "Admins can delete org roles" ON public.user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
        AND profiles.organization_id = public.get_my_org_id()
    )
    AND public.has_role(auth.uid(), 'admin')
  );
