import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AdminCalendar from '../pages/admin/AdminCalendar';

// Mock Lucide React icons because they can cause issues in testing environments
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Add any specific overrides if needed
  };
});

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'admin-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925' },
    user: { id: 'admin-user' },
    roles: ['admin']
  })
}));

// Mock the API utility
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string, options: any = {}) => {
    console.log('[MOCK apiFetch] Calling endpoint:', endpoint, 'options:', options);
    if (endpoint.includes('/hr/employees')) {
      return [
        {
          id: '62970e9a-5030-4acb-9837-d170f3161667',
          first_name: 'Sandeep',
          last_name: 'S',
          profession: 'Sports Physician',
          avatar_url: null,
          emergency_alerts: []
        },
        {
          id: '0cb9eee5-1a96-4839-9ec3-de50f8262e97',
          first_name: 'Raja Prasad',
          last_name: 'M',
          profession: 'Physiotherapist',
          avatar_url: null,
          emergency_alerts: []
        }
      ];
    }
    if (endpoint.includes('/appointments')) {
      return [
        {
          id: 'eaf8ac4d-aa11-4a1b-a0a2-34a53c55f894',
          organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925',
          client_id: 'a5ba9385-757c-4647-b02b-ec44df42425f',
          therapist_id: '62970e9a-5030-4acb-9837-d170f3161667',
          scientist_id: null,
          entitlement_id: null,
          service_id: null,
          service_type: 'Consultation',
          session_mode: 'Individual',
          scheduled_start: '2026-05-27T10:30:00.000Z',
          scheduled_end: '2026-05-27T11:00:00.000Z',
          status: 'Planned',
          client: { first_name: 'Sai Pavan', last_name: 'K', is_vip: true },
          therapist: { first_name: 'Sandeep', last_name: 'S' }
        }
      ];
    }
    if (endpoint.includes('/staff-schedules')) {
      return [];
    }
    if (endpoint.includes('/leaves')) {
      return { data: [] };
    }
    if (endpoint.includes('/settings')) {
      return { default_slot_duration: 60 };
    }
    if (endpoint.includes('/waitlist')) {
      return [];
    }
    if (endpoint.includes('/emergencies')) {
      return { data: [] };
    }
    return [];
  }
}));

describe('AdminCalendar', () => {
  it('should render and load data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminCalendar />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Let's wait a bit for the rendering and async query resolved logs
    await waitFor(() => {
      // Look for therapist name or page elements
      expect(screen.getByText(/Clinic Calendar & Scheduling/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
