import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ReportsHubView from '../pages/admin/analytics/ReportsHubView';
import * as excelExportModule from '../utils/excelExport';

// Mock excel export functions
vi.mock('../utils/excelExport', async (importOriginal) => {
  const actual = await importOriginal<typeof excelExportModule>();
  return {
    ...actual,
    exportToExcel: vi.fn().mockResolvedValue(undefined),
    exportToExcelMultiSheet: vi.fn().mockResolvedValue(undefined),
    exportToCSV: vi.fn(),
  };
});

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'admin-1',
      organization_id: 'org-test',
      first_name: 'Dr. Sandeep',
      last_name: 'S',
      profession: 'Sports Physician',
      has_analytics_access: true,
    },
    user: { id: 'admin-user' },
    roles: ['admin'],
  }),
}));

const mockOptions = {
  therapists: [
    { id: 'therapist-1', name: 'Dr. Sandeep S', profession: 'Physiotherapist', role: 'consultant' },
    { id: 'therapist-2', name: 'Dr. Priya Rao', profession: 'Physiotherapist', role: 'physiotherapist' },
  ],
  sportsScientists: [
    { id: 'scientist-1', name: 'Aditi Mazumdar', profession: 'Sports Scientist', role: 'sports_scientist' },
    { id: 'scientist-2', name: 'Vikram Singh', profession: 'Strength & Conditioning Coach', role: 'sports_scientist' },
  ],
  billingStaff: [],
  services: [],
  paymentMethods: ['Cash', 'UPI'],
  sessionTypes: { physiotherapy: ['Consultation'], sportsScience: ['S&C'] },
  groups: [],
};

const mockSessionsData = [
  // Aditi Mazumdar sessions (Sports Scientist)
  {
    session_id: 's1',
    staff_id: 'scientist-1',
    staff_name: 'Aditi Mazumdar',
    staff_profession: 'Sports Scientist',
    client_id: 'client-1',
    client_uhid: 'UHID-001',
    client_name: 'Rahul Lokesh',
    client_sport: 'Badminton',
    duration_minutes: 60,
    status: 'Completed',
    scheduled_start: '2026-11-02T10:00:00Z',
  },
  {
    session_id: 's2',
    staff_id: 'scientist-1',
    staff_name: 'Aditi Mazumdar',
    staff_profession: 'Sports Scientist',
    client_id: 'client-1',
    client_uhid: 'UHID-001',
    client_name: 'Rahul Lokesh',
    client_sport: 'Badminton',
    duration_minutes: 60,
    status: 'Completed',
    scheduled_start: '2026-11-04T10:00:00Z',
  },
  {
    session_id: 's3',
    staff_id: 'scientist-1',
    staff_name: 'Aditi Mazumdar',
    staff_profession: 'Sports Scientist',
    client_id: 'client-2',
    client_uhid: 'UHID-002',
    client_name: 'Toshith Makki',
    client_sport: 'Cricket',
    duration_minutes: 45,
    status: 'Completed',
    scheduled_start: '2026-11-05T11:00:00Z',
  },
  // Vikram Singh sessions (Sports Scientist)
  {
    session_id: 's4',
    staff_id: 'scientist-2',
    staff_name: 'Vikram Singh',
    staff_profession: 'Strength & Conditioning Coach',
    client_id: 'client-3',
    client_uhid: 'UHID-003',
    client_name: 'Ananya Sharma',
    client_sport: 'Tennis',
    duration_minutes: 90,
    status: 'Completed',
    scheduled_start: '2026-11-06T14:00:00Z',
  },
  // Dr. Sandeep S session (Physiotherapist)
  {
    session_id: 's5',
    staff_id: 'therapist-1',
    staff_name: 'Dr. Sandeep S',
    staff_profession: 'Physiotherapist',
    client_id: 'client-1',
    client_uhid: 'UHID-001',
    client_name: 'Rahul Lokesh',
    client_sport: 'Badminton',
    duration_minutes: 45,
    status: 'Completed',
    scheduled_start: '2026-11-07T09:00:00Z',
  },
];

// Mock API
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/analytics/reports/options')) {
      return mockOptions;
    }
    if (endpoint.includes('/analytics/reports/sessions')) {
      return {
        module: 'sports_science',
        reportTitle: 'Sports Science Sessions Report',
        data: mockSessionsData,
        summary: {
          totalSessions: 5,
          completedSessions: 5,
          cancelledSessions: 0,
          totalDurationHours: 5,
          avgDurationMinutes: 60,
          uniqueClientsCount: 3,
        },
        staffBreakdown: [
          {
            staffId: 'scientist-1',
            staffName: 'Aditi Mazumdar',
            profession: 'Sports Scientist',
            totalSessions: 3,
            completedSessions: 3,
            cancelledSessions: 0,
            totalDurationHours: 2.8,
            uniqueClientsCount: 2,
          },
          {
            staffId: 'scientist-2',
            staffName: 'Vikram Singh',
            profession: 'Strength & Conditioning Coach',
            totalSessions: 1,
            completedSessions: 1,
            cancelledSessions: 0,
            totalDurationHours: 1.5,
            uniqueClientsCount: 1,
          },
        ],
        clientBreakdown: [
          {
            clientId: 'client-1',
            clientUhid: 'UHID-001',
            clientName: 'Rahul Lokesh',
            totalSessions: 3,
            completedSessions: 3,
            cancelledSessions: 0,
            totalDurationHours: 2.8,
          },
        ],
      };
    }
    return { data: [], summary: {} };
  },
}));

describe('Reporting Engine - Practitioner Grouping Export & Views', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('displays "Group by Sports Scientist" report with required client columns and directly exports multi-sheet workbook without modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsHubView initialModule="Sports Science" initialReport="group-by-sports-scientist" role="admin" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for query to resolve and practitioner data rows to render on screen
    await waitFor(() => {
      expect(screen.getAllByText(/Aditi Mazumdar/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Group by Sports Scientist: Client Sessions & Hours/i)).toBeInTheDocument();

    // Verify all required table column headers are rendered
    expect(screen.getByText('Sports Scientist Name')).toBeInTheDocument();
    expect(screen.getByText('Client UHID')).toBeInTheDocument();
    expect(screen.getByText('Client Name')).toBeInTheDocument();
    expect(screen.getByText('Hours Spent on Client')).toBeInTheDocument();
    expect(screen.getByText('Sessions Completed for Client')).toBeInTheDocument();
    expect(screen.getAllByText('Total Sessions').length).toBeGreaterThan(0);
    expect(screen.getByText('Average Time Spent on Client (sessions/hours spent)')).toBeInTheDocument();

    // Verify practitioner client data rows
    expect(screen.getAllByText(/Rahul Lokesh/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Toshith Makki/i)).toBeInTheDocument();

    // Click Export Excel directly from header
    const exportBtn = screen.getByRole('button', { name: /Export Excel \(\.xlsx\)/i });
    fireEvent.click(exportBtn);

    // Verify export is triggered immediately WITHOUT opening any pop-up modal
    expect(screen.queryByText(/Choose how you would like the exported session records to be grouped/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(excelExportModule.exportToExcelMultiSheet).toHaveBeenCalled();
    });

    const callArgs = (excelExportModule.exportToExcelMultiSheet as any).mock.calls[0][0];
    expect(callArgs.filename).toContain('Sports_Science_By_Scientist');
    expect(callArgs.sheets).toHaveLength(2);

    // Sheet 1: Aditi Mazumdar
    const sheet1 = callArgs.sheets.find((s: any) => s.sheetName === 'Aditi Mazumdar');
    expect(sheet1).toBeDefined();
    expect(sheet1.title).toContain('Aditi Mazumdar');

    // Verify columns inside Sheet 1
    const columnHeaders = sheet1.columns.map((c: any) => c.header);
    expect(columnHeaders).toContain('Sports Scientist Name');
    expect(columnHeaders).toContain('Client UHID');
    expect(columnHeaders).toContain('Client Name');
    expect(columnHeaders).toContain('Hours Spent on Client');
    expect(columnHeaders).toContain('Sessions Completed for Client');
    expect(columnHeaders).toContain('Average Time Spent on Client (sessions/hours spent)');

    // Verify data rows inside Sheet 1 (Rahul Lokesh & Toshith Makki)
    expect(sheet1.data).toHaveLength(2);
    const rahulRow = sheet1.data.find((d: any) => d.clientName === 'Rahul Lokesh');
    expect(rahulRow).toBeDefined();
    expect(rahulRow.staffName).toBe('Aditi Mazumdar');
    expect(rahulRow.hoursSpent).toBe(2.0); // 120 mins = 2.0 hrs
    expect(rahulRow.completedSessions).toBe(2);
    // avgTimeSpent: 2.0 hrs / 2 sessions = 1.0 hr (60 mins)
    expect(rahulRow.avgTimeSpent).toContain('1 hrs (60 mins)');

    // Sheet 2: Vikram Singh
    const sheet2 = callArgs.sheets.find((s: any) => s.sheetName === 'Vikram Singh');
    expect(sheet2).toBeDefined();
    expect(sheet2.data).toHaveLength(1);
    const ananyaRow = sheet2.data[0];
    expect(ananyaRow.clientName).toBe('Ananya Sharma');
    expect(ananyaRow.hoursSpent).toBe(1.5); // 90 mins = 1.5 hrs
    expect(ananyaRow.completedSessions).toBe(1);
  });

  it('displays "Group by Physiotherapist" report with required client columns and directly exports multi-sheet workbook without modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsHubView initialModule="Physiotherapy" initialReport="group-by-physiotherapist" role="admin" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for query to resolve and therapist data rows to render on screen
    await waitFor(() => {
      expect(screen.getAllByText(/Dr\. Sandeep S/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Group by Physiotherapist: Client Sessions & Hours/i)).toBeInTheDocument();
    expect(screen.getByText('Physiotherapist Name')).toBeInTheDocument();
    expect(screen.getByText('Client UHID')).toBeInTheDocument();
    expect(screen.getByText('Client Name')).toBeInTheDocument();
    expect(screen.getByText('Hours Spent on Client')).toBeInTheDocument();
    expect(screen.getByText('Sessions Completed for Client')).toBeInTheDocument();
    expect(screen.getByText('Average Time Spent on Client (sessions/hours spent)')).toBeInTheDocument();

    // Click Export Excel directly from header
    const exportBtn = screen.getByRole('button', { name: /Export Excel \(\.xlsx\)/i });
    fireEvent.click(exportBtn);

    // No modal should appear
    expect(screen.queryByText(/Choose how you would like the exported session records to be grouped/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(excelExportModule.exportToExcelMultiSheet).toHaveBeenCalled();
    });

    const callArgs = (excelExportModule.exportToExcelMultiSheet as any).mock.calls[0][0];
    expect(callArgs.filename).toContain('Physiotherapy_By_Therapist');
    expect(callArgs.sheets).toHaveLength(1);

    const sheet1 = callArgs.sheets[0];
    expect(sheet1.sheetName).toBe('Dr. Sandeep S');
    const columnHeaders = sheet1.columns.map((c: any) => c.header);
    expect(columnHeaders).toContain('Physiotherapist Name');
    expect(columnHeaders).toContain('Client Name');
    expect(columnHeaders).toContain('Hours Spent on Client');
    expect(columnHeaders).toContain('Sessions Completed for Client');
    expect(columnHeaders).toContain('Average Time Spent on Client (sessions/hours spent)');
  });

  it('renders "Group by Client ID" report in Client module and directly exports consolidated summary', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsHubView initialModule="Client" initialReport="group-by-client-id" role="admin" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Wait for query to resolve and client data to render
    await waitFor(() => {
      expect(screen.getAllByText(/Rahul Lokesh/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Client Sessions & Hours Summary/i)).toBeInTheDocument();
    expect(screen.getByText('Client UHID')).toBeInTheDocument();
    expect(screen.getByText('Client Name')).toBeInTheDocument();
    expect(screen.getByText('Sport / Category')).toBeInTheDocument();
    expect(screen.getAllByText('Total Sessions').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Hours')).toBeInTheDocument();

    // Click Export Excel button
    const exportBtn = screen.getByRole('button', { name: /Export Excel \(\.xlsx\)/i });
    fireEvent.click(exportBtn);

    // No modal should appear
    expect(screen.queryByText(/Choose how you would like the exported session records to be grouped/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(excelExportModule.exportToExcel).toHaveBeenCalled();
    });

    const callArgs = (excelExportModule.exportToExcel as any).mock.calls[0][0];
    expect(callArgs.filename).toContain('Client_Sessions_Summary');
    expect(callArgs.sheetName).toBe('Client Sessions Summary');
  });
});
