-- Migration: Upgrade Client Document System
-- Add categorization and strict RBAC

-- 1. Create Document Category Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
        CREATE TYPE public.document_category AS ENUM (
            'Exercise Charts', 
            'Scan Reports', 
            'Insurance', 
            'Consent Forms', 
            'Prescriptions', 
            'Other'
        );
    END IF;
END $$;

-- 2. Add new columns to client_documents
ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS category public.document_category DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'Medical_Staff_Only',
ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Backfill existing documents
UPDATE public.client_documents SET category = 'Other' WHERE category IS NULL;
UPDATE public.client_documents SET access_level = 'Medical_Staff_Only' WHERE access_level IS NULL;

-- 4. Re-enforce RLS with strict roles
-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view org client docs" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can insert org client docs" ON public.client_documents;

-- Create strict policies
-- Only Admins and Sports Physicians can view/manage
CREATE POLICY "Authorized staff can view client docs" 
ON public.client_documents 
FOR SELECT 
TO authenticated 
USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

CREATE POLICY "Authorized staff can insert client docs" 
ON public.client_documents 
FOR INSERT 
TO authenticated 
WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

CREATE POLICY "Authorized staff can update client docs" 
ON public.client_documents 
FOR UPDATE 
TO authenticated 
USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

CREATE POLICY "Authorized staff can delete client docs" 
ON public.client_documents 
FOR DELETE 
TO authenticated 
USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

-- 5. Storage RLS Upgrade (More granular)
-- Only allow authorized roles to access the 'client-documents' bucket
DROP POLICY IF EXISTS "Authenticated users can upload client docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client docs" ON storage.objects;

CREATE POLICY "Authorized staff can upload docs" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'client-documents' 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

CREATE POLICY "Authorized staff can view docs" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'client-documents' 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

-- Ensure VIP Patients indicator is already in clients table (assuming it is based on conversation history)
-- No changes needed if is_vip already exists.
