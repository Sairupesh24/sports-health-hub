import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConsoleAccess from '@/pages/admin/ConsoleAccess';
import { APP_MODULES } from '@/config/appModules';

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'admin-1', first_name: 'Clinic', last_name: 'Admin', role: 'admin', organization_id: 'org-1' },
    user: { id: 'admin-1' },
    roles: ['admin'],
    refreshAuth: vi.fn(),
  }),
}));

vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string) => {
    if (endpoint.includes('/hr/users')) {
      return {
        data: [
          {
            id: 'staff-1',
            first_name: 'Rudra',
            last_name: 'Rupanagudi',
            email: 'rupanagudir0@gmail.com',
            current_role: 'sports_scientist',
            profession: 'Sports Scientist',
            allowed_consoles: ['sports_scientist', 'ams', 'knowledge_base', 'super_admin'],
            is_approved: true,
          },
          {
            id: 'sa-1',
            first_name: 'Super',
            last_name: 'Admin',
            email: 'admin@ishpo.local',
            current_role: 'super_admin',
            is_approved: true,
          },
        ],
      };
    }
    return { data: [] };
  },
}));

describe('Super Admin exclusion from Console Access Management', () => {
  it('excludes super_admin from APP_MODULES organization console list', () => {
    expect(APP_MODULES.some((m) => m.id === 'super_admin')).toBe(false);
    expect(APP_MODULES.some((m) => m.name.toLowerCase().includes('super admin'))).toBe(false);
  });

  it('does not render Super Admin Console in the console access grid and filters super_admin users', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/settings/console-access']}>
        <ConsoleAccess />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Rudra Rupanagudi/i).length).toBeGreaterThan(0);
    });

    // Super Admin Console card must never appear in the grid
    expect(screen.queryByText(/Super Admin Console/i)).not.toBeInTheDocument();

    // Admin Console and other org consoles are present
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
    expect(screen.getByText('Leads & CRM Console')).toBeInTheDocument();

    // Super Admin account must not appear in organization Staff Directory
    expect(screen.queryByText('admin@ishpo.local')).not.toBeInTheDocument();

    // Active total should reflect only organization modules (APP_MODULES.length)
    expect(screen.getByText(new RegExp(`of ${APP_MODULES.length} Active`, 'i'))).toBeInTheDocument();
  });
});
