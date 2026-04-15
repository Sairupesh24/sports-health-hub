-- Clean up orphaned roles that don't have a profile
DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

ALTER TABLE IF EXISTS public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey_profiles;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also ensure we have an index for this relationship if not already present
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
