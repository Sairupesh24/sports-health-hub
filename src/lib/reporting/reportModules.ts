import { format } from "date-fns";
import { apiFetch } from "@/utils/api";

export type ReportModule = 
  | "registration"
  | "billing"
  | "appointments"
  | "physio"
  | "sports_science"
  | "entitlements"
  | "clients" 
  | "attendance"
  | "analytics";

/**
 * Role-Based Access Control for Report Modules
 * - admin / manager: full access to all modules including financial
 * - consultant: clinical only (physio, appointments, entitlements, clients, attendance)
 * - sports_scientist: sports-specific modules only
 * - client: no access to the engine (no route defined)
 */
export const ROLE_MODULE_ACCESS: Record<string, ReportModule[]> = {
  admin: [
    "registration",
    "billing",
    "appointments",
    "physio",
    "sports_science",
    "entitlements",
    "clients",
    "attendance",
    "analytics",
  ],
  manager: [
    "registration",
    "billing",
    "appointments",
    "physio",
    "sports_science",
    "entitlements",
    "clients",
    "attendance",
    "analytics",
  ],
  consultant: [
    "appointments",
    "physio",
    "entitlements",
    "clients",
    "attendance",
  ],
  sports_scientist: [
    "sports_science",
    "attendance",
    "clients",
    "appointments",
  ],
  foe: [
    "registration",
    "appointments",
    "physio",
    "sports_science",
    "entitlements",
    "clients",
    "attendance",
  ],
  client: [],
};

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  columns: { key: string; label: string }[];
}

export const REPORT_STRUCTURE: Record<ReportModule, ReportTemplate[]> = {
  registration: [
    { id: "client_list", name: "Client List", description: "All registered clients with key details", columns: [
        { key: "uhid", label: "UHID" },
        { key: "full_name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "mobile_no", label: "Mobile" },
        { key: "registered_on", label: "Reg Date" }
    ]},
    { id: "client_demographics", name: "Client Demographics", description: "Age and gender breakdown", columns: [
        { key: "gender", label: "Gender" },
        { key: "age", label: "Age" },
        { key: "count", label: "Count" }
    ]}
  ],
  billing: [
    { id: "revenue_by_service", name: "Revenue by Service", description: "Financial breakdown by service type", columns: [
        { key: "service_type", label: "Service" },
        { key: "revenue", label: "Revenue" }
    ]},
    { id: "full_transaction_ledger", name: "Full Transaction Ledger", description: "All invoices and refunds merged in chronological order", columns: [
        { key: "date", label: "Date" },
        { key: "type", label: "Type" },
        { key: "reference", label: "Reference #" },
        { key: "client_name", label: "Client" },
        { key: "staff", label: "Staff" },
        { key: "amount", label: "Amount" },
        { key: "mode", label: "Mode" },
        { key: "status", label: "Status" },
        { key: "entitlement_status", label: "Entitlements" }
    ]},
    { id: "refund_summary", name: "Refund Summary", description: "All processed refunds with proof and authorization details", columns: [
        { key: "date", label: "Date" },
        { key: "reference", label: "Refund #" },
        { key: "client_name", label: "Client" },
        { key: "original_invoice", label: "Invoice #" },
        { key: "amount", label: "Amount" },
        { key: "mode", label: "Mode" },
        { key: "authorized_by", label: "Auth By" },
        { key: "entitlements_reversed", label: "Entitlements" }
    ]},
    { id: "user_revenue_summary", name: "User Revenue Summary", description: "Detailed revenue breakdowns by staff member and payment mode", columns: [
        { key: "staff_member", label: "Staff Member" },
        { key: "payment_mode", label: "Payment Mode" },
        { key: "mode_total", label: "Sub-Total" },
        { key: "staff_total", label: "Grand Total" }
    ]}
  ],
  physio: [
    { id: "sessions_by_therapist", name: "Sessions by Therapist", description: "Count of sessions per therapist", columns: [
        { key: "therapist_name", label: "Therapist" },
        { key: "session_count", label: "Sessions" }
    ]},
    { id: "pain_score_progress", name: "Pain Score Progress", description: "Average pain score trends", columns: [
        { key: "client_name", label: "Client" },
        { key: "initial_pain", label: "Initial" },
        { key: "current_pain", label: "Current" },
        { key: "improvement", label: "Improvement" }
    ]}
  ],
  sports_science: [
    { id: "sessions_by_scientist", name: "Sessions by Scientist", description: "Workload breakdown for scientists", columns: [
        { key: "scientist_name", label: "Scientist" },
        { key: "count", label: "Count" }
    ]},
    { id: "group_attendance", name: "Group Attendance", description: "Attendance rates for group sessions", columns: [
        { key: "group_name", label: "Group" },
        { key: "date", label: "Date" },
        { key: "attendees", label: "Attendees" }
    ]}
  ],
  appointments: [
    { id: "appointment_summary", name: "Appointment Summary", description: "Daily appointment breakdown", columns: [
        { key: "date", label: "Date" },
        { key: "total_appointments", label: "Total" },
        { key: "completed", label: "Completed" },
        { key: "cancelled", label: "Cancelled" }
    ]}
  ],
  entitlements: [
    { id: "usage_report", name: "Entitlement Usage", description: "Remaining vs Used sessions", columns: [
        { key: "client_name", label: "Client" },
        { key: "package_name", label: "Package" },
        { key: "total", label: "Total" },
        { key: "used", label: "Used" },
        { key: "remaining", label: "Remaining" }
    ]}
  ],
  clients: [
    { id: "workout_schedule", name: "Workout Schedule", description: "Detailed exercise schedule for a specific client", columns: [
        { key: "date", label: "Date" },
        { key: "workout_title", label: "Workout" },
        { key: "exercise_name", label: "Exercise" },
        { key: "workout_grouping", label: "Group" },
        { key: "sets", label: "Sets" },
        { key: "reps", label: "Reps" },
        { key: "weight", label: "Weight" },
        { key: "tempo", label: "Tempo" },
        { key: "rest", label: "Rest (s)" }
    ]},
    { id: "protocol_adherence", name: "Protocol Adherence", description: "Advised vs Followed workout adherence rates", columns: [
        { key: "client_name", label: "Client" },
        { key: "assigned_workouts", label: "Advised Workouts" },
        { key: "completed_workouts", label: "Followed Workouts" },
        { key: "assigned_sets", label: "Advised Sets" },
        { key: "completed_sets", label: "Followed Sets" },
        { key: "adherence_pct", label: "Adherence %" }
    ]}
  ],
  attendance: [],
  analytics: [
    { id: "revenue_growth", name: "Revenue Growth", description: "Month-over-month revenue analysis", columns: [
        { key: "month", label: "Month" },
        { key: "revenue", label: "Revenue" },
        { key: "growth", label: "Growth %" }
    ]}
  ]
};

export async function generateReportData(module: ReportModule, templateId: string, filters: any) {
    return apiFetch<any[]>('/reports/generate', {
        method: 'POST',
        body: { module, templateId, filters }
    });
}
