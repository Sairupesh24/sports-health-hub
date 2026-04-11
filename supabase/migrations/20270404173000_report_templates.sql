-- Migration: Clinical Report Templates Persistence
-- Description: Create storage for report templates with Role-Based Access for Sports Physicians

-- 1. Create Report Templates Table
CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Path in storage bucket
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Setup RLS (Row Level Security)
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- 3. Policies for report_templates
-- VIEW: All authenticated users in the organization
DO $$ 
BEGIN
    CREATE POLICY "Users can view org templates" ON public.report_templates 
    FOR SELECT TO authenticated 
    USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- MANAGE: Only Sports Physicians and Admins can Create/Delete
DO $$ 
BEGIN
    CREATE POLICY "Sports Physicians can manage templates" ON public.report_templates 
    FOR ALL TO authenticated 
    USING (
        organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (
            public.has_role(auth.uid(), 'admin') 
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
        )
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. Storage Bucket Setup (Metadata)
-- Note: Buckets are typically created via API or manual Dashboard, 
-- but we define the RLS policies here for safety.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-templates', 'report-templates', true) 
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies
-- VIEW: All authenticated staff
DROP POLICY IF EXISTS "Authorized staff can view report templates" ON storage.objects;
CREATE POLICY "Authorized staff can view report templates" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'report-templates');

-- MANAGE: Only Sports Physicians and Admins
DROP POLICY IF EXISTS "Authorized staff can manage report templates" ON storage.objects;
CREATE POLICY "Authorized staff can manage report templates" 
ON storage.objects 
FOR ALL 
TO authenticated 
USING (
    bucket_id = 'report-templates' 
    AND (
        public.has_role(auth.uid(), 'admin') 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profession = 'Sports Physician')
    )
);

-- 6. Trigger for Updated At
CREATE OR REPLACE FUNCTION update_report_templates_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_report_templates_modified_timestamp ON public.report_templates;
CREATE TRIGGER update_report_templates_modified_timestamp
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION update_report_templates_modified();
