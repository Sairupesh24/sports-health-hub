import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FOEDashboard, { getSessionPopulationCategory } from '../pages/admin/FOEDashboard';
import ActivityTracker from '../pages/hr/ActivityTracker';
import AppSidebar from '../components/layout/AppSidebar';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'foe-user-id', role: 'foe' },
    profile: { id: 'foe-user-id', first_name: 'Ananya', role: 'foe', organization_id: 'org-foe-1' },
    roles: ['foe'],
    loading: false,
    refreshAuth: vi.fn(),
  }),
}));

const mockTodaysSessions = [
  {
    id: 'group-sess-1',
    scheduled_start: '2026-10-16T06:30:00.000Z',
    session_mode: 'Group',
    group_name: 'CHAMP S&C (Morning)',
    service_type: 'Training',
    status: 'Completed',
    client_id: null,
    client: null,
    therapist: { first_name: 'Aditi', last_name: 'Mazumdar' },
  },
  {
    id: 'group-sess-2',
    scheduled_start: '2026-10-16T06:30:00.000Z',
    session_mode: 'Group',
    group_name: 'Gen-Pop Fitness',
    service_type: 'Training',
    status: 'Planned',
    client_id: null,
    client: null,
    therapist: { first_name: 'Titir', last_name: 'Santra' },
  },
  {
    id: 'ind-sess-1',
    scheduled_start: '2026-10-16T07:00:00.000Z',
    session_mode: 'Individual',
    group_name: null,
    service_type: 'Strength & Conditioning',
    status: 'Planned',
    client_id: 'c-1',
    client: {
      id: 'c-1',
      first_name: 'Ankit',
      last_name: 'Vellanki',
      uhid: 'CSH10250015',
      occupation: 'Athlete',
      sport: 'Cricket',
      is_vip: false,
    },
    therapist: { first_name: 'Varun', last_name: 'Reddy' },
  },
  {
    id: 'ind-sess-2',
    scheduled_start: '2026-10-16T08:00:00.000Z',
    session_mode: 'Individual',
    group_name: null,
    service_type: 'Consultation',
    status: 'Planned',
    client_id: 'c-2',
    client: {
      id: 'c-2',
      first_name: 'Ramesh',
      last_name: 'Kumar',
      uhid: 'CSH10250088',
      occupation: 'General Population',
      sport: null,
      is_vip: false,
    },
    therapist: { first_name: 'Varun', last_name: 'Reddy' },
  },
];

// Mock API calls
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/appointments/waitlist')) {
      return [];
    }
    if (endpoint.includes('is_unentitled=true')) {
      return [];
    }
    if (endpoint.includes('/api/appointments')) {
      return mockTodaysSessions;
    }
    if (endpoint.includes('/hr/employees')) {
      return [];
    }
    if (endpoint.includes('/api/billing/subscriptions/dunning')) {
      return [];
    }
    if (endpoint.includes('/hr/stats')) {
      return { data: { pendingApprovals: 0 } };
    }
    if (endpoint.includes('/hr/activity-tracker/automation')) {
      return { is_enabled: false, recipient_emails: '', scheduled_time: '18:00' };
    }
    if (endpoint.includes('/hr/activity-tracker/report')) {
      return {
        startDate: '2026-10-01',
        endDate: '2026-10-16',
        roleFilter: 'all',
        summary: {
          totalPlanned: 5,
          totalCompleted: 10,
          totalScheduled: 15,
          overallCompletionRate: 67,
          totalActiveStaff: 2,
          totalStaffCount: 2,
        },
        data: [],
      };
    }
    if (endpoint.includes('/hr/activity-tracker')) {
      return { date: '2026-10-16', data: [] };
    }
    return [];
  },
}));

describe('FOE Console - Today Visits Log & Time Frame Session Report Navigation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('active_console', 'foe');
  });

  it('renders "Today\'s Visits Log" with group name and Athlete/General Population indicators', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/foe']}>
          <Routes>
            <Route path="/admin/foe" element={<FOEDashboard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify 'Today\'s Visits Log' is displayed and NOT 'Today\'s Appointment Log'
    expect(screen.getByText("Today's Visits Log")).toBeInTheDocument();
    expect(screen.queryByText("Today's Appointment Log")).not.toBeInTheDocument();

    // Verify the redirect button is present
    const redirectBtn = screen.getByRole('button', { name: /Time Frame Session Report/i });
    expect(redirectBtn).toBeInTheDocument();

    // Verify group sessions display their group name properly
    await waitFor(() => {
      expect(screen.getByText('CHAMP S&C (Morning)')).toBeInTheDocument();
      expect(screen.getByText('Gen-Pop Fitness')).toBeInTheDocument();
      expect(screen.getByText('Ankit Vellanki')).toBeInTheDocument();
      expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    });

    // Verify Group badges are displayed
    const groupBadges = screen.getAllByText('Group');
    expect(groupBadges.length).toBe(2);

    // Verify Athlete and General Population badges are shown
    const athleteBadges = screen.getAllByText('Athlete');
    expect(athleteBadges.length).toBeGreaterThanOrEqual(2); // CHAMP S&C and Ankit

    const genPopBadges = screen.getAllByText('General Population');
    expect(genPopBadges.length).toBeGreaterThanOrEqual(2); // Gen-Pop Fitness and Ramesh
  });

  it('correctly classifies Athlete vs General Population via getSessionPopulationCategory helper', () => {
    expect(getSessionPopulationCategory({ group_name: 'CHAMP S&C (Morning)', session_mode: 'Group' })).toBe('Athlete');
    expect(getSessionPopulationCategory({ group_name: 'Gen-Pop Fitness', session_mode: 'Group' })).toBe('General Population');
    expect(getSessionPopulationCategory({ client: { occupation: 'Athlete' } })).toBe('Athlete');
    expect(getSessionPopulationCategory({ client: { occupation: 'General Population' } })).toBe('General Population');
    expect(getSessionPopulationCategory({ client: { sport: 'Badminton' } })).toBe('Athlete');
  });

  it('preserves FOE side nav tabs without mixing up with HR console when on session report', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/foe/session-report']}>
          <AppSidebar role="foe" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify FOE console title is displayed in the sidebar
    expect(screen.getByText('Front Office')).toBeInTheDocument();

    // Verify FOE specific tabs are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();

    // Verify HR console tabs are NOT present (no console mix-up)
    expect(screen.queryByText('HR Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Leave Approvals')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff Attendance Log')).not.toBeInTheDocument();
    expect(screen.queryByText('Day Planner')).not.toBeInTheDocument();
  });

  it('renders ActivityTracker with FOE role defaulting to Time Frame Session Report view', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/foe/session-report']}>
          <ActivityTracker role="foe" defaultTab="report" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Header should indicate Time Frame Session Report
    expect(screen.getByRole('heading', { name: /Time Frame Session Report/i })).toBeInTheDocument();
    expect(screen.getByText('Back to FOE Dashboard')).toBeInTheDocument();

    // Should be on report view and show report filter controls
    await waitFor(() => {
      expect(screen.getByText(/User Session Performance Breakdown/i)).toBeInTheDocument();
    });

    // Session storage active console must remain 'foe'
    expect(sessionStorage.getItem('active_console')).toBe('foe');
  });
});
