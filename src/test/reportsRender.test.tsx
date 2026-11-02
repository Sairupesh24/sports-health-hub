import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ReportsPage from '../pages/shared/ReportsPage';

// Mock Lucide React icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
  };
});

let mockAuth = {
  profile: { id: 'admin-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925', first_name: 'Dr. Sandeep', last_name: 'S', profession: 'Sports Physician', has_analytics_access: true },
  user: { id: 'admin-user' },
  roles: ['admin']
};

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth
}));

// Mock the API utility
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string, options: any = {}) => {
    if (endpoint.includes('/analytics/reports/options')) {
      return {
        therapists: [{ id: '1', name: 'Dr. Sandeep', profession: 'Physiotherapist', role: 'consultant' }],
        sportsScientists: [{ id: '2', name: 'Dr. Coach', profession: 'Sports Scientist', role: 'sports_scientist' }],
        billingStaff: [{ id: '3', name: 'Admin Staff', role: 'admin' }],
        services: [{ id: '4', name: 'Physio Session', category: 'Physiotherapy', price: 1500 }],
        paymentMethods: ['Cash', 'UPI'],
        sessionTypes: { physiotherapy: ['Consultation'], sportsScience: ['S&C'] }
      };
    }
    return { data: [], summary: {} };
  }
}));

// Mock the hooks
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

describe('ReportsPage Render Tests', () => {
  it('should render dedicated Reporting Engine without Individual Clinical Assessment tab for admin', () => {
    mockAuth = {
      profile: { id: 'admin-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925', first_name: 'Admin', last_name: 'User', profession: 'Admin', has_analytics_access: true },
      user: { id: 'admin-user' },
      roles: ['admin']
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsPage role="admin" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Reporting Engine header
    expect(container.innerHTML).toContain('Reporting Engine');
    expect(container.innerHTML).toContain('Reports history');
    expect(container.innerHTML).toContain('Export Excel (.xlsx)');
    // Crucial requirement: No Individual Clinical Assessment tab in Reporting Engine
    expect(container.innerHTML).not.toContain('Individual Clinical Assessment');
  });

  it('should render Individual Clinical Reporting without Excel exports for clinicians without analytics access', () => {
    mockAuth = {
      profile: { id: 'physio-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925', first_name: 'Dr. John', last_name: 'Doe', profession: 'Physiotherapist', has_analytics_access: false },
      user: { id: 'physio-user' },
      roles: ['consultant']
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsPage role="consultant" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Clinician sees Individual Clinical Reporting
    expect(container.innerHTML).toContain('Individual Clinical Reporting');
    // Excel export reports and operational hub must NOT be accessible
    expect(container.innerHTML).not.toContain('Operational &amp; Excel Export Reports');
    expect(container.innerHTML).not.toContain('Export Excel (.xlsx)');
  });

  it('should render tab controls for clinicians granted analytics access', () => {
    mockAuth = {
      profile: { id: 'physio-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925', first_name: 'Dr. John', last_name: 'Doe', profession: 'Physiotherapist', has_analytics_access: true },
      user: { id: 'physio-user' },
      roles: ['consultant']
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsPage role="consultant" />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Clinician with analytics access gets both tabs
    expect(container.innerHTML).toContain('Individual Clinical Assessment');
    expect(container.innerHTML).toContain('Operational &amp; Excel Export Reports');
  });
});
