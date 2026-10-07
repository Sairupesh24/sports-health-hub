import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityTracker from '../pages/hr/ActivityTracker';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', role: 'admin' },
    profile: { id: 'test-user-id', first_name: 'Admin', role: 'admin', organization_id: 'org-1' },
  }),
}));

// Mock apiFetch
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/hr/activity-tracker/automation')) {
      return { is_enabled: false, recipient_emails: '', scheduled_time: '18:00' };
    }
    if (endpoint.includes('/hr/activity-tracker/report')) {
      return {
        startDate: '2026-08-01',
        endDate: '2026-10-07',
        roleFilter: 'all',
        summary: {
          totalPlanned: 15,
          totalCompleted: 20,
          totalScheduled: 35,
          overallCompletionRate: 57,
          totalActiveStaff: 3,
          totalStaffCount: 3,
        },
        data: [
          {
            id: 'staff-1',
            name: 'Dr. Raja Prasad',
            email: 'raja@example.com',
            role: 'sports_physician',
            profession: 'Sports Physician',
            plannedSessions: 14,
            completedSessions: 9,
            totalScheduled: 23,
            completionRate: 39,
            activeMinutes: 120,
            registrationsCount: 0,
            sessions: [
              {
                id: 'sess-1',
                status: 'Completed',
                scheduledStart: '2026-09-20T10:00:00Z',
                serviceType: 'Consultation',
                sessionMode: 'Individual',
                clientName: 'Rahul Lokesh',
                uhid: 'CSH001',
              },
              {
                id: 'sess-2',
                status: 'Planned',
                scheduledStart: '2026-10-08T10:00:00Z',
                serviceType: 'Consultation',
                sessionMode: 'Individual',
                clientName: 'Sunanda M',
                uhid: 'CSH002',
              },
            ],
          },
          {
            id: 'staff-2',
            name: 'Sai Pavan',
            email: 'pavan@example.com',
            role: 'physiotherapist',
            profession: 'Physiotherapist',
            plannedSessions: 1,
            completedSessions: 11,
            totalScheduled: 12,
            completionRate: 92,
            activeMinutes: 300,
            registrationsCount: 0,
            sessions: [],
          },
        ],
      };
    }
    if (endpoint.includes('/hr/activity-tracker')) {
      return {
        date: '2026-10-07',
        data: [
          {
            id: 'staff-1',
            name: 'Dr. Raja Prasad',
            email: 'raja@example.com',
            role: 'sports_physician',
            profession: 'Sports Physician',
            activeMinutes: 45,
            sessionsCount: 2,
            plannedSessionsCount: 3,
            registrationsCount: 0,
          },
        ],
      };
    }
    return {};
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/hr/activity-tracker' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe('ActivityTracker Component - Time Frame Report Extension', () => {
  it('renders Activity Tracker and allows switching to Time Frame Session Report view', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ActivityTracker />
      </QueryClientProvider>
    );

    // Verify Daily View rendered initially
    expect(screen.getByText(/Activity Tracker & Performance Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Live Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Time Frame Session Report/i)).toBeInTheDocument();

    // Switch to Time Frame Session Report tab
    const reportTabBtn = screen.getByText(/Time Frame Session Report/i);
    fireEvent.click(reportTabBtn);

    // Wait for Time Frame report to load
    await waitFor(() => {
      expect(screen.getByText(/User Session Performance Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText('Dr. Raja Prasad')).toBeInTheDocument();
    });

    // Check Planned and Completed badges are present
    expect(screen.getByText('14 Planned')).toBeInTheDocument();
    expect(screen.getByText('9 Completed')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument(); // total scheduled
    expect(screen.getByText('39%')).toBeInTheDocument(); // completion rate

    // Check second staff member
    expect(screen.getByText('Sai Pavan')).toBeInTheDocument();
    expect(screen.getByText('1 Planned')).toBeInTheDocument();
    expect(screen.getByText('11 Completed')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();

    // Check Drill-down session button
    const viewBtn = screen.getByText(/View \(2\)/i);
    expect(viewBtn).toBeInTheDocument();
    fireEvent.click(viewBtn);

    // Verify Session detail dialog opened with client session details
    await waitFor(() => {
      expect(screen.getByText('Rahul Lokesh')).toBeInTheDocument();
      expect(screen.getByText('Sunanda M')).toBeInTheDocument();
      expect(screen.getByText('CSH001')).toBeInTheDocument();
    });
  });
});
