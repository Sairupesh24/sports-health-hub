import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RosterScheduleView } from '../components/admin/RosterScheduleView';

// Mock the TooltipProvider so tooltip tests don't blow up
vi.mock('@/components/ui/tooltip', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TooltipProvider: ({ children }: any) => <div>{children}</div>,
    Tooltip: ({ children }: any) => <div>{children}</div>,
    TooltipTrigger: ({ children }: any) => <div>{children}</div>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
  };
});

// Mock apiFetch
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string, options: any = {}) => {
    if (endpoint.includes('/hr/employees')) {
      return [
        {
          id: 'staff-aditi',
          first_name: 'Aditi',
          last_name: 'Mazumdar',
          profession: 'Sports Scientist',
          role: 'sports_scientist'
        }
      ];
    }
    if (endpoint.includes('/appointments')) {
      return [
        {
          id: 'session-group-1',
          therapist_id: 'staff-aditi',
          scheduled_start: '2026-08-26T06:30:00.000Z',
          scheduled_end: '2026-08-26T07:30:00.000Z',
          session_mode: 'Group',
          group_name: 'Senior Badminton Squad',
          service_type: 'Group Session',
          status: 'Planned',
          client_id: null,
          client: null
        },
        {
          id: 'session-guest-1',
          therapist_id: 'staff-aditi',
          scheduled_start: '2026-08-26T08:00:00.000Z',
          scheduled_end: '2026-08-26T09:00:00.000Z',
          session_mode: 'Individual',
          guest_name: 'John Doe',
          service_type: 'Device Assessment',
          status: 'Planned',
          client_id: null,
          client: null
        },
        {
          id: 'session-group-unnamed',
          therapist_id: 'staff-aditi',
          scheduled_start: '2026-08-26T10:00:00.000Z',
          scheduled_end: '2026-08-26T11:00:00.000Z',
          session_mode: 'Group',
          group_name: null,
          service_type: 'Group Session',
          status: 'Planned',
          client_id: null,
          client: null
        }
      ];
    }
    return [];
  }
}));

describe('RosterScheduleView Group Session Name Display', () => {
  it('should display the group name for group sessions instead of GUEST', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RosterScheduleView initialDate={new Date('2026-08-26T00:00:00Z')} />
      </QueryClientProvider>
    );

    // Wait for staff name to be visible
    await waitFor(() => {
      expect(screen.getByText('Aditi Mazumdar')).toBeInTheDocument();
    });

    // The group session group name should be displayed!
    await waitFor(() => {
      const groupNameElements = screen.getAllByText(/Senior Badminton Squad/i);
      expect(groupNameElements.length).toBeGreaterThan(0);
    });

    // Guest with guest_name should show guest name
    await waitFor(() => {
      const guestElements = screen.getAllByText(/John Doe/i);
      expect(guestElements.length).toBeGreaterThan(0);
    });

    // Group session with null group_name should fall back to Group Session (NOT Guest)
    await waitFor(() => {
      const fallbackElements = screen.getAllByText(/Group Session/i);
      expect(fallbackElements.length).toBeGreaterThan(0);
    });
  });
});
