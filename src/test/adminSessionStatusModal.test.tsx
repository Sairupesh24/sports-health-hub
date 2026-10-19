import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminSessionStatusModal } from '../components/admin/AdminSessionStatusModal';

const mockApiFetch = vi.fn();
vi.mock('@/utils/api', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('AdminSessionStatusModal - Mandatory Session Timings on Completion', () => {
  const dummyPlannedSession = {
    id: 'test-session-123',
    organization_id: 'org-1',
    client_id: 'client-1',
    scheduled_start: '2026-10-12T06:00:00.000Z',
    scheduled_end: '2026-10-12T07:00:00.000Z',
    status: 'Planned',
    service_type: 'Training',
    client: { first_name: 'Jaswanth', last_name: 'R' },
    therapist: { first_name: 'Abhishek', last_name: 'V' },
  };

  const dummyCompletedSession = {
    ...dummyPlannedSession,
    status: 'Completed',
    actual_start: null,
    actual_end: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/billing/services')) return [];
      if (url.includes('/billing/entitlements/balance')) return { byServiceName: { training: 2 } };
      if (url.includes('/hr/employees')) return [];
      if (url.includes('/admin/consultant-services')) return [];
      if (url.includes('/hr/leaves')) return [];
      return {};
    });
  });

  it('does not show timing inputs when session status is Planned', () => {
    render(
      <AdminSessionStatusModal
        open={true}
        onOpenChange={vi.fn()}
        session={dummyPlannedSession}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Update Session Status')).toBeInTheDocument();
    expect(screen.queryByText(/Session Timings/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Actual Start/i)).not.toBeInTheDocument();
  });

  it('shows mandatory timing inputs and disables button when status is Completed and timings are empty', () => {
    render(
      <AdminSessionStatusModal
        open={true}
        onOpenChange={vi.fn()}
        session={dummyCompletedSession}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Session Timings/i)).toBeInTheDocument();
    expect(screen.getByText('Mandatory')).toBeInTheDocument();
    expect(screen.getByText(/Both start and end timings are mandatory to mark as Completed/i)).toBeInTheDocument();

    const startInput = screen.getByLabelText(/Actual Start \*/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Actual End \*/i) as HTMLInputElement;
    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();
    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');

    const completeButton = screen.getByRole('button', { name: /Complete Session/i });
    expect(completeButton).toBeDisabled();
  });

  it('allows prefilling scheduled timings and validates end time > start time', () => {
    render(
      <AdminSessionStatusModal
        open={true}
        onOpenChange={vi.fn()}
        session={dummyCompletedSession}
        onSuccess={vi.fn()}
      />
    );

    // Click "Prefill Scheduled"
    const prefillBtn = screen.getByRole('button', { name: /Prefill Scheduled/i });
    fireEvent.click(prefillBtn);

    const startInput = screen.getByLabelText(/Actual Start \*/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Actual End \*/i) as HTMLInputElement;

    // Prefilled values
    expect(startInput.value).toBeTruthy();
    expect(endInput.value).toBeTruthy();

    // Now test entering invalid times: end time earlier than start time
    fireEvent.change(startInput, { target: { value: '11:00' } });
    fireEvent.change(endInput, { target: { value: '10:00' } });

    expect(screen.getByText(/Actual end time must be after start time/i)).toBeInTheDocument();
    const completeButton = screen.getByRole('button', { name: /Complete Session/i });
    expect(completeButton).toBeDisabled();

    // Fix timings: valid start and end
    fireEvent.change(startInput, { target: { value: '09:00' } });
    fireEvent.change(endInput, { target: { value: '10:00' } });

    expect(screen.queryByText(/Actual end time must be after start time/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Both start and end timings are mandatory/i)).not.toBeInTheDocument();
    expect(completeButton).not.toBeDisabled();
  });

  it('successfully calls /complete API with entered actual start and end ISO strings', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AdminSessionStatusModal
        open={true}
        onOpenChange={onOpenChange}
        session={dummyCompletedSession}
        onSuccess={onSuccess}
      />
    );

    const startInput = screen.getByLabelText(/Actual Start \*/i);
    const endInput = screen.getByLabelText(/Actual End \*/i);

    fireEvent.change(startInput, { target: { value: '09:15' } });
    fireEvent.change(endInput, { target: { value: '10:15' } });

    const completeButton = screen.getByRole('button', { name: /Complete Session/i });
    expect(completeButton).not.toBeDisabled();

    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        `/appointments/${dummyCompletedSession.id}/complete`,
        expect.objectContaining({
          method: 'POST',
          data: expect.objectContaining({
            actual_start: expect.any(String),
            actual_end: expect.any(String),
          }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows default locations CSSH, HPL, PGBA Ground and allows selecting or entering new location', async () => {
    mockApiFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/appointments/locations') && options?.method === 'POST') {
        return { success: true, name: options.data.name };
      }
      if (url.includes('/appointments/locations')) return ['CSSH', 'HPL', 'PGBA Ground'];
      if (url.includes('/billing/services')) return [];
      if (url.includes('/billing/entitlements/balance')) return { byServiceName: { training: 2 } };
      if (url.includes('/hr/employees')) return [];
      if (url.includes('/admin/consultant-services')) return [];
      if (url.includes('/hr/leaves')) return [];
      return {};
    });

    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AdminSessionStatusModal
        open={true}
        onOpenChange={onOpenChange}
        session={dummyCompletedSession}
        onSuccess={onSuccess}
      />
    );

    // Location input should be present
    const locationInput = screen.getByPlaceholderText(/Type or search location/i) as HTMLInputElement;
    expect(locationInput).toBeInTheDocument();

    // Focus input - default locations should be visible
    fireEvent.focus(locationInput);
    await waitFor(() => {
      expect(screen.getByText('CSSH')).toBeInTheDocument();
      expect(screen.getByText('HPL')).toBeInTheDocument();
      expect(screen.getByText('PGBA Ground')).toBeInTheDocument();
    });

    // Select CSSH from dropdown
    fireEvent.mouseDown(screen.getByText('CSSH'));
    expect(locationInput.value).toBe('CSSH');

    // Fill start and end times
    const startInput = screen.getByLabelText(/Actual Start \*/i);
    const endInput = screen.getByLabelText(/Actual End \*/i);
    fireEvent.change(startInput, { target: { value: '09:00' } });
    fireEvent.change(endInput, { target: { value: '10:00' } });

    const completeButton = screen.getByRole('button', { name: /Complete Session/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        `/appointments/${dummyCompletedSession.id}/complete`,
        expect.objectContaining({
          method: 'POST',
          data: expect.objectContaining({
            session_location: 'CSSH',
          }),
        })
      );
    });
  });

  it('persists newly entered custom location to /appointments/locations for future use', async () => {
    mockApiFetch.mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/appointments/locations') && options?.method === 'POST') {
        return { success: true, name: options.data.name };
      }
      if (url.includes('/appointments/locations')) return ['CSSH', 'HPL', 'PGBA Ground'];
      if (url.includes('/billing/services')) return [];
      if (url.includes('/billing/entitlements/balance')) return { byServiceName: { training: 2 } };
      if (url.includes('/hr/employees')) return [];
      if (url.includes('/admin/consultant-services')) return [];
      if (url.includes('/hr/leaves')) return [];
      return {};
    });

    render(
      <AdminSessionStatusModal
        open={true}
        onOpenChange={vi.fn()}
        session={dummyCompletedSession}
        onSuccess={vi.fn()}
      />
    );

    const locationInput = screen.getByPlaceholderText(/Type or search location/i) as HTMLInputElement;
    fireEvent.focus(locationInput);
    fireEvent.change(locationInput, { target: { value: 'Badminton Court 1' } });

    // Expect "Use Badminton Court 1 as location" option to appear
    await waitFor(() => {
      expect(screen.getByText(/Use "Badminton Court 1" as location/i)).toBeInTheDocument();
    });

    // Click to select the new location
    fireEvent.mouseDown(screen.getByText(/Use "Badminton Court 1" as location/i));
    expect(locationInput.value).toBe('Badminton Court 1');

    // Verifies that POST /appointments/locations was called to store for future use
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/appointments/locations',
        expect.objectContaining({
          method: 'POST',
          data: { name: 'Badminton Court 1' }
        })
      );
    });
  });
});

