
-- Create trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow all authenticated users to view profiles in their org (needed for RLS subqueries)
-- Also let users see other profiles in their org for admin approval
CREATE POLICY "Users can view org profiles" ON public.profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
  );

-- Allow admins to update profiles in their org (for approval)
CREATE POLICY "Admins can update org profiles" ON public.profiles
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow admins to manage roles
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view org roles" ON public.user_roles
  FOR SELECT USING (
    user_id IN (
      SELECT p2.id FROM profiles p1 JOIN profiles p2 ON p1.organization_id = p2.organization_id WHERE p1.id = auth.uid()
    )
    OR user_id = auth.uid()
  );
