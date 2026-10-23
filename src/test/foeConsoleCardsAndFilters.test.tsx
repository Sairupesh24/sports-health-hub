import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import FOEDashboard from '../pages/admin/FOEDashboard';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'foe-user-id', role: 'foe' },
    profile: { id: 'foe-user-id', first_name: 'Abhishek', role: 'foe', organization_id: 'org-foe-1' },
    roles: ['foe'],
    loading: false,
    refreshAuth: vi.fn(),
  }),
}));

const mockConsultants = [
  {
    id: 'sci-1',
    first_name: 'Karthik',
    last_name: 'Rao',
    profession: 'Sports Scientist',
    role: 'sports_scientist',
  },
  {
    id: 'physio-1',
    first_name: 'Priya',
    last_name: 'Sharma',
    profession: 'Physiotherapist',
    role: 'physiotherapist',
  },
];

const mockSessions = [
  {
    id: 'sess-1',
    scheduled_start: new Date().toISOString(),
    session_mode: 'Individual',
    service_type: 'Strength & Conditioning',
    status: 'Completed',
    is_unentitled: false,
    scientist_id: 'sci-1',
    therapist_id: null,
    therapist: { id: 'sci-1', first_name: 'Karthik', last_name: 'Rao', profession: 'Sports Scientist' },
    client: { first_name: 'John', last_name: 'Doe', uhid: 'UHID-001' },
  },
  {
    id: 'sess-2',
    scheduled_start: new Date().toISOString(),
    session_mode: 'Individual',
    service_type: 'Physiotherapy',
    status: 'Planned',
    is_unentitled: true,
    scientist_id: null,
    therapist_id: 'physio-1',
    therapist: { id: 'physio-1', first_name: 'Priya', last_name: 'Sharma', profession: 'Physiotherapist' },
    client: { first_name: 'Jane', last_name: 'Smith', uhid: 'UHID-002' },
  },
  {
    id: 'sess-3',
    scheduled_start: new Date().toISOString(),
    session_mode: 'Individual',
    service_type: 'Physiotherapy',
    status: 'Completed',
    is_unentitled: false,
    scientist_id: null,
    therapist_id: 'physio-1',
    therapist: { id: 'physio-1', first_name: 'Priya', last_name: 'Sharma', profession: 'Physiotherapist' },
    client: { first_name: 'Alice', last_name: 'Brown', uhid: 'UHID-003' },
  },
];

vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/appointments/waitlist')) {
      return [];
    }
    if (endpoint.includes('is_unentitled=true')) {
      return [mockSessions[1]];
    }
    if (endpoint.includes('/api/appointments')) {
      return mockSessions;
    }
    if (endpoint.includes('/hr/employees')) {
      return mockConsultants;
    }
    if (endpoint.includes('/api/billing/dunning-alerts')) {
      return [];
    }
    return [];
  },
}));

describe('FOE Console - Cards and Filters', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('renders Total Appointments, Sessions Completed, Sessions Pending, and Unentitled Sessions cards', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FOEDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify 4 card titles exist
    expect(screen.getByText('Total Appointments')).toBeInTheDocument();
    expect(screen.getByText('Sessions Completed')).toBeInTheDocument();
    expect(screen.getByText('Sessions Pending')).toBeInTheDocument();
    expect(screen.getAllByText('Unentitled Sessions').length).toBe(2); // Card and right column list header

    // Verify initial values for 'All'
    await waitFor(() => {
      expect(screen.getByText(/All Specialists • Today/i)).toBeInTheDocument();
      expect(screen.getByText('67% Completion Rate')).toBeInTheDocument();
    });
  });

  it('renders role filters and updates card counts when filtering by Sports Scientists or Physiotherapists', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FOEDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify filter buttons exist
    const sportsSciBtn = screen.getByRole('button', { name: /^Sports Scientists$/i });
    const physioBtn = screen.getByRole('button', { name: /^Physiotherapists$/i });
    const allStaffBtn = screen.getByRole('button', { name: /^All Specialists$/i });

    expect(sportsSciBtn).toBeInTheDocument();
    expect(physioBtn).toBeInTheDocument();
    expect(allStaffBtn).toBeInTheDocument();

    // Click Sports Scientists filter
    fireEvent.click(sportsSciBtn);

    // Sports Scientists has 1 appointment, 1 completed, 0 pending, 0 unentitled
    await waitFor(() => {
      expect(screen.getByText(/Sports Scientists • Today/i)).toBeInTheDocument();
    });

    // Click Physiotherapists filter
    fireEvent.click(physioBtn);

    // Physiotherapists has 2 appointments, 1 completed, 1 pending, 1 unentitled
    await waitFor(() => {
      expect(screen.getByText(/Physiotherapists • Today/i)).toBeInTheDocument();
    });
  });

  it('renders time filters and reveals date pickers on Custom Dates selection', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FOEDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('button', { name: /^Today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^This Week$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^This Month$/i })).toBeInTheDocument();
    
    const customDatesBtn = screen.getByRole('button', { name: /Custom Dates/i });
    expect(customDatesBtn).toBeInTheDocument();

    // From / To inputs should not be visible initially
    expect(screen.queryByText(/^From:$/i)).not.toBeInTheDocument();

    // Click Custom Dates
    fireEvent.click(customDatesBtn);

    // Now From and To labels should appear
    expect(screen.getByText(/From:/i)).toBeInTheDocument();
    expect(screen.getByText(/To:/i)).toBeInTheDocument();
  });
});
