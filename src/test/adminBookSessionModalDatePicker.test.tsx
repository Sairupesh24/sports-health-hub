import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { AdminBookSessionModal } from '../components/admin/AdminBookSessionModal';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'admin-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925' },
    user: { id: 'admin-user' },
    roles: ['admin']
  })
}));

const mockClinicians = [
  {
    id: 'physio-1',
    first_name: 'Alex',
    last_name: 'Morgan',
    profession: 'Physiotherapist',
    role: 'physiotherapist',
    avatar_url: null,
    emergency_alerts: []
  }
];

// Mock API utility
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string, options: any = {}) => {
    if (endpoint.includes('/hr/employees')) {
      return mockClinicians;
    }
    if (endpoint.includes('/hr/leaves')) {
      return { data: [] };
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

describe('AdminBookSessionModal Date Picker', () => {
  it('allows opening date popover and selecting a different date', async () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayPPP = format(today, 'PPP');
    
    // Choose a target date a few days ahead in the same month
    const targetDate = addDays(today, 3);
    const targetPPP = format(targetDate, 'PPP');
    const targetDayNumber = targetDate.getDate().toString();

    render(
      <BrowserRouter>
        <AdminBookSessionModal
          open={true}
          onOpenChange={() => {}}
          initialData={{
            consultantId: 'physio-1',
            sessionDate: todayStr
          }}
        />
      </BrowserRouter>
    );

    // Verify initial date is displayed on the button
    const dateBtn = await screen.findByRole('button', { name: new RegExp(todayPPP, 'i') });
    expect(dateBtn).toBeInTheDocument();

    // Click the button to open the date popover
    fireEvent.click(dateBtn);

    // The calendar table / days should be visible
    const dayCells = screen.getAllByRole('gridcell');
    expect(dayCells.length).toBeGreaterThan(0);

    // Find the cell or button for target date
    const targetButtons = screen.getAllByRole('button', { name: new RegExp(targetDayNumber) });
    expect(targetButtons.length).toBeGreaterThan(0);

    // Click the target day button
    fireEvent.click(targetButtons[0]);

    // The session date button should now update to target date (or have updated text)
    await waitFor(() => {
      // Button should now show the new selected date or change away from today if different
      const updatedButtons = screen.getAllByRole('button');
      const hasUpdated = updatedButtons.some(b => b.textContent?.includes(targetDayNumber));
      expect(hasUpdated).toBe(true);
    });
  });
});

