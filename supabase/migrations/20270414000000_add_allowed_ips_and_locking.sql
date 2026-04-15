-- Add IP locking capabilities to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS enable_ip_locking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_ips TEXT;

COMMENT ON COLUMN public.organizations.enable_ip_locking IS 'Toggle to enable/disable network IP restriction for check-ins.';
COMMENT ON COLUMN public.organizations.allowed_ips IS 'Comma-separated list of allowed IP addresses for check-in.';
