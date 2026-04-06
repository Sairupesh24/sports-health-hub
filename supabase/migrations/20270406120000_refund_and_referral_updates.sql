-- Add referral tracking to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS referral_source_detail TEXT;

-- Add override and authorization to refunds table
ALTER TABLE refunds
ADD COLUMN IF NOT EXISTS is_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS authorized_by TEXT;

-- Update RLS if needed (already enabled, and Admin/FOE can insert)
-- No changes needed to existing RLS as they are broad enough.
