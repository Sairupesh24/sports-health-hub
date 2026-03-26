-- Fix training_programs constraints for templates and ad-hoc assignments
ALTER TABLE public.training_programs 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

ALTER TABLE public.training_programs 
ALTER COLUMN coach_id DROP NOT NULL;
