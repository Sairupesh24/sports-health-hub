-- Migration: Standardize Services and Link Sessions
-- Categorizes existing services to enable role-based filtering and populates missing service_ids in the sessions table.

-- 1. Categorize Services based on common names
UPDATE public.services
SET category = 'Physiotherapy'
WHERE name ILIKE '%Physio%' AND category IS NULL;

UPDATE public.services
SET category = 'S&C'
WHERE (name ILIKE '%Strength%' OR name ILIKE '%Conditioning%' OR name ILIKE '%Training%' OR name ILIKE '%S&C%') AND category IS NULL;

UPDATE public.services
SET category = 'Nutrition'
WHERE name ILIKE '%Nutrition%' AND category IS NULL;

UPDATE public.services
SET category = 'Massage'
WHERE name ILIKE '%Massage%' AND category IS NULL;

UPDATE public.services
SET category = 'Medical'
WHERE (name ILIKE '%Consultation%' OR name ILIKE '%Assessment%' OR name ILIKE '%Doctor%') AND category IS NULL;

-- 2. Link existing sessions to service_id
-- We temporarily disable the governance trigger to allow mapping fixes on historical sessions
ALTER TABLE public.sessions DISABLE TRIGGER session_governance_check;

UPDATE public.sessions s
SET service_id = sv.id
FROM public.services sv
WHERE s.service_id IS NULL 
  AND s.organization_id = sv.organization_id
  AND LOWER(TRIM(s.service_type)) = LOWER(TRIM(sv.name));

-- 3. Specifically fix known ambiguous mappings
UPDATE public.sessions s
SET service_id = sv.id
FROM public.services sv
WHERE s.service_id IS NULL 
  AND s.organization_id = sv.organization_id
  AND (
    (LOWER(TRIM(s.service_type)) = 's&c' AND LOWER(TRIM(sv.name)) = 'strength & conditioning') OR
    (LOWER(TRIM(s.service_type)) = 'strength & conditioning' AND LOWER(TRIM(sv.name)) = 's&c')
  );

ALTER TABLE public.sessions ENABLE TRIGGER session_governance_check;
