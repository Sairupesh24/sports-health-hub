import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicEnquiry from '../pages/PublicEnquiry';

describe('PublicEnquiry Mobile & Desktop Resiliency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses relative /api URL to prevent mobile "Failed to fetch" on external domains', async () => {
    let requestedUrl = '';
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrl = url;
      if (url.includes('/public/orgs/')) {
        return {
          ok: true,
          json: async () => ({
            id: 'org-test-uuid',
            name: 'Integrated Sports Health Clinic',
            slug: 'ishpo',
            logo_url: '/uploads/ishpo-logo.png',
            enquiry_form_config: {
              tagline: 'Precision Care for Champions',
              welcome_text: 'Intake form for athletic and spine recovery.'
            }
          })
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/ishpo']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Integrated Sports Health Clinic')).toBeInTheDocument();
      });

      // Assert that the URL does NOT point to localhost:3000
      expect(requestedUrl).not.toContain('localhost:3000');
      // Assert that it uses relative /api endpoint
      expect(requestedUrl).toBe('/api/public/orgs/ishpo');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('allows public user without login to submit an enquiry effortlessly', async () => {
    let submitPayload: Record<string, unknown> | null = null;
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/public/orgs/')) {
        return {
          ok: true,
          json: async () => ({
            id: 'org-1234',
            name: 'Apex Sports Health',
            slug: 'apex',
            enquiry_form_config: {
              fields: {
                work_place: { visible: true, required: true },
                looking_for: { visible: true, required: true, options: ['Physiotherapy', 'Rehab'] },
                referral_source: { visible: true, required: true },
                preferred_call_time: { visible: true, required: false },
                notes: { visible: true, required: false }
              }
            }
          })
        };
      }
      if (url.includes('/public/enquiries')) {
        submitPayload = JSON.parse(options?.body as string);
        return {
          ok: true,
          json: async () => ({ id: 'new-enq-id', ...submitPayload })
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/apex']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Apex Sports Health')).toBeInTheDocument();
      });

      // Fill in all required fields
      fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Jane Athlete' } });
      fireEvent.change(screen.getByPlaceholderText('9876543210'), { target: { value: '9876543210' } });
      fireEvent.change(screen.getByPlaceholderText('Company name or profession'), { target: { value: 'Olympic Runner' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Enquiry/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitPayload).not.toBeNull();
      });

      expect(submitPayload).toMatchObject({
        organization_id: 'org-1234',
        first_name: 'Jane',
        last_name: 'Athlete',
        mobile_no: '9876543210',
        work_place: 'Olympic Runner'
      });

      // Confirms success screen appears
      await waitFor(() => {
        expect(screen.getByText('Enquiry Received!')).toBeInTheDocument();
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('shows friendly connection error card with Retry button when network fails and recovers on retry', async () => {
    let callCount = 0;
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        throw new TypeError('Failed to fetch');
      }
      return {
        ok: true,
        json: async () => ({
          id: 'org-retry-id',
          name: 'Recovered Clinic',
          slug: 'recovered',
          enquiry_form_config: {}
        })
      };
    }) as unknown as typeof fetch;

    try {
      render(
        <MemoryRouter initialEntries={['/enquiry/recovered']}>
          <Routes>
            <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify connection error state
      await waitFor(() => {
        expect(screen.getByText('Unable to Connect')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

      // Form should now load successfully
      await waitFor(() => {
        expect(screen.getByText('Recovered Clinic')).toBeInTheDocument();
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

