import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
    
    switch (module) {
        case "registration":
            if (templateId === "client_list") {
                const { startDate, endDate } = filters;
                let query = supabase
                    .from("clients")
                    .select("uhid, first_name, last_name, email, mobile_no, registered_on")
                    .is("deleted_at", null)
                    .order("registered_on", { ascending: false });
                
                if (startDate) query = query.gte('registered_on', startDate);
                if (endDate) query = query.lte('registered_on', endDate);

                const { data, error } = await query;
                
                if (error) throw error;
                return (data || []).map(c => ({
                    ...c,
                    full_name: `${c.first_name} ${c.last_name}`,
                    registered_on: c.registered_on ? format(new Date(c.registered_on), "dd-MM-yyyy HH:mm:ss") : "—"
                }));
            }
            break;
        
        case "billing":

            if (templateId === "full_transaction_ledger") {
                const { startDate, endDate } = filters;
                
                let bQuery = supabase.from("bills").select("id, invoice_number, total, status, payment_method, created_at, billed_by_name, billing_staff_name, clients(first_name, last_name)").order("created_at", { ascending: false });
                let rQuery = (supabase as any).from("refunds").select("id, amount, refund_mode, is_entitlement_reversed, created_at, authorized_by, bill_id, clients(first_name, last_name)").order("created_at", { ascending: false });

                if (startDate) {
                    bQuery = bQuery.gte('created_at', startDate);
                    rQuery = rQuery.gte('created_at', startDate);
                }
                if (endDate) {
                    bQuery = bQuery.lte('created_at', endDate);
                    rQuery = rQuery.lte('created_at', endDate);
                }

                const [{ data: billsData, error: bErr }, { data: refundsData, error: rErr }] = await Promise.all([
                    bQuery,
                    rQuery
                ]);
                if (bErr) throw bErr;
                if (rErr) throw rErr;

                const bills = (billsData as any[]).map(b => ({
                    date: format(new Date(b.created_at), "dd-MM-yyyy HH:mm:ss"),
                    type: "INVOICE",
                    reference: b.invoice_number || b.id.substring(0, 8).toUpperCase(),
                    client_name: b.clients ? `${(b.clients as any).first_name} ${(b.clients as any).last_name}` : "Unknown",
                    staff: b.billed_by_name || b.billing_staff_name || "System",
                    amount: `Rs. ${Number(b.total).toFixed(2)}`,
                    mode: b.payment_method || "—",
                    status: b.status,
                    entitlement_status: "—",
                    _date: new Date(b.created_at).getTime()
                }));

                const refunds = (refundsData as any[]).map(r => ({
                    date: format(new Date(r.created_at), "dd-MM-yyyy HH:mm:ss"),
                    type: "REFUND",
                    reference: r.id.substring(0, 8).toUpperCase(),
                    client_name: r.clients ? `${(r.clients as any).first_name} ${(r.clients as any).last_name}` : "Unknown",
                    staff: r.authorized_by || "—",
                    amount: `− Rs. ${Number(r.amount).toFixed(2)}`,
                    mode: r.refund_mode,
                    status: "Refunded",
                    entitlement_status: r.is_entitlement_reversed ? "Reversed" : "Retained",
                    _date: new Date(r.created_at).getTime()
                }));

                return [...bills, ...refunds].sort((a, b) => b._date - a._date);
            }
            if (templateId === "refund_summary") {
                const { startDate, endDate } = filters;
                let query = (supabase as any)
                    .from("refunds")
                    .select("id, amount, refund_mode, authorized_by, is_entitlement_reversed, created_at, bill_id, clients(first_name, last_name)")
                    .order("created_at", { ascending: false });
                
                if (startDate) query = query.gte('created_at', startDate);
                if (endDate) query = query.lte('created_at', endDate);

                const { data, error } = await query;
                if (error) throw error;
                return (data as any[]).map(r => ({
                    date: format(new Date(r.created_at), "dd-MM-yyyy HH:mm:ss"),
                    reference: r.id.substring(0, 8).toUpperCase(),
                    client_name: r.clients ? `${(r.clients as any).first_name} ${(r.clients as any).last_name}` : "Unknown",
                    original_invoice: r.bill_id ? r.bill_id.substring(0, 8).toUpperCase() : "—",
                    amount: `Rs. ${Number(r.amount).toFixed(2)}`,
                    mode: r.refund_mode,
                    authorized_by: r.authorized_by || "—",
                    entitlements_reversed: r.is_entitlement_reversed ? "Yes — Reversed" : "No — Retained",
                }));
            }
            if (templateId === "user_revenue_summary") {
                const { startDate, endDate, paymentMode } = filters;
                
                let bQuery = supabase.from("bills").select("total, payment_method, billed_by_name, billing_staff_name, created_at").eq("status", "Paid");
                let rQuery = (supabase as any).from("refunds").select("amount, refund_mode, created_at, bills(billed_by_name, billing_staff_name)");

                if (startDate) {
                    bQuery = bQuery.gte('created_at', startDate);
                    rQuery = rQuery.gte('created_at', startDate);
                }
                if (endDate) {
                    bQuery = bQuery.lte('created_at', endDate);
                    rQuery = rQuery.lte('created_at', endDate);
                }
                if (paymentMode) {
                    bQuery = bQuery.eq('payment_method', paymentMode);
                    rQuery = rQuery.eq('refund_mode', paymentMode);
                }

                const [{ data: bills, error: bErr }, { data: refunds, error: rErr }] = await Promise.all([bQuery, rQuery]);
                if (bErr) throw bErr;
                if (rErr) throw rErr;

                const staffMap: Record<string, Record<string, number>> = {};
                
                (bills || []).forEach(b => {
                    const staff = b.billed_by_name || b.billing_staff_name || 'System';
                    const mode = b.payment_method || 'Other';
                    if (!staffMap[staff]) staffMap[staff] = {};
                    staffMap[staff][mode] = (staffMap[staff][mode] || 0) + Number(b.total);
                });

                (refunds || []).forEach(r => {
                    const staff = (r.bills as any)?.billed_by_name || (r.bills as any)?.billing_staff_name || 'System';
                    const mode = r.refund_mode || 'Other';
                    if (!staffMap[staff]) staffMap[staff] = {};
                    staffMap[staff][mode] = (staffMap[staff][mode] || 0) - Number(r.amount);
                });

                const result: any[] = [];
                let clinicTotal = 0;

                Object.keys(staffMap).sort().forEach(staff => {
                    let staffTotal = 0;
                    const modes = staffMap[staff];
                    const modeKeys = Object.keys(modes).sort();
                    
                    modeKeys.forEach((mode, index) => {
                        const amount = modes[mode];
                        staffTotal += amount;
                        clinicTotal += amount;
                        
                        result.push({
                            staff_member: staff,
                            payment_mode: mode,
                            mode_total: `Rs. ${amount.toFixed(2)}`,
                            staff_total: index === modeKeys.length - 1 ? `Rs. ${staffTotal.toFixed(2)}` : "",
                            _isStaffTotal: index === modeKeys.length - 1
                        });
                    });
                });

                if (result.length > 0) {
                    result.push({
                        staff_member: "CLINIC-WIDE TOTAL",
                        payment_mode: "—",
                        mode_total: "—",
                        staff_total: `Rs. ${clinicTotal.toFixed(2)}`,
                        _isGrandTotal: true
                    });
                }

                return result;
            }
            break;
        case "clients":
            if (templateId === "workout_schedule") {
                const { athleteId, startDate, endDate } = filters;
                if (!athleteId) throw new Error("Athlete selection required");

                let query = supabase
                    .from('program_assignments' as any)
                    .select(`
                        id,
                        start_date,
                        program:training_programs(
                            name,
                            days:workout_days(
                                title,
                                display_order,
                                items:workout_items(
                                    display_order,
                                    lift_items(
                                        sets,
                                        reps,
                                        load_value,
                                        tempo,
                                        rest_time_secs,
                                        workout_grouping,
                                        exercise:exercises(name)
                                    )
                                )
                            )
                        )
                    `)
                    .eq('athlete_id', athleteId)
                    .eq('status', 'active');

                if (startDate) query = query.gte('start_date', startDate);
                if (endDate) query = query.lte('start_date', endDate); // Simplified date logic for now

                const { data, error } = await query;
                if (error) throw error;

                const flattened: any[] = [];
                (data as any[]).forEach(assignment => {
                    const baseDate = new Date(assignment.start_date);
                    assignment.program?.days?.forEach((day: any) => {
                        const workoutDate = new Date(baseDate);
                        workoutDate.setDate(baseDate.getDate() + (day.display_order || 0));
                        
                        day.items?.forEach((item: any) => {
                            const lift = item.lift_items;
                            if (!lift) return;
                            
                            flattened.push({
                                date: format(workoutDate, 'dd-MM-yyyy'),
                                workout_title: day.title,
                                exercise_name: lift.exercise?.name || 'Unknown',
                                workout_grouping: lift.workout_grouping || '-',
                                sets: lift.sets,
                                reps: lift.reps,
                                weight: lift.load_value,
                                tempo: lift.tempo,
                                rest: lift.rest_time_secs
                            });
                        });
                    });
                });

                return flattened.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }

            if (templateId === "protocol_adherence") {
                const { startDate, endDate, athleteId } = filters;
                
                // 1. Fetch all assigned workout days and their items
                let assignmentsQuery = supabase
                    .from('program_assignments' as any)
                    .select(`
                        athlete_id,
                        start_date,
                        profiles!athlete_id(first_name, last_name),
                        program:training_programs(
                            days:workout_days(
                                items:workout_items(
                                    lift_items(sets)
                                )
                            )
                        )
                    `)
                    .eq('status', 'active');

                if (athleteId) assignmentsQuery = assignmentsQuery.eq('athlete_id', athleteId);
                if (startDate) assignmentsQuery = assignmentsQuery.gte('start_date', startDate);
                if (endDate) assignmentsQuery = assignmentsQuery.lte('start_date', endDate);

                const { data: assignments, error: aError } = await assignmentsQuery;
                if (aError) throw aError;

                // 2. Fetch all completions for the same period
                let completionsQuery = supabase
                    .from('athlete_workout_completions' as any)
                    .select('id, athlete_id, workout_day_id');
                
                if (startDate) completionsQuery = completionsQuery.gte('completed_at', startDate);
                if (endDate) completionsQuery = completionsQuery.lte('completed_at', endDate);

                const { data: completions, error: cError } = await completionsQuery;
                if (cError) throw cError;

                // 3. Fetch all item logs for the completions
                const completionIds = (completions as any[]).map(c => c.id);
                let logs: any[] = [];
                if (completionIds.length > 0) {
                    const { data: logsData, error: lError } = await supabase
                        .from('athlete_item_logs' as any)
                        .select('completion_id, is_completed')
                        .in('completion_id', completionIds)
                        .eq('is_completed', true);
                    if (lError) throw lError;
                    logs = logsData || [];
                }

                // 4. Aggregate by Athlete
                const reportMap: Record<string, any> = {};

                (assignments as any[]).forEach(assignment => {
                    const athleteId = assignment.athlete_id;
                    const name = `${assignment.profiles?.first_name} ${assignment.profiles?.last_name}`;
                    
                    if (!reportMap[athleteId]) {
                        reportMap[athleteId] = {
                            client_name: name,
                            assigned_workouts: 0,
                            completed_workouts: 0,
                            assigned_sets: 0,
                            completed_sets: 0,
                        };
                    }

                    const stats = reportMap[athleteId];
                    const days = assignment.program?.days || [];
                    stats.assigned_workouts += days.length;
                    
                    days.forEach((day: any) => {
                        day.items?.forEach((item: any) => {
                            stats.assigned_sets += item.lift_items?.sets || 0;
                        });
                    });
                });

                // Add completion counts
                (completions as any[]).forEach(completion => {
                    if (reportMap[completion.athlete_id]) {
                        reportMap[completion.athlete_id].completed_workouts += 1;
                    }
                });

                // Add set log counts
                const logsByCompletion = logs.reduce((acc, log) => {
                    acc[log.completion_id] = (acc[log.completion_id] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                (completions as any[]).forEach(completion => {
                    if (reportMap[completion.athlete_id]) {
                        reportMap[completion.athlete_id].completed_sets += (logsByCompletion[completion.id] || 0);
                    }
                });

                // Calculate final percentages
                return Object.values(reportMap).map(stats => ({
                    ...stats,
                    adherence_pct: stats.assigned_sets > 0 
                        ? `${Math.round((stats.completed_sets / stats.assigned_sets) * 100)}%`
                        : stats.assigned_workouts > 0 ? "0%" : "N/A"
                })).sort((a, b) => b.completed_workouts - a.completed_workouts);
            }
            break;
            
        // ... more query logic can be added here
    }
    
    return [];
}
