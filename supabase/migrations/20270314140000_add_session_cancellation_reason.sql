-- Migration: Add cancellation_reason to sessions table
-- Purpose: To store reasons for missed or cancelled sports science sessions

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
