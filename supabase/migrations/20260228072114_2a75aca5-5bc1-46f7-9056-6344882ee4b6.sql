
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'consultant', 'client');

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Client form field config (admin can toggle mandatory fields)
CREATE TABLE public.client_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, field_name)
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  uhid TEXT NOT NULL UNIQUE,
  registered_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  honorific TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  gender TEXT,
  mobile_no TEXT NOT NULL,
  aadhaar_no TEXT,
  blood_group TEXT,
  dob DATE,
  age INT,
  email TEXT,
  alternate_mobile_no TEXT,
  occupation TEXT,
  org_name TEXT,
  address TEXT,
  locality TEXT,
  pincode TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  has_insurance BOOLEAN DEFAULT false,
  insurance_provider TEXT,
  insurance_policy_no TEXT,
  insurance_validity DATE,
  insurance_coverage_amount NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Client documents
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UHID sequence tracking
CREATE TABLE public.uhid_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  last_serial INT NOT NULL DEFAULT 0,
  UNIQUE(organization_id, year_month)
);

-- Function to generate UHID
CREATE OR REPLACE FUNCTION public.generate_uhid(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
  v_year TEXT;
  v_year_month TEXT;
  v_serial INT;
  v_uhid TEXT;
BEGIN
  v_month := LPAD(EXTRACT(MONTH FROM now())::TEXT, 2, '0');
  v_year := LPAD((EXTRACT(YEAR FROM now())::INT % 100)::TEXT, 2, '0');
  v_year_month := v_month || v_year;

  INSERT INTO public.uhid_sequences (organization_id, year_month, last_serial)
  VALUES (p_organization_id, v_year_month, 1)
  ON CONFLICT (organization_id, year_month)
  DO UPDATE SET last_serial = uhid_sequences.last_serial + 1
  RETURNING last_serial INTO v_serial;

  v_uhid := 'CSH' || v_month || v_year || LPAD(v_serial::TEXT, 4, '0');
  RETURN v_uhid;
END;
$$;

-- Indexes
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_clients_uhid ON public.clients(uhid);
CREATE INDEX idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX idx_locations_org ON public.locations(organization_id);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhid_sequences ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles: users can view own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Organizations: authenticated users can view their org
CREATE POLICY "Users can view their org" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Locations: users can view locations in their org
CREATE POLICY "Users can view org locations" ON public.locations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Clients: org-scoped access for admin/consultant
CREATE POLICY "Staff can view org clients" ON public.clients FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Staff can insert org clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Staff can update org clients" ON public.clients FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Client documents: org-scoped
CREATE POLICY "Staff can view org client docs" ON public.client_documents FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Staff can insert org client docs" ON public.client_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Field config: org-scoped
CREATE POLICY "Staff can view field config" ON public.client_field_config FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage field config" ON public.client_field_config FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- UHID sequences: only via function, but allow org access
CREATE POLICY "Org users can access uhid seq" ON public.uhid_sequences FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

-- Storage RLS for client documents bucket
CREATE POLICY "Authenticated users can upload client docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents');
CREATE POLICY "Authenticated users can view client docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, '', '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed a default organization for dev
INSERT INTO public.organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'ISHPO Default Clinic');
INSERT INTO public.locations (organization_id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Main Branch');
