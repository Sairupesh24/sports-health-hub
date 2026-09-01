-- =============================================================
-- Migration: 20260901141500_add_slot_capacity_and_custom_specialist_settings
-- Description: Adds default_slot_capacity and custom_specialist_settings
--              to organizations for dynamic slot duration & capacity configuration.
-- =============================================================

-- 1. Add default_slot_capacity to organizations (defaults to 2 appointments per slot)
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_slot_capacity" INTEGER DEFAULT 2;

-- 2. Add custom_specialist_settings JSONB to organizations for role & staff overrides
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "custom_specialist_settings" JSONB DEFAULT '{}'::jsonb;
