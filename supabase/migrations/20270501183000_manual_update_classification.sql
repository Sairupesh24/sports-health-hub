-- Run this in your Supabase SQL Editor to support the new Form Builder classification feature.

ALTER TABLE public.questionnaires 
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'performance' 
CHECK (classification IN ('performance', 'clinical'));

-- Optional: Update existing records to 'performance' if they are null
UPDATE public.questionnaires SET classification = 'performance' WHERE classification IS NULL;
