-- Add audit fields to bills table
ALTER TABLE IF EXISTS public.bills 
ADD COLUMN IF NOT EXISTS discount_authorized_by TEXT,
ADD COLUMN IF NOT EXISTS billing_staff_name TEXT,
ADD COLUMN IF NOT EXISTS include_notes_in_invoice BOOLEAN DEFAULT false;

-- Add mobile_no to profiles table
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS mobile_no TEXT;

-- Ensure referral_source_id exists in bills table (reference to referral_sources)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='referral_source_id') THEN
        ALTER TABLE public.bills ADD COLUMN referral_source_id UUID REFERENCES public.referral_sources(id);
    END IF;
END $$;
