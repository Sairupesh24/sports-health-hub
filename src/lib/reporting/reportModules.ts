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
                                date: format(workoutDate, 'yyyy-MM-dd'),
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
