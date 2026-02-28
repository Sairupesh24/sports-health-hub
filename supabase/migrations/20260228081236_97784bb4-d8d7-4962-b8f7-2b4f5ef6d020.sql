
-- Add is_approved to profiles for admin approval flow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Add sport column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sport text;

-- Allow profiles to be inserted by the trigger (handle_new_user)
CREATE POLICY "Trigger can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
