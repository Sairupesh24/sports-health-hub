-- Migration: 20270409000003_update_org_rpc.sql

-- Update get_platform_organizations to include geofencing fields
DROP FUNCTION IF EXISTS public.get_platform_organizations();
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
  client_count BIGINT,
  clinic_latitude NUMERIC,
  clinic_longitude NUMERIC,
  geofence_radius INTEGER,
  enable_geofencing BOOLEAN
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
    COALESCE(c.client_count, 0) AS client_count,
    o.clinic_latitude,
    o.clinic_longitude,
    o.geofence_radius,
    o.enable_geofencing
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

-- Add a generic update function for super admin to update org settings
CREATE OR REPLACE FUNCTION public.update_organization_settings(
    p_org_id UUID,
    p_clinic_latitude NUMERIC,
    p_clinic_longitude NUMERIC,
    p_geofence_radius INTEGER,
    p_enable_geofencing BOOLEAN
)
RETURNS VOID
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

  UPDATE public.organizations
  SET 
    clinic_latitude = p_clinic_latitude,
    clinic_longitude = p_clinic_longitude,
    geofence_radius = p_geofence_radius,
    enable_geofencing = p_enable_geofencing,
    updated_at = now()
  WHERE id = p_org_id;
END;
$$;
