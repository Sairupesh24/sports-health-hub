import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    exportCaseSheetPDF,
    exportBlankCaseSheetPDF,
    CaseData,
    ClientData,
    OrgBranding,
} from "@/utils/CaseSheetExport";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Mock jsPDF and autoTable
vi.mock("jspdf", () => {
    const docMock = {
        internal: {
            pageSize: {
                getWidth: vi.fn(() => 210),
                getHeight: vi.fn(() => 297),
            },
            getNumberOfPages: vi.fn(() => 3),
        },
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setDrawColor: vi.fn(),
        setFillColor: vi.fn(),
        roundedRect: vi.fn(),
        rect: vi.fn(),
        line: vi.fn(),
        text: vi.fn(),
        addPage: vi.fn(),
        setPage: vi.fn(),
        getNumberOfPages: vi.fn(() => 3),
        save: vi.fn(),
    };
    return {
        default: vi.fn(function () {
            return docMock;
        }),
    };
});

interface MockAutoTableOptions {
    startY?: number;
    body?: unknown[];
}

interface MockDoc {
    lastAutoTable?: { finalY: number };
}

vi.mock("jspdf-autotable", () => {
    return {
        default: vi.fn((doc: unknown, options: MockAutoTableOptions) => {
            (doc as MockDoc).lastAutoTable = { finalY: (options?.startY || 20) + 25 };
        }),
    };
});

describe("CaseSheetExport Module", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("exportBlankCaseSheetPDF", () => {
        it("generates a print-ready blank case sheet with dropdown options converted to checkboxes", async () => {
            const org: OrgBranding = {
                name: "Elite Performance Clinic",
                official_name: "Elite Performance Sports Medicine",
                official_address: "123 Olympic Way, Stadium Hub",
                contact_phone: "+91 9876543210",
                contact_email: "clinic@elitesports.com",
            };

            await exportBlankCaseSheetPDF(org);

            const autoTableMock = vi.mocked(autoTable);
            expect(autoTableMock).toHaveBeenCalled();

            // Collect all table bodies passed to autoTable
            const allCalls = autoTableMock.mock.calls;
            const allBodiesString = JSON.stringify(allCalls.map((c) => c[1]?.body || []));

            // Verify Built dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Lean");
            expect(allBodiesString).toContain("[  ] Average");
            expect(allBodiesString).toContain("[  ] Athletic");
            expect(allBodiesString).toContain("[  ] Obese");

            // Verify Nourishment dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Well Nourished");
            expect(allBodiesString).toContain("[  ] Poorly Nourished");

            // Verify Severity dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Mild");
            expect(allBodiesString).toContain("[  ] Moderate");
            expect(allBodiesString).toContain("[  ] Severe");

            // Verify Side of Body dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Right");
            expect(allBodiesString).toContain("[  ] Left");
            expect(allBodiesString).toContain("[  ] Bilateral");
            expect(allBodiesString).toContain("[  ] N/A (Central / Non-sided)");

            // Verify Injury Nature dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Acute");
            expect(allBodiesString).toContain("[  ] Chronic");
            expect(allBodiesString).toContain("[  ] Acute-on-chronic");

            // Verify Etiology dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Traumatic");
            expect(allBodiesString).toContain("[  ] Non-traumatic / Overuse");

            // Verify Training History training types converted to checkboxes
            expect(allBodiesString).toContain("[  ] Strength");
            expect(allBodiesString).toContain("[  ] Endurance");
            expect(allBodiesString).toContain("[  ] Skill-based");
            expect(allBodiesString).toContain("[  ] Mixed");
            expect(allBodiesString).toContain("[  ] Competitive");
            expect(allBodiesString).toContain("[  ] Flexibility & Mob.");

            // Verify Menstrual Cycle Regularity dropdown converted to checkboxes
            expect(allBodiesString).toContain("[  ] Regular");
            expect(allBodiesString).toContain("[  ] Irregular");
            expect(allBodiesString).toContain("[  ] Amenorrhea");
            expect(allBodiesString).toContain("[  ] Dysmenorrhea");
            expect(allBodiesString).toContain("[  ] Post-menopausal");

            // Verify CRITICAL user requirement: Final Diagnosis is left as a blank text field
            expect(allBodiesString).toContain("FINAL DIAGNOSIS:\\n(Blank Text Field)");
            expect(allBodiesString).toContain("Diagnosis: _______________________________________________________________________________");

            // Verify doc.save was called with appropriate blank case sheet filename
            const mockedJsPdf = vi.mocked(jsPDF);
            const docInstance = mockedJsPdf.mock.results[0].value as { save: (name: string) => void };
            expect(docInstance.save).toHaveBeenCalledWith(
                expect.stringContaining("Blank_Case_Sheet_Elite_Performance_Sports_Medicine.pdf")
            );
        });
    });

    describe("exportCaseSheetPDF", () => {
        it("exports an existing populated clinical case sheet with full details to PDF", async () => {
            const mockClient: ClientData = {
                id: "client-123",
                first_name: "Rahul",
                last_name: "Lokesh",
                uhid: "CSH07260001",
                age: 26,
                gender: "Male",
                sport: "Badminton",
                mobile_no: "9154265885",
            };

            const mockCase: CaseData = {
                id: "case-999",
                case_number: "CSSH-2026-0006",
                status: "open",
                created_at: "2026-09-21T10:00:00Z",
                created_by_first: "Raja Prasad",
                created_by_last: "M",
                chief_complaint: "Right knee acute pain and swelling after football twist",
                duration: "2 days",
                radiation: "Anteromedial joint line",
                onset: "Sudden pivot during game",
                character: "Sharp catching sensation",
                progression: "Worsening with weight-bearing",
                aggravation: "Knee flexion >90 deg, twisting",
                alleviation: "RICE protocol, elevation",
                built: "Athletic",
                nourishment: "Well Nourished",
                temperature: "36.8 C",
                pulse_rate: 68,
                bp: "120/78",
                spo2: 99,
                respiratory_rate: 15,
                height: 178,
                weight: 74,
                bmi: 23.4,
                pain_score: 6,
                inspection_notes: "Moderate joint effusion, antalgic gait",
                palpation_notes: "Point tenderness at medial joint line",
                range_of_motion_notes: "Flexion limited to 100 deg due to pain/block",
                special_tests: ["McMurray Positive", "Apley Grind Positive"],
                neurovascular_notes: "Distal pulses intact, sensation preserved",
                provisional_diagnosis: "Right medial meniscus acute tear",
                investigations: ["MRI Right Knee requested"],
                final_diagnosis: "Right medial meniscal bucket-handle tear",
                body_region: "Knee",
                injury_type: "Cartilage",
                severity: "Moderate",
                side_of_body: "Right",
                injury_nature: "Acute",
                etiology: "Traumatic",
                treatment_plan: "Protected weight-bearing, quadriceps setting, cryotherapy, orthopaedic referral",
                short_term_goals: "Reduce effusion, restore terminal extension (0-2 wks)",
                long_term_goals: "Return to competitive badminton within 12 weeks",
                home_exercise_program: "Isometric quads, straight leg raises, ankle pumps",
                advice: "Avoid deep squats and rotational loading",
                sessions: [
                    {
                        id: "sess-1",
                        scheduled_start: "2026-09-22T09:00:00Z",
                        service_type: "Physiotherapy Consultation",
                        therapist_first: "Dr. Sandeep",
                        therapist_last: "S",
                        pain_score: 5,
                        clinical_notes: "Effusion reduced by 1cm. Extension improved to 0 deg.",
                    },
                ],
            };

            const org: OrgBranding = {
                name: "ISHPO Clinic",
                official_name: "ISHPO Physical Therapy Center",
            };

            await exportCaseSheetPDF(mockCase, mockClient, org);

            const autoTableMock = vi.mocked(autoTable);
            expect(autoTableMock).toHaveBeenCalled();

            const allCalls = autoTableMock.mock.calls;
            const allBodiesString = JSON.stringify(allCalls.map((c) => c[1]?.body || []));

            // Verify demographic & complaint
            expect(allBodiesString).toContain("CSH07260001");
            expect(allBodiesString).toContain("CSSH-2026-0006");
            expect(allBodiesString).toContain("Right knee acute pain and swelling after football twist");

            // Verify final diagnosis & classification
            expect(allBodiesString).toContain("Right medial meniscal bucket-handle tear");
            expect(allBodiesString).toContain("Knee");
            expect(allBodiesString).toContain("Cartilage");
            expect(allBodiesString).toContain("Moderate");
            expect(allBodiesString).toContain("Traumatic");

            // Verify session history inclusion
            expect(allBodiesString).toContain("Effusion reduced by 1cm. Extension improved to 0 deg.");

            // Verify doc.save was called with case number and patient name
            const mockedJsPdf = vi.mocked(jsPDF);
            const docInstance = mockedJsPdf.mock.results[0].value as { save: (name: string) => void };
            expect(docInstance.save).toHaveBeenCalledWith(
                expect.stringContaining("Case_Sheet_CSSH-2026-0006_Rahul_Lokesh.pdf")
            );
        });
    });
});
