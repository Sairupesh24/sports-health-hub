import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { apiFetch } from "@/utils/api";

export interface OrgBranding {
    id?: string;
    name?: string;
    official_name?: string;
    official_address?: string;
    contact_phone?: string;
    contact_email?: string;
    logo_url?: string;
}

export interface ClientData {
    id?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    honorific?: string;
    uhid?: string;
    gender?: string;
    age?: number | string;
    dob?: string;
    mobile_no?: string;
    sport?: string;
    exercise_type?: string;
    training_age?: number | string;
    training_sessions_count?: number | string;
}

export interface CaseData {
    id?: string;
    case_number?: string;
    client_id?: string;
    status?: string;
    created_at?: string;
    closed_at?: string;
    created_by_first?: string;
    created_by_last?: string;
    closed_by_first?: string;
    closed_by_last?: string;

    // Tab 1: History
    chief_complaint?: string;
    duration?: string;
    radiation?: string;
    onset?: string;
    migration?: string;
    character?: string;
    progression?: string;
    aggravation?: string;
    alleviation?: string;
    associated_features?: string;
    diurnal_variation?: string;
    last_checkup_date?: string;
    current_medication?: string;

    history_dm?: boolean;
    history_htn?: boolean;
    history_cad?: boolean;
    history_cva?: boolean;
    history_ba?: boolean;
    history_tb?: boolean;
    history_other?: boolean;
    history_other_details?: string;
    illness_durations?: Record<string, string>;
    allergies?: string;
    trauma?: string;
    hospitalisation?: string;
    past_medical_history?: string;
    past_surgical_history?: string;
    drug_history?: string;
    family_history?: string;

    previous_treatment?: string;
    previous_treatment_details?: string;

    training_history?: Array<{
        training_type?: string;
        training_volume?: string;
        years_of_training?: string | number;
        training_notes?: string;
    }>;
    training_type?: string;
    training_volume?: string;
    years_of_training?: string | number;
    training_notes?: string;

    lmp?: string;
    age_of_menarche?: string | number;
    age_of_menopause?: string | number;
    cycle_regularity?: string;
    menstrual_notes?: string;

    // Tab 2: General Examination
    built?: string;
    nourishment?: string;
    beighton_score?: string | number;
    pallor?: boolean;
    icterus?: boolean;
    cyanosis?: boolean;
    clubbing?: boolean;
    lymphadenopathy?: boolean;
    edema?: boolean;
    temperature?: string;
    pulse_rate?: string | number;
    bp?: string;
    spo2?: string | number;
    respiratory_rate?: string | number;
    height?: string | number;
    weight?: string | number;
    bmi?: string | number;
    pain_score?: number;
    pain_map?: Record<string, unknown>;

    // Tab 3: Clinical Examination
    inspection_notes?: string;
    palpation_notes?: string;
    range_of_motion_notes?: string;
    special_tests?: string[] | string;
    neurovascular_notes?: string;
    dermatome_notes?: string;
    myotome_notes?: string;
    reflexes_notes?: string;

    // Tab 4: Diagnosis & Plan
    provisional_diagnosis?: string;
    investigations?: string[] | string;
    body_region?: string;
    injury_type?: string;
    final_diagnosis?: string;
    severity?: string;
    side_of_body?: string;
    injury_nature?: string;
    etiology?: string;
    diagnosis_notes?: string;

    short_term_goals?: string;
    long_term_goals?: string;
    treatment_plan?: string;
    home_exercise_program?: string;
    advice?: string;
    additional_notes?: string;

    sessions?: Array<{
        id: string;
        scheduled_start?: string;
        service_type?: string;
        status?: string;
        therapist_first?: string;
        therapist_last?: string;
        pain_score?: number;
        clinical_notes?: string;
    }>;
}

interface AutoTableDoc extends jsPDF {
    lastAutoTable?: {
        finalY: number;
    };
}

const getTableFinalY = (doc: jsPDF): number => {
    return (doc as unknown as AutoTableDoc).lastAutoTable?.finalY ?? 20;
};

const getPageCount = (doc: jsPDF): number => {
    if (typeof doc.getNumberOfPages === "function") {
        return doc.getNumberOfPages();
    }
    const internal = (doc as unknown as { internal?: { getNumberOfPages?: () => number } }).internal;
    if (typeof internal?.getNumberOfPages === "function") {
        return internal.getNumberOfPages();
    }
    return 1;
};

export const fetchOrgBranding = async (orgId?: string | null): Promise<OrgBranding | null> => {
    if (!orgId) return null;
    try {
        const res = await apiFetch<OrgBranding & { data?: OrgBranding }>(`/organizations/${orgId}`);
        return res?.data || res || null;
    } catch {
        return null;
    }
};

export const fetchFullCaseDetails = async (caseId: string): Promise<CaseData | null> => {
    try {
        const data = await apiFetch<CaseData>(`/clinical/cases/${caseId}`);
        return data || null;
    } catch (err) {
        console.error("Failed to fetch full case details for PDF export", err);
        return null;
    }
};

/**
 * Formats client full name
 */
const formatName = (client?: ClientData | null): string => {
    if (!client) return "–";
    const parts = [client.honorific, client.first_name, client.middle_name, client.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "–";
};

// =========================================================================
// 1. EXPORT FILLED CASE SHEET TO PDF
// =========================================================================
export const exportCaseSheetPDF = async (
    caseData: CaseData,
    clientData?: ClientData | null,
    org?: OrgBranding | null
) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const client = clientData || ((caseData as Record<string, unknown>).client as ClientData) || null;
    const orgName = org?.official_name || org?.name || "SPORTS HEALTH HUB";
    const orgAddress = org?.official_address || "Advanced Sports Medicine, Physiotherapy & Athletic Rehabilitation";
    const orgContact = [org?.contact_phone, org?.contact_email].filter(Boolean).join("  •  ");

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
    const accentColor: [number, number, number] = [13, 148, 136]; // Teal-600
    const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50
    const borderSlate: [number, number, number] = [226, 232, 240];

    let currentY = 14;

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text(orgName.toUpperCase(), 14, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(orgAddress, 14, currentY);
    currentY += 4;
    if (orgContact) {
        doc.text(orgContact, 14, currentY);
        currentY += 4;
    }

    // Title Bar with Status
    currentY += 2;
    doc.setDrawColor(...borderSlate);
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, currentY, pageWidth - 28, 11, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("CLINICAL CASE SHEET & CONSULTATION RECORD", 18, currentY + 7);

    const isClosed = (caseData.status || "").toLowerCase() === "closed";
    const statusText = isClosed ? "STATUS: CLOSED" : "STATUS: ACTIVE";
    doc.setFontSize(9);
    if (isClosed) {
        doc.setTextColor(100, 116, 139);
    } else {
        doc.setTextColor(...accentColor);
    }
    doc.text(statusText, pageWidth - 18, currentY + 7, { align: "right" });
    currentY += 15;

    // Demographic Table
    const clientName = formatName(client);
    const uhid = client?.uhid || "–";
    const ageGender = [
        client?.age ? `${client.age} yrs` : "",
        client?.gender ? client.gender : ""
    ].filter(Boolean).join(" / ") || "–";
    const sport = client?.sport || "–";
    const mobile = client?.mobile_no || "–";
    const dateOpened = caseData.created_at ? format(new Date(caseData.created_at), "dd MMM yyyy") : "–";
    const consultantName = [caseData.created_by_first, caseData.created_by_last].filter(Boolean).join(" ") || "Attending Consultant";

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "plain",
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        body: [
            [
                { content: "Client Name:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 26 } },
                { content: clientName, styles: { fontStyle: "bold", cellWidth: 50 } },
                { content: "Case Number:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 26 } },
                { content: caseData.case_number || "–", styles: { fontStyle: "bold", textColor: [13, 148, 136] } }
            ],
            [
                { content: "UHID:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: uhid, styles: { fontStyle: "bold" } },
                { content: "Date Opened:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: dateOpened }
            ],
            [
                { content: "Age / Gender:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: ageGender },
                { content: "Consultant:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: consultantName }
            ],
            [
                { content: "Sport / Disc.:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: sport },
                { content: "Mobile No:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: mobile }
            ],
        ],
        tableLineColor: borderSlate,
        tableLineWidth: 0.2,
    });

    currentY = getTableFinalY(doc) + 6;

    // Helper: Add Section Heading
    const addSectionHeader = (title: string, subtitle?: string) => {
        // Check if page break is needed
        if (currentY > pageHeight - 35) {
            doc.addPage();
            currentY = 16;
        }
        doc.setFillColor(...primaryColor);
        doc.roundedRect(14, currentY, pageWidth - 28, 6.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 4.5);
        if (subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(203, 213, 225);
            doc.text(subtitle, pageWidth - 17, currentY + 4.5, { align: "right" });
        }
        currentY += 9;
    };

    // SECTION 1: HISTORY & PROFILE
    addSectionHeader("1. History & Clinical Profile", "Chief Complaint, HOPI & Medical History");

    const chiefComplaint = caseData.chief_complaint || "No chief complaint recorded.";
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        head: [[{ content: "CHIEF COMPLAINT", styles: { fillColor: lightBg, textColor: [71, 85, 105], fontStyle: "bold" } }]],
        body: [[chiefComplaint]],
    });
    currentY = getTableFinalY(doc) + 4;

    // HOPI Table (2 columns of key-value pairs)
    const hopiFields = [
        ["Duration", caseData.duration || "–", "Radiation", caseData.radiation || "–"],
        ["Onset", caseData.onset || "–", "Migration", caseData.migration || "–"],
        ["Character", caseData.character || "–", "Progression", caseData.progression || "–"],
        ["Aggravation", caseData.aggravation || "–", "Alleviation", caseData.alleviation || "–"],
        ["Associated Features", caseData.associated_features || "–", "Diurnal Variation", caseData.diurnal_variation || "–"],
        ["Last Check-up", caseData.last_checkup_date ? format(new Date(caseData.last_checkup_date), "dd MMM yyyy") : "–", "Current Medication", caseData.current_medication || "–"]
    ];

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: borderSlate, lineWidth: 0.2 },
        head: [
            [
                { content: "PARAMETER", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 32 } },
                { content: "OBSERVATION", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 60 } },
                { content: "PARAMETER", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 32 } },
                { content: "OBSERVATION", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold" } }
            ]
        ],
        body: hopiFields,
    });
    currentY = getTableFinalY(doc) + 4;

    // Past History & Conditions
    const conditions: string[] = [];
    const conditionMap: Array<{ key: string; label: string }> = [
        { key: "history_dm", label: "Diabetes Mellitus (DM)" },
        { key: "history_htn", label: "Hypertension (HTN)" },
        { key: "history_cad", label: "Coronary Artery Disease (CAD)" },
        { key: "history_cva", label: "Cerebrovascular Accident (CVA)" },
        { key: "history_ba", label: "Bronchial Asthma (BA)" },
        { key: "history_tb", label: "Tuberculosis (TB)" },
    ];

    conditionMap.forEach(c => {
        if ((caseData as Record<string, unknown>)[c.key]) {
            const duration = caseData.illness_durations?.[c.key];
            conditions.push(`${c.label}${duration ? ` [${duration} mos]` : ""}`);
        }
    });
    if (caseData.history_other) {
        const otherDetail = caseData.history_other_details ? `: ${caseData.history_other_details}` : "";
        const dur = caseData.illness_durations?.history_other ? ` [${caseData.illness_durations.history_other} mos]` : "";
        conditions.push(`Other${otherDetail}${dur}`);
    }

    const conditionsText = conditions.length > 0 ? conditions.join("  •  ") : "None reported / Healthy";
    const allergiesText = caseData.allergies || "No known allergies";
    const traumaText = caseData.trauma || "Nil reported";
    const hospitalText = caseData.hospitalisation || "Nil reported";
    const prevTreatment = caseData.previous_treatment === "Yes"
        ? `Yes — ${caseData.previous_treatment_details || "No details provided"}`
        : "No previous treatment taken";

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Medical Conditions:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 36 } },
                { content: conditionsText, colSpan: 3 }
            ],
            [
                { content: "Allergies:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: allergiesText },
                { content: "Prior Trauma:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 30 } },
                { content: traumaText }
            ],
            [
                { content: "Hospitalisation:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: hospitalText },
                { content: "Previous Treatment:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: prevTreatment }
            ],
        ]
    });
    currentY = getTableFinalY(doc) + 4;

    // Training History
    let trainingRows: string[][] = [];
    if (Array.isArray(caseData.training_history) && caseData.training_history.length > 0) {
        trainingRows = caseData.training_history
            .filter(t => t.training_type || t.training_volume || t.years_of_training)
            .map((t, idx) => [
                `#${idx + 1} ${t.training_type || "General"}`,
                t.training_volume || "–",
                t.years_of_training ? `${t.years_of_training} yrs` : "–",
                t.training_notes || "–"
            ]);
    }
    if (trainingRows.length === 0 && (caseData.training_type || caseData.training_volume || caseData.years_of_training)) {
        trainingRows.push([
            caseData.training_type || "General",
            caseData.training_volume || "–",
            caseData.years_of_training ? `${caseData.years_of_training} yrs` : "–",
            caseData.training_notes || "–"
        ]);
    }

    if (trainingRows.length > 0) {
        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2.2, lineColor: borderSlate, lineWidth: 0.2 },
            head: [
                [
                    { content: "TRAINING TYPE", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 45 } },
                    { content: "VOLUME", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 38 } },
                    { content: "EXPERIENCE", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 28 } },
                    { content: "NOTES", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold" } }
                ]
            ],
            body: trainingRows,
        });
        currentY = getTableFinalY(doc) + 4;
    }

    // Menstrual History (if recorded)
    const isFemale = (client?.gender || "").toLowerCase() === "female" || !!caseData.cycle_regularity || !!caseData.lmp;
    if (isFemale) {
        const lmpFormatted = caseData.lmp ? format(new Date(caseData.lmp), "dd MMM yyyy") : "–";
        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2.2, lineColor: borderSlate, lineWidth: 0.2 },
            body: [
                [
                    { content: "Menstrual Profile:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 36 } },
                    {
                        content: `Menarche: ${caseData.age_of_menarche ? `${caseData.age_of_menarche} yrs` : "–"}  |  Menopause: ${caseData.age_of_menopause ? `${caseData.age_of_menopause} yrs` : "–"}  |  LMP: ${lmpFormatted}  |  Regularity: ${caseData.cycle_regularity || "–"}${caseData.menstrual_notes ? `  |  Notes: ${caseData.menstrual_notes}` : ""}`,
                        colSpan: 3
                    }
                ]
            ]
        });
        currentY = getTableFinalY(doc) + 6;
    } else {
        currentY += 2;
    }

    // SECTION 2: GENERAL EXAMINATION
    addSectionHeader("2. General Examination & Vitals", "Clinical Signs, Anthropometrics & Vitals");

    // Signs
    const signs: string[] = [];
    (["pallor", "icterus", "cyanosis", "clubbing", "lymphadenopathy", "edema"] as const).forEach(s => {
        if ((caseData as Record<string, unknown>)[s]) signs.push(s.toUpperCase());
    });
    const signsText = signs.length > 0 ? `Positive: ${signs.join(", ")}` : "None detected (No Pallor, Icterus, Cyanosis, Clubbing, Lymphadenopathy, Edema)";

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Built / Nourishment:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 36 } },
                { content: `Built: ${caseData.built || "–"}    |    Nourishment: ${caseData.nourishment || "–"}    |    Beighton Score: ${caseData.beighton_score != null ? `${caseData.beighton_score}/9` : "–"}` },
                { content: "Pain Score (0–10):", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 } },
                { content: caseData.pain_score != null ? `${caseData.pain_score} / 10` : "0 / 10", styles: { fontStyle: "bold", textColor: [225, 29, 72] } }
            ],
            [
                { content: "Clinical Signs:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: signsText, colSpan: 3 }
            ],
            [
                { content: "Vitals:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: `Temp: ${caseData.temperature || "–"}  |  Pulse: ${caseData.pulse_rate ? `${caseData.pulse_rate} bpm` : "–"}  |  BP: ${caseData.bp || "–"}  |  SpO2: ${caseData.spo2 ? `${caseData.spo2}%` : "–"}  |  RR: ${caseData.respiratory_rate ? `${caseData.respiratory_rate} bpm` : "–"}` },
                { content: "Anthropometrics:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: `Ht: ${caseData.height ? `${caseData.height} cm` : "–"}  |  Wt: ${caseData.weight ? `${caseData.weight} kg` : "–"}  |  BMI: ${caseData.bmi ? `${caseData.bmi}` : "–"}` }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 3: CLINICAL / LOCAL EXAMINATION
    addSectionHeader("3. Clinical & Regional Examination", "Local Joint Examination & Neurovascular Status");

    const specialTestsList = Array.isArray(caseData.special_tests)
        ? caseData.special_tests.join(", ")
        : (caseData.special_tests || "–");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.5, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Inspection:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 36 } },
                { content: caseData.inspection_notes || "–" }
            ],
            [
                { content: "Palpation:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: caseData.palpation_notes || "–" }
            ],
            [
                { content: "Range of Motion (ROM):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: caseData.range_of_motion_notes || "–" }
            ],
            [
                { content: "Positive Special Tests:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: specialTestsList || "None recorded" }
            ],
            [
                { content: "Neurovascular Status:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                {
                    content: `Status: ${caseData.neurovascular_notes || "Intact"}  |  Dermatomes: ${caseData.dermatome_notes || "Normal"}  |  Myotomes: ${caseData.myotome_notes || "Normal"}  |  Reflexes: ${caseData.reflexes_notes || "Normal"}`
                }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 4: DIAGNOSIS & INVESTIGATIONS
    addSectionHeader("4. Diagnosis & Clinical Classification", "Final Diagnosis & Care Pathway");

    const investigationsText = Array.isArray(caseData.investigations)
        ? caseData.investigations.join("; ")
        : (caseData.investigations || "None ordered");

    const finalDx = caseData.final_diagnosis || caseData.provisional_diagnosis || "Undetermined";
    const bodyRegion = caseData.body_region || "–";
    const injuryType = caseData.injury_type || "–";
    const severity = caseData.severity || "–";
    const side = caseData.side_of_body || "–";
    const nature = caseData.injury_nature || "–";
    const etiology = caseData.etiology || "–";

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.8, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Provisional Diagnosis:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 36 } },
                { content: caseData.provisional_diagnosis || "–", colSpan: 3 }
            ],
            [
                { content: "Investigations:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: investigationsText, colSpan: 3 }
            ],
            [
                { content: "FINAL DIAGNOSIS:", styles: { fontStyle: "bold", textColor: [225, 29, 72], cellWidth: 36 } },
                { content: finalDx, styles: { fontStyle: "bold", fontSize: 9.5, textColor: [15, 23, 42] }, colSpan: 3 }
            ],
            [
                { content: "Body Region / Type:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: `${bodyRegion}  •  ${injuryType}` },
                { content: "Severity / Side:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 } },
                { content: `${severity}  •  Side: ${side}` }
            ],
            [
                { content: "Injury Nature:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: nature },
                { content: "Etiology:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: etiology }
            ],
            ...(caseData.diagnosis_notes ? [
                [
                    { content: "Specific Notes:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                    { content: caseData.diagnosis_notes, colSpan: 3 }
                ]
            ] : [])
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 5: MANAGEMENT PLAN
    addSectionHeader("5. Rehabilitation & Care Management Plan", "Goals, Interventions, HEP & Follow-up");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.6, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Short-Term Goals:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 36 } },
                { content: caseData.short_term_goals || "–" }
            ],
            [
                { content: "Long-Term Goals:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: caseData.long_term_goals || "–" }
            ],
            [
                { content: "Treatment Plan:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: caseData.treatment_plan || "–" }
            ],
            [
                { content: "Home Exercise Program:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: caseData.home_exercise_program || "–" }
            ],
            [
                { content: "Advice & Precautions:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: caseData.advice || "–" }
            ],
            ...(caseData.additional_notes ? [
                [
                    { content: "Additional Remarks:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                    { content: caseData.additional_notes }
                ]
            ] : [])
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // Linked Sessions (if any)
    if (Array.isArray(caseData.sessions) && caseData.sessions.length > 0) {
        addSectionHeader("Linked Physiotherapy Sessions", `${caseData.sessions.length} treatment session(s) documented`);
        const sessionRows = caseData.sessions.map((s, idx) => [
            `#${idx + 1}`,
            s.scheduled_start ? format(new Date(s.scheduled_start), "dd MMM yyyy") : "–",
            s.service_type || "Physiotherapy",
            [s.therapist_first, s.therapist_last].filter(Boolean).join(" ") || "–",
            s.pain_score != null ? `${s.pain_score}/10` : "–",
            s.clinical_notes || "–"
        ]);

        autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            theme: "grid",
            styles: { fontSize: 7.5, cellPadding: 2, lineColor: borderSlate, lineWidth: 0.2 },
            head: [
                [
                    { content: "#", styles: { fillColor: lightBg, cellWidth: 8 } },
                    { content: "DATE", styles: { fillColor: lightBg, cellWidth: 24 } },
                    { content: "SERVICE", styles: { fillColor: lightBg, cellWidth: 32 } },
                    { content: "THERAPIST", styles: { fillColor: lightBg, cellWidth: 32 } },
                    { content: "PAIN", styles: { fillColor: lightBg, cellWidth: 16 } },
                    { content: "CLINICAL NOTES / PROGRESSION", styles: { fillColor: lightBg } },
                ]
            ],
            body: sessionRows,
        });
        currentY = getTableFinalY(doc) + 6;
    }

    // Signatures & Sign-off Block
    if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
    }

    currentY += 4;
    doc.setDrawColor(...borderSlate);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text("EXAMINING CLINICIAN / CONSULTANT:", 14, currentY);
    doc.text("PATIENT / GUARDIAN ACKNOWLEDGEMENT:", pageWidth / 2 + 10, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(consultantName, 14, currentY);
    doc.text("I acknowledge receipt of this clinical assessment and rehabilitation plan.", pageWidth / 2 + 10, currentY);
    currentY += 12;

    doc.line(14, currentY, 80, currentY);
    doc.line(pageWidth / 2 + 10, currentY, pageWidth - 14, currentY);
    currentY += 4;
    doc.setFontSize(7.5);
    doc.text("Signature & Medical Registration Seal", 14, currentY);
    doc.text("Patient / Guardian Signature", pageWidth / 2 + 10, currentY);

    // Running Header / Footer on all pages
    const totalPages = getPageCount(doc);
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        // Top thin line for pages > 1
        if (i > 1) {
            doc.setDrawColor(241, 245, 249);
            doc.line(14, 10, pageWidth - 14, 10);
            doc.text(`${orgName} • Case #${caseData.case_number || "–"} • ${clientName}`, 14, 8);
        }

        // Bottom footer
        doc.setDrawColor(241, 245, 249);
        doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
        doc.text(
            `Confidential Clinical Record • Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`,
            14,
            pageHeight - 6
        );
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: "right" });
    }

    const cleanClientName = (clientName || "Client").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanCaseNo = (caseData.case_number || "Case").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Case_Sheet_${cleanCaseNo}_${cleanClientName}.pdf`);
};

// =========================================================================
// 2. EXPORT EMPTY / BLANK CASE SHEET TO PDF (FOR PRINTING & HAND-WRITING)
// =========================================================================
/**
 * Generates an empty, print-ready clinical evaluation sheet.
 * All dropdown options are converted to checkboxes [ ] for convenient paper notation.
 * Note per user requirement: Final Diagnosis is left as an open blank write-in field.
 */
export const exportBlankCaseSheetPDF = async (org?: OrgBranding | null) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const orgName = org?.official_name || org?.name || "SPORTS HEALTH HUB";
    const orgAddress = org?.official_address || "Advanced Sports Medicine, Physiotherapy & Athletic Rehabilitation";
    const orgContact = [org?.contact_phone, org?.contact_email].filter(Boolean).join("  •  ");

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate-900
    const lightBg: [number, number, number] = [248, 250, 252];
    const borderSlate: [number, number, number] = [203, 213, 225];

    let currentY = 14;

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text(orgName.toUpperCase(), 14, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(orgAddress, 14, currentY);
    currentY += 4;
    if (orgContact) {
        doc.text(orgContact, 14, currentY);
        currentY += 4;
    }

    // Document Banner
    currentY += 2;
    doc.setDrawColor(...borderSlate);
    doc.setFillColor(...lightBg);
    doc.roundedRect(14, currentY, pageWidth - 28, 10, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("CLINICAL EVALUATION CASE SHEET", 18, currentY + 6.5);

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PRINT-READY CLINICAL EVALUATION FORM", pageWidth - 18, currentY + 6.5, { align: "right" });
    currentY += 14;

    // Section Header Helper
    const addSectionHeader = (title: string, subtitle?: string) => {
        if (currentY > pageHeight - 35) {
            doc.addPage();
            currentY = 16;
        }
        doc.setFillColor(...primaryColor);
        doc.roundedRect(14, currentY, pageWidth - 28, 6.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 17, currentY + 4.5);
        if (subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(203, 213, 225);
            doc.text(subtitle, pageWidth - 17, currentY + 4.5, { align: "right" });
        }
        currentY += 9;
    };

    // SECTION 0: PATIENT DEMOGRAPHICS (Blank with lined prompts)
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "plain",
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
        body: [
            [
                { content: "Patient Name:", styles: { fontStyle: "bold", cellWidth: 26, textColor: [100, 116, 139] } },
                { content: "________________________________________________________", styles: { cellWidth: 70 } },
                { content: "UHID:", styles: { fontStyle: "bold", cellWidth: 16, textColor: [100, 116, 139] } },
                { content: "______________________" }
            ],
            [
                { content: "Age / Gender:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "Age: _______    [  ] Male     [  ] Female     [  ] Other" },
                { content: "Date:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "____ / ____ / 20____" }
            ],
            [
                { content: "Sport / Disc.:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "____________________________________" },
                { content: "Phone:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "______________________" }
            ],
            [
                { content: "Evaluator:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "____________________________________" },
                { content: "Case No:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "______________________" }
            ]
        ],
        tableLineColor: borderSlate,
        tableLineWidth: 0.2,
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 1: HISTORY & HOPI
    addSectionHeader("1. History & Chief Complaint", "Primary Symptoms, Onset & Behavior");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 3.5, lineColor: borderSlate, lineWidth: 0.2 },
        head: [[{ content: "CHIEF COMPLAINT (Primary presenting complaint & onset description)", styles: { fillColor: lightBg, textColor: [71, 85, 105], fontStyle: "bold" } }]],
        body: [
            [{ content: "\n\n\n", styles: { minCellHeight: 18 } }]
        ],
    });
    currentY = getTableFinalY(doc) + 4;

    // HOPI Grid (Lined blank writing areas)
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        head: [
            [
                { content: "PARAMETER", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 34 } },
                { content: "CLINICAL FINDINGS / NOTES", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 58 } },
                { content: "PARAMETER", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold", cellWidth: 34 } },
                { content: "CLINICAL FINDINGS / NOTES", styles: { fillColor: lightBg, textColor: [100, 116, 139], fontStyle: "bold" } }
            ]
        ],
        body: [
            ["Duration:", "___________________________", "Radiation:", "___________________________"],
            ["Onset:", "___________________________", "Migration:", "___________________________"],
            ["Character:", "___________________________", "Progression:", "___________________________"],
            ["Aggravation:", "___________________________", "Alleviation:", "___________________________"],
            ["Associated Features:", "___________________________", "Diurnal Variation:", "___________________________"],
            ["Last Check-up:", "____ / ____ / 20____", "Medication:", "___________________________"],
        ]
    });
    currentY = getTableFinalY(doc) + 4;

    // Past Medical History & Checkboxes
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        head: [
            [{ content: "PAST MEDICAL HISTORY & COMORBIDITIES (Tick all that apply)", colSpan: 2, styles: { fillColor: lightBg, textColor: [71, 85, 105], fontStyle: "bold" } }]
        ],
        body: [
            [
                { content: "Medical Conditions:\n(with duration)", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                {
                    content: "[  ] DM (____ mos)     [  ] HTN (____ mos)     [  ] CAD (____ mos)     [  ] CVA (____ mos)\n[  ] BA (____ mos)     [  ] TB (____ mos)      [  ] Other: _____________________________ (____ mos)"
                }
            ],
            [
                { content: "Allergies / Drug Sens.:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "__________________________________________________________________________________________" }
            ],
            [
                { content: "Prior Trauma / Fractures:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "__________________________________________________________________________________________" }
            ],
            [
                { content: "Hospitalisation / Surgery:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "__________________________________________________________________________________________" }
            ],
            [
                { content: "Previous Treatment:\n(Dropdown / Options)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                {
                    content: "[  ] No Previous Treatment        [  ] Yes (Details: _________________________________________________)"
                }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 2: TRAINING HISTORY (All 10 Training Type options as checkboxes!)
    addSectionHeader("2. Training History & Athletic Profile", "Select Training Type(s) & Document Volume");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Training Types:\n(Select all that apply)", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                {
                    content: "[  ] Strength              [  ] Endurance         [  ] Skill-based          [  ] Mixed             [  ] Recreational\n[  ] Competitive        [  ] Flexibility & Mob.   [  ] Hypertrophy        [  ] Speed & Agility  [  ] Other: _____________"
                }
            ],
            [
                { content: "Volume & Experience:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "Volume (hrs/sessions per wk): _____________________        Years of Training: _____________________" }
            ],
            [
                { content: "Training Notes / Schedule:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "__________________________________________________________________________________________" }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 4;

    // Menstrual History (Female Athletes) - Regularity dropdown as checkboxes!
    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        head: [
            [{ content: "MENSTRUAL HISTORY (Female Athletes Only)", colSpan: 2, styles: { fillColor: lightBg, textColor: [71, 85, 105], fontStyle: "bold" } }]
        ],
        body: [
            [
                { content: "Age of Menarche / LMP:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                { content: "Menarche: ________ yrs        Menopause: ________ yrs        LMP Date: ____ / ____ / 20____" }
            ],
            [
                { content: "Cycle Regularity:\n(Dropdown as Checkboxes)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                {
                    content: "[  ] Regular       [  ] Irregular       [  ] Amenorrhea       [  ] Dysmenorrhea       [  ] Post-menopausal"
                }
            ],
            [
                { content: "Menstrual Notes:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "Symptoms, Contraceptive use: _____________________________________________________________" }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 3: GENERAL EXAMINATION & VITALS
    // Built & Nourishment dropdowns converted to checkboxes!
    addSectionHeader("3. General Examination & Vitals", "Anthropometrics, Vitals & Clinical Signs");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Built (Dropdown):", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                { content: "[  ] Lean          [  ] Average          [  ] Athletic          [  ] Obese" }
            ],
            [
                { content: "Nourishment (Dropdown):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "[  ] Well Nourished             [  ] Poorly Nourished             [  ] Obese" }
            ],
            [
                { content: "Clinical Signs (Checkboxes):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "[  ] Pallor      [  ] Icterus      [  ] Cyanosis      [  ] Clubbing      [  ] Lymphadenopathy      [  ] Edema" }
            ],
            [
                { content: "Vitals & Beighton:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                {
                    content: "Temp: ________ °C/°F       Pulse: ________ bpm       BP: ________/________ mmHg\nSpO2: ________ %               Resp. Rate: ________ bpm       Beighton Score (0-9): [      ]"
                }
            ],
            [
                { content: "Anthropometrics:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "Height: ________ cm                 Weight: ________ kg                 BMI: ________ kg/m²" }
            ],
            [
                { content: "Pain Score (0–10 Numeric):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                {
                    content: "0 [  ]   1 [  ]   2 [  ]   3 [  ]   4 [  ]   5 [  ]   6 [  ]   7 [  ]   8 [  ]   9 [  ]   10 [  ]\nPain Location(s) & Quality: ____________________________________________________________"
                }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 4: CLINICAL / REGIONAL EXAMINATION
    addSectionHeader("4. Clinical & Regional Examination", "Inspection, Palpation, Range of Motion & Tests");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Inspection Findings:\n(Posture, swelling, deformity)", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                { content: "\n\n", styles: { minCellHeight: 12 } }
            ],
            [
                { content: "Palpation Findings:\n(Tenderness, warmth, crepitus)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 12 } }
            ],
            [
                { content: "Range of Motion (ROM):\n(Active / Passive degrees)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 12 } }
            ],
            [
                { content: "Special Tests Positive:\n(e.g. Lachman, Hawkins, SLRT)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 10 } }
            ],
            [
                { content: "Neurovascular Status:\n(Sensory, Motor, Reflexes)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                {
                    content: "General: _________________________________    Dermatomes: _________________________________\nMyotomes (0-5): __________________________    Reflexes: ___________________________________"
                }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 5: DIAGNOSIS & CLASSIFICATION
    // USER SPECIFIC INSTRUCTION:
    // "Note: Leave the final diagnosis as just a blank text field, no need to lay all the dropdown options as checkboxes."
    // While other dropdowns (Severity, Side of Body, Nature, Etiology) should have options as checkboxes!
    addSectionHeader("5. Diagnosis & Clinical Classification", "Provisional Impression, Investigations & Final Dx");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Provisional Diagnosis:", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                { content: "__________________________________________________________________________________________" }
            ],
            [
                { content: "Investigations Ordered:\n(X-Ray, MRI, Ultrasound, Blood)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "__________________________________________________________________________________________" }
            ],
            [
                { content: "FINAL DIAGNOSIS:\n(Blank Text Field)", styles: { fontStyle: "bold", textColor: [225, 29, 72], cellWidth: 34 } },
                {
                    content: "Diagnosis: _______________________________________________________________________________\nBody Region: _________________________________       Injury Type: _________________________________\nSpecific Diagnosis Notes: ________________________________________________________________",
                    styles: { minCellHeight: 16 }
                }
            ],
            [
                { content: "Severity (Dropdown):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "[  ] Mild             [  ] Moderate             [  ] Severe" }
            ],
            [
                { content: "Side of Body (Dropdown):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "[  ] Right            [  ] Left                 [  ] Bilateral            [  ] N/A (Central / Non-sided)" }
            ],
            [
                { content: "Injury Nature (Dropdown):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "[  ] Acute            [  ] Chronic              [  ] Acute-on-chronic" }
            ],
            [
                { content: "Etiology (Dropdown):", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "[  ] Traumatic        [  ] Non-traumatic / Overuse        [  ] Post-surgical        [  ] Degenerative" }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // SECTION 6: MANAGEMENT & REHABILITATION PLAN
    addSectionHeader("6. Rehabilitation & Care Management Plan", "Goals, Interventions, Home Exercises & Advice");

    autoTable(doc, {
        startY: currentY,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 3, lineColor: borderSlate, lineWidth: 0.2 },
        body: [
            [
                { content: "Short-Term Goals:\n(0 – 4 weeks)", styles: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 34 } },
                { content: "\n\n", styles: { minCellHeight: 12 } }
            ],
            [
                { content: "Long-Term Goals:\n(Return to sport / play)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 12 } }
            ],
            [
                { content: "Treatment Plan:\n(Modalities, manual, exercise)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 14 } }
            ],
            [
                { content: "Home Exercise Program:\n(Prescribed home exercises)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 12 } }
            ],
            [
                { content: "Advice & Precautions:\n(Follow-up schedule)", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n\n", styles: { minCellHeight: 10 } }
            ],
            [
                { content: "Additional Remarks:", styles: { fontStyle: "bold", textColor: [100, 116, 139] } },
                { content: "\n", styles: { minCellHeight: 8 } }
            ]
        ]
    });
    currentY = getTableFinalY(doc) + 6;

    // Signature Block
    if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
    }

    currentY += 4;
    doc.setDrawColor(...borderSlate);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text("EXAMINING CLINICIAN / CONSULTANT:", 14, currentY);
    doc.text("PATIENT / ATHLETE SIGNATURE:", pageWidth / 2 + 10, currentY);
    currentY += 14;

    doc.line(14, currentY, 80, currentY);
    doc.line(pageWidth / 2 + 10, currentY, pageWidth - 14, currentY);
    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Signature & Clinical Seal                     Date: ____/____/20____", 14, currentY);
    doc.text("Patient / Guardian Signature                 Date: ____/____/20____", pageWidth / 2 + 10, currentY);

    // Running Header / Footer on all pages
    const totalPages = getPageCount(doc);
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        if (i > 1) {
            doc.setDrawColor(241, 245, 249);
            doc.line(14, 10, pageWidth - 14, 10);
            doc.text(`${orgName} • Blank Clinical Evaluation Case Sheet`, 14, 8);
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
        doc.text(
            `Printable Case Sheet Form • ${orgName} • Printed on ${format(new Date(), "dd MMM yyyy")}`,
            14,
            pageHeight - 6
        );
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: "right" });
    }

    const cleanOrgName = (orgName || "Clinic").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Blank_Case_Sheet_${cleanOrgName}.pdf`);
};
