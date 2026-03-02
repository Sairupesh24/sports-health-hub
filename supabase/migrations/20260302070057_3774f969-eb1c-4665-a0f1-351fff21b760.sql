
-- Referral sources table
CREATE TABLE public.referral_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(organization_id, name)
);

ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view org referral sources" ON public.referral_sources
  FOR SELECT USING (organization_id = get_my_org_id());

CREATE POLICY "Staff can insert org referral sources" ON public.referral_sources
  FOR INSERT WITH CHECK (organization_id = get_my_org_id());

-- Packages table
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(organization_id, name)
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view org packages" ON public.packages
  FOR SELECT USING (organization_id = get_my_org_id());

CREATE POLICY "Staff can insert org packages" ON public.packages
  FOR INSERT WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "Admins can update org packages" ON public.packages
  FOR UPDATE USING (organization_id = get_my_org_id() AND has_role(auth.uid(), 'admin'));

-- Bills table
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  package_id UUID REFERENCES public.packages(id),
  referral_source_id UUID REFERENCES public.referral_sources(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view org bills" ON public.bills
  FOR SELECT USING (organization_id = get_my_org_id());

CREATE POLICY "Staff can insert org bills" ON public.bills
  FOR INSERT WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "Staff can update org bills" ON public.bills
  FOR UPDATE USING (organization_id = get_my_org_id());

-- Insert some dummy packages for the demo org
INSERT INTO public.packages (organization_id, name, price, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Basic Assessment', 1500, 'Initial sports assessment and report'),
  ('00000000-0000-0000-0000-000000000001', 'Performance Package', 5000, '4-week performance training program'),
  ('00000000-0000-0000-0000-000000000001', 'Rehabilitation Standard', 3500, 'Standard rehab program - 10 sessions'),
  ('00000000-0000-0000-0000-000000000001', 'Elite Coaching', 10000, 'Premium 1-on-1 coaching - 8 weeks'),
  ('00000000-0000-0000-0000-000000000001', 'Group Training', 2000, 'Group training sessions - monthly');

-- Insert some dummy referral sources
INSERT INTO public.referral_sources (organization_id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Walk-in'),
  ('00000000-0000-0000-0000-000000000001', 'Doctor Referral'),
  ('00000000-0000-0000-0000-000000000001', 'Online / Social Media'),
  ('00000000-0000-0000-0000-000000000001', 'Word of Mouth'),
  ('00000000-0000-0000-0000-000000000001', 'Sports Club');
