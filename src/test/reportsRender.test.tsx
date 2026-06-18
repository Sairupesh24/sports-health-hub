import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ReportsPage from '../pages/shared/ReportsPage';

// Mock Lucide React icons because they can cause issues in testing environments
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
  };
});

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'admin-prof', organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925', first_name: 'Dr. Sandeep', last_name: 'S', profession: 'Sports Physician' },
    user: { id: 'admin-user' },
    roles: ['admin']
  })
}));

// Mock the API utility
vi.mock('@/utils/api', () => ({
  apiFetch: async (endpoint: string, options: any = {}) => {
    return [];
  }
}));

// Mock the hooks
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

describe('ReportsPage Render Test', () => {
  it('should render without throwing errors', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportsPage role="consultant" />
        </BrowserRouter>
      </QueryClientProvider>
    );
    expect(container.innerHTML).toContain('Module Under Progress');
    console.log("RENDER SUCCESSFUL! HTML length:", container.innerHTML.length);
  });
});
