import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeadsDashboard from '../pages/admin/LeadsDashboard';
import EnquiryFormPage from '../pages/crm/EnquiryFormPage';
import PublicEnquiry from '../pages/PublicEnquiry';
import AppSidebar from '../components/layout/AppSidebar';
import { ShareEnquiryModal } from '../components/admin/ShareEnquiryModal';
import { ConvertLeadModal } from '../components/admin/ConvertLeadModal';
import { InteractionModal } from '../components/admin/InteractionModal';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@ishpo.com' },
    profile: {
      id: 'admin-1',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      organization_id: 'org-1',
      organization_name: 'ISHPO Clinic',
      organization_slug: 'ishpo',
      has_leads_access: true,
    },
    roles: ['admin'],
    loading: false,
    signOut: vi.fn(),
    refreshAuth: vi.fn(),
  }),
}));

// Mock apiFetch
vi.mock('@/utils/api', () => ({
  apiFetch: vi.fn(async (url: string, _options?: Record<string, unknown>) => {
    if (url.includes('/clients/enquiries/all')) {
      return [
        {
          id: 'lead-1',
          name: 'Shreya Agarwal',
          first_name: 'Shreya',
          last_name: 'Agarwal',
          contact: '9090490491',
          mobile_no: '9090490491',
          looking_for: 'Physiotherapy Consultation',
          referral_source: 'Instagram',
          preferred_call_time: 'Afternoon (12 PM - 4 PM)',
          status: 'new',
          lead_temperature: 'hot',
          next_follow_up_at: null,
          last_interaction_at: null,
          created_at: new Date().toISOString()
        },
        {
          id: 'lead-2',
          name: 'Vamshi Vardhan',
          first_name: 'Vamshi',
          last_name: 'Vardhan',
          contact: '9440393813',
          mobile_no: '9440393813',
          looking_for: 'Doctor Consultation',
          referral_source: 'Google Search',
          preferred_call_time: 'Evening (4 PM - 8 PM)',
          status: 'contacted',
          lead_temperature: 'warm',
          next_follow_up_at: new Date(Date.now() + 86400000).toISOString(),
          last_interaction_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ];
    }
    if (url.includes('/interactions')) {
      return { data: [] };
    }
    if (url.includes('/organizations/enquiry-config')) {
      return {
        name: 'Center for Spine and Sports Health',
        slug: 'cssh',
        logo_url: '/uploads/logo.jpg',
        enquiry_form_config: {}
      };
    }
    return {};
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Leads Dashboard CRM & Entry-Level Capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Leads Dashboard with KPI metric cards, Table view, and action buttons', async () => {
    renderWithProviders(<LeadsDashboard />);

    // Header actions
    expect(screen.getByText(/Leads & Prospects CRM/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Share Form & QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /(Edit Enquiry Form|Form Settings)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log Manual Enquiry/i })).toBeInTheDocument();

    // KPI cards
    expect(screen.getByText(/New Inquiries/i)).toBeInTheDocument();
    expect(screen.getByText(/Callbacks Due Today/i)).toBeInTheDocument();

    // Table view displays mock leads
    await waitFor(() => {
      expect(screen.getByText('Shreya Agarwal')).toBeInTheDocument();
      expect(screen.getByText('Vamshi Vardhan')).toBeInTheDocument();
    });
  });

  it('allows switching to Kanban Pipeline View with full quick action buttons', async () => {
    renderWithProviders(<LeadsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Shreya Agarwal')).toBeInTheDocument();
    });

    const kanbanButton = screen.getByRole('button', { name: /Kanban/i });
    fireEvent.click(kanbanButton);

    // Columns should be visible
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('Contacted / Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Session Booked')).toBeInTheDocument();
    expect(screen.getByText('Converted')).toBeInTheDocument();

    // Verify leads are rendered in kanban cards
    expect(screen.getByText('Shreya Agarwal')).toBeInTheDocument();
    expect(screen.getByText('Vamshi Vardhan')).toBeInTheDocument();
  });

  it('renders ShareEnquiryModal with direct link, campaign-tagged links, and QR code', () => {
    render(
      <ShareEnquiryModal
        open={true}
        onOpenChange={vi.fn()}
        orgSlug="ishpo"
        orgName="ISHPO Clinic"
      />
    );

    expect(screen.getByText(/Share Enquiry Form/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Public Link/i)).toBeInTheDocument();
    expect(screen.getByText(/Instagram Bio \/ Story/i)).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp Blast \/ Status/i)).toBeInTheDocument();
  });

  it('renders ConvertLeadModal with Create New Patient and Link Patient tabs', () => {
    const mockEnquiry = {
      id: 'lead-1',
      name: 'Shreya Agarwal',
      contact: '9090490491',
      email: 'shreya@example.com',
      looking_for: 'Physiotherapy'
    };

    renderWithProviders(
      <ConvertLeadModal
        open={true}
        onOpenChange={vi.fn()}
        enquiry={mockEnquiry}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Convert Lead to Client/i)).toBeInTheDocument();
    expect(screen.getByText(/Create New Patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Link Existing Patient/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Patient Profile & Convert/i })).toBeInTheDocument();
  });

  it('renders InteractionModal with disposition tags, temperature indicators, and callback engine', () => {
    renderWithProviders(
      <InteractionModal
        open={true}
        onOpenChange={vi.fn()}
        enquiryId="lead-1"
        enquiryName="Shreya Agarwal"
        enquiryContact="9090490491"
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Log Interaction: Shreya Agarwal/i)).toBeInTheDocument();
    expect(screen.getByText(/Spoke • Highly Interested/i)).toBeInTheDocument();
    expect(screen.getByText(/Busy • Requested Callback/i)).toBeInTheDocument();
    expect(screen.getByText(/Hot \(Ready to book\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Schedule a Follow-Up Callback\?/i)).toBeInTheDocument();
  });

  it('renders CRM Sidebar with ONLY Leads and Enquiry Form, completely decoupling tabs from other consoles', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/crm']}>
          <AppSidebar role="crm" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Header displays Leads & CRM
    expect(screen.getByText('Leads & CRM')).toBeInTheDocument();

    // Exclusive CRM tabs must be present
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Enquiry Form')).toBeInTheDocument();

    // Tabs from other consoles must NOT be present
    expect(screen.queryByText('Client Directory')).not.toBeInTheDocument();
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
    expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
    expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
    expect(screen.queryByText('User Approvals')).not.toBeInTheDocument();
    expect(screen.queryByText('Activity Tracker')).not.toBeInTheDocument();
  });

  it('renders dedicated EnquiryFormPage with questions editor, custom questions builder, branding, and live preview with dynamic organization name', async () => {
    renderWithProviders(<EnquiryFormPage />);

    expect(screen.getByText(/Enquiry Form Editor/i)).toBeInTheDocument();
    expect(screen.getByText(/Public Form URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Live Form/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Standard Patient Intake Fields/i)).toBeInTheDocument();
      expect(screen.getByText(/Custom Clinical & Lifestyle Questions/i)).toBeInTheDocument();
    });

    // Check Live Preview tab renders dynamic org name
    const previewTab = screen.getByRole('tab', { name: /Live Preview/i });
    fireEvent.click(previewTab);

    await waitFor(() => {
      expect(screen.getByText('Center for Spine and Sports Health')).toBeInTheDocument();
    });
    // Ensure hardcoded ISHPO Physical Therapy header is NOT shown when custom org is present
    expect(screen.queryByText('ISHPO Physical Therapy')).not.toBeInTheDocument();
  });

  it('renders PublicEnquiry with dynamic organization name and logo for tenant slug', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/public/orgs/cssh')) {
        return {
          ok: true,
          json: async () => ({
            id: 'db204aab-4b8b-4dd2-a842-bc9f67002693',
            name: 'Center for Spine and Sports Health',
            slug: 'cssh',
            logo_url: '/uploads/logo-cssh.jpg',
            enquiry_form_config: {
              tagline: 'Premier Sports Care',
              welcome_text: 'Welcome to Center for Spine and Sports Health intake.'
            }
          })
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Org not found' }) };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/cssh']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Center for Spine and Sports Health')).toBeInTheDocument();
        expect(screen.getByText('Premier Sports Care')).toBeInTheDocument();
      });
      expect(screen.queryByText('Main Clinic')).not.toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('auto-fills and locks referral source attribution when campaign source parameter is present in URL (e.g. ?source=WhatsApp)', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/public/orgs/cssh')) {
        return {
          ok: true,
          json: async () => ({
            id: 'db204aab-4b8b-4dd2-a842-bc9f67002693',
            name: 'Center for Spine and Sports Health',
            slug: 'cssh',
            enquiry_form_config: {
              fields: {
                work_place: { visible: false, required: false },
                looking_for: { visible: false, required: false },
                referral_source: { visible: true, required: true },
                preferred_call_time: { visible: false, required: false },
                notes: { visible: false, required: false },
              }
            }
          })
        };
      }
      if (url.includes('/public/enquiries')) {
        capturedBody = JSON.parse(options?.body as string);
        return {
          ok: true,
          json: async () => ({ id: 'enq-new-1', ...capturedBody })
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/cssh?source=WhatsApp']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify the locked attribution card is displayed with "WhatsApp" and "Auto-Attributed" badge
      await waitFor(() => {
        expect(screen.getByText('Auto-Attributed')).toBeInTheDocument();
        expect(screen.getByTestId('locked-referral-source')).toBeInTheDocument();
        expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      });

      // Verify user cannot open an editable select for referral source (SelectTrigger for source is not rendered)
      expect(screen.queryByRole('combobox', { name: /How did you hear about us/i })).not.toBeInTheDocument();

      // Fill in Name and Contact and submit
      const nameInput = screen.getByPlaceholderText('John Doe');
      const contactInput = screen.getByPlaceholderText('9876543210');
      fireEvent.change(nameInput, { target: { value: 'Deepak Sharma' } });
      fireEvent.change(contactInput, { target: { value: '9876543210' } });

      const submitButton = screen.getByRole('button', { name: /Submit Enquiry/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(capturedBody).not.toBeNull();
      });

      // Assert that the locked campaign source was submitted
      expect(capturedBody).toMatchObject({
        first_name: 'Deepak',
        last_name: 'Sharma',
        mobile_no: '9876543210',
        referral_source: 'WhatsApp',
        organization_id: 'db204aab-4b8b-4dd2-a842-bc9f67002693',
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('renders editable dropdown without locked state when no campaign source is in URL', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/public/orgs/cssh')) {
        return {
          ok: true,
          json: async () => ({
            id: 'db204aab-4b8b-4dd2-a842-bc9f67002693',
            name: 'Center for Spine and Sports Health',
            slug: 'cssh',
            enquiry_form_config: {}
          })
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/cssh']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Center for Spine and Sports Health')).toBeInTheDocument();
      });

      // Locked badge must NOT be present
      expect(screen.queryByText('Auto-Attributed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('locked-referral-source')).not.toBeInTheDocument();

      // Editable select trigger should be present
      expect(screen.getByText('Select source')).toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('renders PublicEnquiry not-found error state when organization slug is invalid', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Clinic enquiry form not found' })
      };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/non-existent-org']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Enquiry Form Not Found/i })).toBeInTheDocument();
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

