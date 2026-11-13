import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import CaseRepoPage from '../pages/consultant/CaseRepoPage';
import CaseSheetModal from '../components/consultant/CaseSheetModal';
import * as CaseSheetExportModule from '@/utils/CaseSheetExport';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'consultant-1', email: 'doctor@ishpo.com' },
        profile: {
            id: 'consultant-1',
            first_name: 'Dr. Raja',
            last_name: 'Prasad',
            role: 'consultant',
            organization_id: 'org-test-1',
            organization_name: 'ISHPO Sports Medicine',
        },
        roles: ['consultant'],
        loading: false,
        signOut: vi.fn(),
        refreshAuth: vi.fn(),
    }),
}));

// Mock apiFetch
const mockCases = [
    {
        id: 'case-001',
        case_number: 'CSSH-2026-0006',
        client_id: 'client-1',
        organization_id: 'org-test-1',
        status: 'open',
        chief_complaint: 'Right knee acute pain and swelling after twist',
        final_diagnosis: 'Right medial meniscal tear',
        body_region: 'Knee',
        injury_type: 'Cartilage',
        severity: 'Moderate',
        side_of_body: 'Right',
        created_at: '2026-09-21T10:00:00Z',
        created_by_first: 'Raja Prasad',
        created_by_last: 'M',
        session_count: 1,
        client: {
            id: 'client-1',
            first_name: 'Rahul',
            last_name: 'Lokesh',
            uhid: 'CSH07260001',
            age: 26,
            gender: 'Male',
            sport: 'Badminton',
            mobile_no: '9154265885',
        },
    },
];

vi.mock('@/utils/api', () => ({
    apiFetch: vi.fn(async (url: string) => {
        if (url.includes('/clinical/cases/case-001')) {
            return mockCases[0];
        }
        if (url.includes('/clinical/cases')) {
            return mockCases;
        }
        if (url.includes('/clinical/master-data/regions')) {
            return ['Knee', 'Shoulder', 'Ankle'];
        }
        if (url.includes('/clinical/master-data/types')) {
            return ['Cartilage', 'Ligament', 'Muscle'];
        }
        if (url.includes('/clinical/master-data/diagnoses')) {
            return ['Right medial meniscal tear'];
        }
        if (url.includes('/organizations/')) {
            return {
                id: 'org-test-1',
                official_name: 'ISHPO Sports Medicine',
                official_address: 'Sports Complex, Level 2',
            };
        }
        if (url.includes('/clients')) {
            return [mockCases[0].client];
        }
        return [];
    }),
}));

// Mock CaseSheetExport
vi.spyOn(CaseSheetExportModule, 'exportBlankCaseSheetPDF').mockImplementation(vi.fn(async () => {}));
vi.spyOn(CaseSheetExportModule, 'exportCaseSheetPDF').mockImplementation(vi.fn(async () => {}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>{ui}</MemoryRouter>
        </QueryClientProvider>
    );
};

describe('Case Repository & Case Sheet PDF Export UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders "Export Blank Sheet (PDF)" in the Case Repository header', async () => {
        renderWithProviders(<CaseRepoPage />);

        const exportBlankBtn = await screen.findByRole('button', { name: /export blank sheet \(pdf\)/i });
        expect(exportBlankBtn).toBeInTheDocument();

        // Click the export blank sheet button
        fireEvent.click(exportBlankBtn);

        await waitFor(() => {
            expect(CaseSheetExportModule.exportBlankCaseSheetPDF).toHaveBeenCalled();
        });
    });

    it('renders "Export PDF" button for each case row in the repository table and triggers export', async () => {
        renderWithProviders(<CaseRepoPage />);

        // Wait for case to load
        await screen.findByText('CSSH-2026-0006');

        // Look for Export PDF button on the row
        const exportRowBtn = screen.getByRole('button', { name: /export pdf/i });
        expect(exportRowBtn).toBeInTheDocument();

        // Click the Export PDF button on the case row
        fireEvent.click(exportRowBtn);

        await waitFor(() => {
            expect(CaseSheetExportModule.exportCaseSheetPDF).toHaveBeenCalled();
        });
    });

    it('renders "Export PDF" button inside CaseSheetModal header', async () => {
        renderWithProviders(
            <CaseSheetModal
                open={true}
                onOpenChange={vi.fn()}
                clientId="client-1"
                client={mockCases[0].client}
                caseId="case-001"
            />
        );

        // Find the Export PDF button in the modal header
        const modalExportBtn = await screen.findByRole('button', { name: /export pdf/i });
        expect(modalExportBtn).toBeInTheDocument();

        fireEvent.click(modalExportBtn);

        await waitFor(() => {
            expect(CaseSheetExportModule.exportCaseSheetPDF).toHaveBeenCalled();
        });
    });
});

