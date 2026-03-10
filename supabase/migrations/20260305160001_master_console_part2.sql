-- Master Console Schema Migration Part 2: Policies and RPCs
-- 3. Update existing RLS policies to allow super_admin access
-- For organizations table (super_admins can do anything)
CREATE POLICY "Super Admins have full access to organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- For locations table
CREATE POLICY "Super Admins have full access to locations" ON public.locations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- For profiles table
CREATE POLICY "Super Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- For user_roles table
CREATE POLICY "Super Admins can view all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Update tenant tables RLS to prevent access when org status is not active
-- (We'll only add this check to login/access for now, as checking it on every row can be expensive.
-- Alternatively, we can use an auth hook or a view, but for now we'll allow access if the org is active.)

-- To make things secure but efficient, it's better to enforce org status at the application layer or via an RPC check on login/action.
-- We will proceed with RPC functions for the Master Console.

-- 5. RPC Functions for Super Admin Dashboard

-- get_platform_metrics()
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_metrics JSONB;
  v_total_orgs INT;
  v_active_orgs INT;
  v_disabled_orgs INT;
  v_total_locations INT;
  v_total_consultants INT;
BEGIN
  -- Check if user is super admin
  v_is_super_admin := public.has_role(auth.uid(), 'super_admin');
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  SELECT COUNT(*) INTO v_total_orgs FROM public.organizations;
  SELECT COUNT(*) INTO v_active_orgs FROM public.organizations WHERE status = 'active';
  SELECT COUNT(*) INTO v_disabled_orgs FROM public.organizations WHERE status IN ('disabled', 'suspended');
  SELECT COUNT(*) INTO v_total_locations FROM public.locations;
  SELECT COUNT(*) INTO v_total_consultants FROM public.user_roles WHERE role = 'consultant';

  v_metrics := jsonb_build_object(
    'total_organizations', v_total_orgs,
    'active_organizations', v_active_orgs,
    'disabled_organizations', v_disabled_orgs,
    'total_locations', v_total_locations,
    'total_consultants', v_total_consultants
  );

  RETURN v_metrics;
END;
$$;

-- get_platform_organizations()
CREATE OR REPLACE FUNCTION public.get_platform_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_code VARCHAR,
  slug TEXT,
  subscription_plan TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  location_count BIGINT,
  consultant_count BIGINT,
  client_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super admin
  v_is_super_admin := public.has_role(auth.uid(), 'super_admin');
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.org_code,
    o.slug,
    o.subscription_plan,
    o.status,
    o.created_at,
    COALESCE(l.location_count, 0) AS location_count,
    COALESCE(u.consultant_count, 0) AS consultant_count,
    COALESCE(c.client_count, 0) AS client_count
  FROM public.organizations o
  LEFT JOIN (
    SELECT organization_id, COUNT(*) AS location_count
    FROM public.locations
    GROUP BY organization_id
  ) l ON o.id = l.organization_id
  LEFT JOIN (
    SELECT p.organization_id, COUNT(*) AS consultant_count
    FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE ur.role = 'consultant'
    GROUP BY p.organization_id
  ) u ON o.id = u.organization_id
  LEFT JOIN (
    SELECT organization_id, COUNT(*) AS client_count
    FROM public.clients
    GROUP BY organization_id
  ) c ON o.id = c.organization_id
  ORDER BY o.created_at DESC;
END;
$$;

-- update_organization_status(p_org_id, p_status)
CREATE OR REPLACE FUNCTION public.update_organization_status(p_org_id UUID, p_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super admin
  v_is_super_admin := public.has_role(auth.uid(), 'super_admin');
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  IF p_status NOT IN ('active', 'disabled', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status. Must be active, disabled, or suspended.';
  END IF;

  UPDATE public.organizations
  SET status = p_status, updated_at = now()
  WHERE id = p_org_id;
END;
$$;

-- Function to check if org is active during login/access
CREATE OR REPLACE FUNCTION public.is_org_active(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = p_org_id AND status = 'active'
  )
$$;
