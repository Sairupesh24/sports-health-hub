-- Add transaction_id column to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Note: We don't make it NOT NULL here because existing bills won't have it, 
-- and Cash payments might not require it (though the UI will enforce it for UPI/Card).
