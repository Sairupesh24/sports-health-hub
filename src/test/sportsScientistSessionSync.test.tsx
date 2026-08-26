import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RosterScheduleView } from '../components/admin/RosterScheduleView';

// Mock Tooltip components
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

// Mock apiFetch with duplicate sports scientist sessions: one Planned and one Completed for SURYA REDDY
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/hr/employees')) {
      return [
        {
          id: 'albert-joy-id',
          first_name: 'Albert',
          last_name: 'Joy',
          profession: 'Sports Scientist',
          role: 'sports_scientist',
          avatar_url: null,
          emergency_alerts: []
        }
      ];
    }
    if (endpoint.includes('/appointments')) {
      return [
        // Duplicate session 1: Planned
        {
          id: 'session-surya-planned',
          therapist_id: 'albert-joy-id',
          scientist_id: 'albert-joy-id',
          scheduled_start: '2026-08-26T08:00:00',
          scheduled_end: '2026-08-26T09:00:00',
          session_mode: 'Individual',
          service_type: 'Training',
          status: 'Planned',
          client_id: 'surya-reddy-id',
          client: {
            id: 'surya-reddy-id',
            first_name: 'SURYA',
            last_name: 'REDDY',
            uhid: 'SR-001'
          }
        },
        // Duplicate session 2: Completed by sports scientist
        {
          id: 'session-surya-completed',
          therapist_id: 'albert-joy-id',
          scientist_id: 'albert-joy-id',
          scheduled_start: '2026-08-26T08:00:00',
          scheduled_end: '2026-08-26T09:00:00',
          actual_start: '2026-08-26T08:00:00',
          actual_end: '2026-08-26T09:00:00',
          session_mode: 'Individual',
          service_type: 'Training',
          status: 'Completed',
          client_id: 'surya-reddy-id',
          client: {
            id: 'surya-reddy-id',
            first_name: 'SURYA',
            last_name: 'REDDY',
            uhid: 'SR-001'
          }
        }
      ];
    }
    return [];
  }
}));

describe('Sports Scientist Session Synchronization & Deduplication', () => {
  it('deduplicates duplicate planned and completed sessions in the roster, showing single completed card with checkmark', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RosterScheduleView
          initialDate={new Date('2026-08-26T00:00:00Z')}
        />
      </QueryClientProvider>
    );

    // Wait for Albert Joy to appear in the staff list
    await waitFor(() => {
      expect(screen.getByText('Albert Joy')).toBeInTheDocument();
    });

    // The roster should display SURYA REDDY
    const suryaElements = await screen.findAllByText(/SURYA REDDY/i);

    // Both the card text and tooltip exist for the single session (2 elements: 1 span in card, 1 p in tooltip)
    expect(suryaElements.length).toBe(2);

    // The card should display the checkmark ✓ indicating completed status
    expect(screen.getAllByText('✓').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
  });
});
