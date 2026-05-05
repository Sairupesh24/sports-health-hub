-- Add missing roles to app_role enum to align with TypeScript types
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'massage_therapist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coach';
