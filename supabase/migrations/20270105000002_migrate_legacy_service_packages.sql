-- Migration to copy data from legacy `service_packages` to the active `packages` table

-- 1. Insert distinct service types into public.services
INSERT INTO public.services (organization_id, name, category, default_session_duration, is_active)
SELECT DISTINCT sp.organization_id, spi.service_type, 'General', 60, true
FROM public.service_package_items spi
JOIN public.service_packages sp ON sp.id = spi.package_id;
-- Note: 'name' is NOT uniquely constrained in services (unless we manually added it), 
-- but this is safe for a one-time migration. If there are duplicates, it's fine.

-- 2. Insert packages
INSERT INTO public.packages (id, organization_id, name, description, price, validity_days, is_active)
SELECT id, organization_id, name, description, price, 365, true
FROM public.service_packages
ON CONFLICT (id) DO NOTHING;

-- 3. Insert package_services relations
INSERT INTO public.package_services (package_id, service_id, sessions_included)
SELECT spi.package_id, s.id, spi.default_sessions
FROM public.service_package_items spi
JOIN public.service_packages sp ON sp.id = spi.package_id
JOIN public.services s ON s.name = spi.service_type AND s.organization_id = sp.organization_id
ON CONFLICT (package_id, service_id) DO NOTHING;
