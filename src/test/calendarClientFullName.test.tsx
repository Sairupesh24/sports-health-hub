import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AdminCalendar from '../pages/admin/AdminCalendar';
import { formatClientName } from '@/lib/utils';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'admin-prof', organization_id: 'org-test-123' },
    user: { id: 'admin-user' },
    roles: ['admin']
  })
}));

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

// Mock the API utility
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/hr/employees')) {
      return [
        {
          id: 'therapist-1',
          first_name: 'Anirudh',
          last_name: 'K',
          profession: 'Sports Scientist',
          avatar_url: null,
          emergency_alerts: []
        }
      ];
    }
    if (endpoint.includes('/appointments')) {
      return [
        {
          id: 'session-1',
          organization_id: 'org-test-123',
          client_id: 'client-1',
          therapist_id: 'therapist-1',
          scientist_id: null,
          service_type: 'Strength & Conditioning',
          session_mode: 'Individual',
          scheduled_start: `${todayStr}T09:00:00.000Z`,
          scheduled_end: `${todayStr}T10:00:00.000Z`,
          status: 'Planned',
          client: {
            id: 'client-1',
            first_name: 'Aadhi',
            middle_name: 'Kumar',
            last_name: 'S',
            uhid: 'UHID-001',
            is_vip: false
          },
          therapist: { first_name: 'Anirudh', last_name: 'K' }
        },
        {
          id: 'session-2',
          organization_id: 'org-test-123',
          client_id: 'client-2',
          therapist_id: 'therapist-1',
          scientist_id: null,
          service_type: 'Training',
          session_mode: 'Individual',
          scheduled_start: `${todayStr}T11:00:00.000Z`,
          scheduled_end: `${todayStr}T12:00:00.000Z`,
          status: 'Planned',
          client: {
            id: 'client-2',
            first_name: 'Surya',
            last_name: 'Reddy',
            uhid: 'SR-001',
            is_vip: false
          },
          therapist: { first_name: 'Anirudh', last_name: 'K' }
        }
      ];
    }
    if (endpoint.includes('/staff-schedules') || endpoint.includes('/waitlist')) {
      return [];
    }
    if (endpoint.includes('/leaves') || endpoint.includes('/emergencies')) {
      return { data: [] };
    }
    if (endpoint.includes('/settings')) {
      return { default_slot_duration: 60 };
    }
    return [];
  }
}));

describe('Calendar Cards Client Full Name with Middle Name', () => {
  it('correctly formats names with middle_name in formatClientName utility', () => {
    // Normal first, middle, last
    expect(formatClientName({ first_name: 'Aadhi', middle_name: 'Kumar', last_name: 'S' }))
      .toBe('Aadhi Kumar S');

    // Without middle name
    expect(formatClientName({ first_name: 'Surya', last_name: 'Reddy' }))
      .toBe('Surya Reddy');

    // With honorific
    expect(formatClientName({ honorific: 'Mr.', first_name: 'Aadhi', middle_name: 'Kumar', last_name: 'S' }, { includeHonorific: true }))
      .toBe('Mr. Aadhi Kumar S');

    // Flat properties fallback
    expect(formatClientName({ client_first_name: 'Aadhi', client_middle_name: 'Kumar', client_last_name: 'S' }))
      .toBe('Aadhi Kumar S');

    // Session wrapping client object
    expect(formatClientName({ client: { first_name: 'Aadhi', middle_name: 'Kumar', last_name: 'S' } }))
      .toBe('Aadhi Kumar S');
  });

  it('displays full name including middle name on calendar cards in AdminCalendar', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminCalendar />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for calendar to load and cards to render
    await waitFor(() => {
      // Client 1 with middle name must show "Aadhi Kumar S"
      expect(screen.getByText(/Aadhi Kumar S/i)).toBeInTheDocument();
      // Client 2 without middle name must show "Surya Reddy"
      expect(screen.getByText(/Surya Reddy/i)).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});
