-- Migration to add 'foe' (Front Office Executive) to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'foe';
