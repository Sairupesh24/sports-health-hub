-- Create refund_mode enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_mode') THEN
        CREATE TYPE refund_mode AS ENUM ('Cash', 'Online Bank Transfer', 'UPI', 'Clinic Credit');
    END IF;
END
$$;

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    amount DECIMAL(10, 2) NOT NULL,
    refund_mode refund_mode NOT NULL,
    transaction_id TEXT, -- Optional for Cash, Required for UPI/Online
    refund_proof_url TEXT, -- URL for the file/image attachment
    notes TEXT,
    is_entitlement_reversed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_refunds_bill_id ON refunds(bill_id);
CREATE INDEX IF NOT EXISTS idx_refunds_client_id ON refunds(client_id);
CREATE INDEX IF NOT EXISTS idx_refunds_organization_id ON refunds(organization_id);

-- Enable RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'refunds' AND policyname = 'Users can view refunds of their own organization'
    ) THEN
        CREATE POLICY "Users can view refunds of their own organization"
        ON refunds FOR SELECT
        USING (organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'refunds' AND policyname = 'Admins and FOE can insert refunds'
    ) THEN
        CREATE POLICY "Admins and FOE can insert refunds"
        ON refunds FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND ams_role IN ('admin', 'super_admin', 'foe')
            )
        );
    END IF;
END
$$;
