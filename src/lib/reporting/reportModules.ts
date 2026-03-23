import { supabase } from "@/integrations/supabase/client";

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
    { id: "invoice_summary", name: "Invoice Summary", description: "Summary of all generated invoices", columns: [
        { key: "id", label: "Invoice #" },
        { key: "client_name", label: "Client" },
        { key: "total", label: "Amount" },
        { key: "status", label: "Status" },
        { key: "transaction_id", label: "Transaction ID" },
        { key: "created_at", label: "Date" }
    ]},
    { id: "revenue_by_service", name: "Revenue by Service", description: "Financial breakdown by service type", columns: [
        { key: "service_type", label: "Service" },
        { key: "revenue", label: "Revenue" }
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
  clients: [],
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
    console.log(`Generating report for ${module}:${templateId}`, filters);
    
    switch (module) {
        case "registration":
            if (templateId === "client_list") {
                const { data, error } = await supabase
                    .from("clients")
                    .select("uhid, first_name, last_name, email, mobile_no, registered_on")
                    .is("deleted_at", null)
                    .order("registered_on", { ascending: false });
                
                if (error) throw error;
                return data.map(c => ({
                    ...c,
                    full_name: `${c.first_name} ${c.last_name}`
                }));
            }
            break;
        
        case "billing":
            if (templateId === "invoice_summary") {
                const { data, error } = await supabase
                    .from("bills")
                    .select("id, total, status, transaction_id, created_at, clients(first_name, last_name)")
                    .order("created_at", { ascending: false });
                
                if (error) throw error;
                return (data as any[]).map(b => ({
                    ...b,
                    client_name: b.clients ? `${(b.clients as any).first_name} ${(b.clients as any).last_name}` : "Unknown"
                }));
            }
            break;
            
        // ... more query logic can be added here
    }
    
    return [];
}
