import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuditLogsViewer from '@/components/admin/AuditLogsViewer';

const mockLogs = [
  {
    id: 'b1f09e20-3304-4b55-a0bc-123456789abc',
    organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925',
    entity_type: 'user_access',
    entity_id: 'e2a1b3c4-d5e6-7890-abcd-ef1234567890',
    action: 'role_changed',
    performed_by: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    details: {
      target_user_name: 'Dr. Rahul Sharma',
      target_user_email: 'rahul@example.com',
      actor_name: 'Super Admin',
      actor_email: 'admin@example.com',
      summary: 'Role changed from "user" to "consultant"'
    },
    created_at: new Date().toISOString(),
    actor_name: 'Super Admin',
    actor_email: 'admin@example.com',
    actor_role: 'admin',
    target_name: 'Dr. Rahul Sharma',
    target_email: 'rahul@example.com',
    target_role: 'consultant'
  },
  {
    id: 'c2f09e20-3304-4b55-a0bc-123456789def',
    organization_id: 'd735732c-5951-45e6-bb16-7668b8a95925',
    entity_type: 'user',
    entity_id: 'f3a1b3c4-d5e6-7890-abcd-ef1234567891',
    action: 'created_and_approved',
    performed_by: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    details: {
      target_user_name: 'Priya Patel',
      target_user_email: 'priya@example.com',
      actor_name: 'Super Admin',
      actor_email: 'admin@example.com',
      summary: 'User account created and approved'
    },
    created_at: new Date().toISOString(),
    actor_name: 'Super Admin',
    actor_email: 'admin@example.com',
    actor_role: 'admin',
    target_name: 'Priya Patel',
    target_email: 'priya@example.com',
    target_role: 'clinical'
  }
];

const mockStats = {
  total_events: 15,
  role_events: 8,
  console_events: 4,
  feature_events: 2,
  status_events: 1
};

vi.mock('@/utils/api', () => ({
  apiFetch: vi.fn(async (endpoint: string) => {
    if (endpoint.includes('/hr/audit-logs')) {
      return {
        success: true,
        data: mockLogs,
        pagination: { total: 2, page: 1, limit: 25, totalPages: 1 },
        stats: mockStats
      };
    }
    return { success: true };
  })
}));

describe('AuditLogsViewer Component', () => {
  it('loads and renders audit trail logs and quick stat counters', async () => {
    render(<AuditLogsViewer />);

    // Check loading goes away and metrics display
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument(); // total_events
    });

    expect(screen.getByText('8')).toBeInTheDocument(); // role_events
    expect(screen.getByText('4')).toBeInTheDocument(); // console_events
    expect(screen.getByText('2')).toBeInTheDocument(); // feature_events

    // Check log rows
    expect(screen.getByText('Dr. Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    expect(screen.getByText('Role Modified')).toBeInTheDocument();
    expect(screen.getByText('Account Approved')).toBeInTheDocument();
  });
});

