import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { format } from 'date-fns';
import AdminCalendar from '../pages/admin/AdminCalendar';
import { AdminBookSessionModal } from '../components/admin/AdminBookSessionModal';
import { RosterScheduleView } from '../components/admin/RosterScheduleView';

// Mock Lucide React
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
  };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'admin-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925' },
    user: { id: 'admin-user' },
    roles: ['admin']
  })
}));

const mockTodayStr = format(new Date(), 'yyyy-MM-dd');

const mockClinicians = [
  {
    id: 'physio-1',
    first_name: 'Alex',
    last_name: 'Morgan',
    profession: 'Physiotherapist',
    avatar_url: null,
    emergency_alerts: []
  },
  {
    id: 'physician-1',
    first_name: 'David',
    last_name: 'Beckham',
    profession: 'Sports Physician',
    avatar_url: null,
    emergency_alerts: []
  }
];

const mockLeaves = [
  {
    id: 'leave-1',
    organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925',
    employee_id: 'physio-1',
    first_name: 'Alex',
    last_name: 'Morgan',
    leave_type: 'Annual Leave',
    start_date: mockTodayStr,
    end_date: mockTodayStr,
    status: 'Approved',
    reason: 'Vacation'
  }
];

// Mock API utility
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string, options: any = {}) => {
    if (endpoint.includes('/hr/employees')) {
      return mockClinicians;
    }
    if (endpoint.includes('/hr/leaves')) {
      return { data: mockLeaves };
    }
    if (endpoint.includes('/appointments')) {
      return [];
    }
    if (endpoint.includes('/staff-schedules')) {
      return [];
    }
    if (endpoint.includes('/settings')) {
      return { default_slot_duration: 60, working_hours_start: '08:00:00', working_hours_end: '17:00:00' };
    }
    if (endpoint.includes('/waitlist')) {
      return [];
    }
    if (endpoint.includes('/emergencies')) {
      return { data: [] };
    }
    if (endpoint.includes('/clients')) {
      return [{ id: 'client-1', first_name: 'John', last_name: 'Doe', uhid: 'U12345' }];
    }
    if (endpoint.includes('/services')) {
      return [{ id: 'svc-1', name: 'Physiotherapy Assessment', category: 'Clinical', duration: 60 }];
    }
    if (endpoint.includes('/consultant-services')) {
      return [{ consultant_id: 'physio-1', service_id: 'svc-1' }];
    }
    return [];
  }
}));

describe('Staff Leave & Master Schedule Linking', () => {
  it('displays On Leave in AdminCalendar column header and overlay when clinician has approved leave', async () => {
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

    await waitFor(() => {
      // Alex Morgan (Physiotherapist) is on leave
      expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
      // Should display "On Leave" badge in header
      const onLeaveBadges = screen.getAllByText(/On Leave/i);
      expect(onLeaveBadges.length).toBeGreaterThan(0);
      // Should show the overlay banner "Staff On Leave"
      expect(screen.getByText(/Staff On Leave/i)).toBeInTheDocument();
    });
  });

  it('renders On Leave indicator and warning in AdminBookSessionModal when practitioner on leave is selected', async () => {
    render(
      <BrowserRouter>
        <AdminBookSessionModal
          open={true}
          onOpenChange={() => {}}
          initialData={{
            consultantId: 'physio-1',
            sessionDate: mockTodayStr
          }}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show the warning banner indicating specialist is on leave
      expect(screen.getByText(/Specialist On Leave/i)).toBeInTheDocument();
      expect(screen.getByText(/All time slots are blocked and unavailable for booking/i)).toBeInTheDocument();
      // Available quick-pick slots should not show
      expect(screen.queryByText(/Available Slots \(Quick-Pick\)/i)).not.toBeInTheDocument();
    });
  });

  it('renders On Leave pill and overlay in RosterScheduleView', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RosterScheduleView initialDate={new Date()} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
      // Should display "On Leave" in staff row
      const onLeaveElements = screen.getAllByText(/On Leave/i);
      expect(onLeaveElements.length).toBeGreaterThan(0);
    });
  });
});
