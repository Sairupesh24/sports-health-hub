-- Migration: 20270409000001_add_geofencing_settings.sql

-- Add geofencing settings to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS clinic_latitude NUMERIC;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS clinic_longitude NUMERIC;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 100; -- Default 100 meters
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS enable_geofencing BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.geofence_radius IS 'Radius in meters for geofenced attendance verification.';
COMMENT ON COLUMN public.organizations.enable_geofencing IS 'Toggle to enable/disable geofenced check-ins for the organization.';
