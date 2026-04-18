-- Make legacy user_id column nullable in notifications table to allow broadcasts
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
