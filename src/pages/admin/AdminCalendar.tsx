import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    subDays,
    parseISO
} from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, Clock, Plus, Download, Bell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import AdminAvailability from "./AdminAvailability";
import AppointmentList from "../shared/AppointmentList";
import { AdminBookSessionModal } from "@/components/admin/AdminBookSessionModal";
import { AdminSessionStatusModal } from "@/components/admin/AdminSessionStatusModal";
import { VIPBadge } from "@/components/ui/VIPBadge";
import { WaitlistSidebar } from "@/components/admin/WaitlistSidebar";

type ViewMode = "day" | "week" | "month";

interface SessionEvent {
    id: string;
    client_id: string;
    therapist_id: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    service_id?: string | null;
    service_type: string;
    client: { first_name: string; last_name: string; is_vip?: boolean };
    therapist: { first_name: string; last_name: string; role?: string };
    rawSession: any;
    is_unentitled?: boolean;
    is_pre_unentitled?: boolean;
}

export default function AdminCalendar() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState("master");
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [waitlistInitialData, setWaitlistInitialData] = useState<any>(null);

    // Master Schedule States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [consultants, setConsultants] = useState<{ id: string, name: string, profession?: string | null }[]>([]);
    const [selectedConsultant, setSelectedConsultant] = useState<string>("all");
    const [exporting, setExporting] = useState(false);

    const handleExportDaily = async () => {
        if (!profile?.organization_id) return;
        setExporting(true);
        try {
            const XLSX = await import("xlsx");
            
            const startStr = format(currentDate, "yyyy-MM-dd") + "T00:00:00Z";
            const endStr = format(currentDate, "yyyy-MM-dd") + "T23:59:59Z";

            let query = supabase
                .from("sessions")
                .select(`
                    id, status, scheduled_start, scheduled_end, service_type,
                    client:clients(first_name, last_name, uhid, mobile_no),
                    therapist:profiles!sessions_therapist_id_fkey(first_name, last_name)
                `)
                .eq("organization_id", profile.organization_id)
                .gte("scheduled_start", startStr)
                .lte("scheduled_end", endStr)
                .order("scheduled_start", { ascending: true });

            if (selectedConsultant !== "all") {
                query = query.eq("therapist_id", selectedConsultant);
            }

            const { data, error } = await query;

            if (error) throw error;
            if (!data || data.length === 0) {
                toast({ title: "No Appointments", description: "There are no appointments scheduled for this day to export." });
                return;
            }

            const exportData = (data as any[]).map(session => ({
                "Time": `${format(new Date(session.scheduled_start), "hh:mm a")} - ${format(new Date(session.scheduled_end), "hh:mm a")}`,
                "Specialist": session.therapist ? `${session.therapist.first_name} ${session.therapist.last_name}` : "Unassigned",
                "Client Name": session.client ? `${session.client.first_name} ${session.client.last_name}` : "Unknown",
                "UHID": session.client?.uhid || "-",
                "Mobile": session.client?.mobile_no || "-",
                "Service": session.service_type || "-",
                "Status": session.status || "-"
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Appointments");
            
            const colWidths = [{ wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
            worksheet['!cols'] = colWidths;

            const consultantLabel = selectedConsultant === "all" ? "All" : "Cons";
            const filename = `Appointments_${consultantLabel}_${format(currentDate, "yyyy-MM-dd")}.xlsx`;
            XLSX.writeFile(workbook, filename);
            toast({ title: "Export Successful", description: `Downloaded ${filename}` });
        } catch (error: any) {
            console.error("Export Error: ", error);
            toast({ title: "Export Failed", description: "There was an error generating the Excel file.", variant: "destructive" });
        } finally {
            setExporting(false);
        }
    };

    const handleWaitlistBook = (item: any) => {
        setWaitlistInitialData({
            clientId: item.client_id,
            consultantId: item.therapist_id,
            serviceId: item.service_id,
            sessionDate: item.preferred_date,
            startTime: item.preferred_time_slot,
            preferenceType: item.preference_type
        });
        setIsBookModalOpen(true);
    };

    // Fetch consultants for the filter dropdown
    useEffect(() => {
        async function fetchConsultants() {
            if (!profile?.organization_id) return;

            // 1. Get user IDs that have clinical roles
            const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("user_id")
                .in("role", ["consultant", "sports_physician", "physiotherapist", "nutritionist", "sports_scientist", "massage_therapist"] as any);

            if (roleError) {
                console.error("Error fetching consultant roles:", roleError);
                return;
            }

            if (roleData && roleData.length > 0) {
                const consultantIds = roleData.map(r => r.user_id);

                // 2. Fetch profiles for those IDs within the same org, checking for approval
                const { data: profilesData, error: profileError } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name, profession")
                    .eq("organization_id", profile.organization_id)
                    .in("id", consultantIds)
                    .eq("is_approved", true);

                if (profileError) {
                    console.error("Error fetching consultant profiles:", profileError);
                    return;
                }

                if (profilesData) {
                    setConsultants(profilesData.map(p => ({
                        id: p.id,
                        name: `${p.first_name} ${p.last_name}`,
                        profession: p.profession
                    })));
                }
            }
        }
        fetchConsultants();
    }, [profile?.organization_id]);

    const dateRange = useMemo(() => {
        let start, end;
        if (viewMode === "day") {
            start = startOfDay(currentDate);
            end = endOfDay(currentDate);
        } else if (viewMode === "week") {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
            start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
            end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        }

        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }, [currentDate, viewMode]);

    const { data: waitlistSummary = [] } = useQuery({
        queryKey: ["waitlist-summary", profile?.organization_id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const { data, error } = await (supabase as any)
                .from("waitlist")
                .select("id, preferred_date, status")
                .eq("organization_id", profile.organization_id)
                .eq("status", "Waiting")
                .gte("preferred_date", dateRange.start.split('T')[0])
                .lte("preferred_date", dateRange.end.split('T')[0]);
            if (error) throw error;
            return data || [];
        },
        enabled: !!profile?.organization_id
    });

    const { data: allSessions = [], isLoading, refetch } = useQuery({
        queryKey: ["admin-master-sessions", profile?.organization_id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!profile?.organization_id) return [];

            const { data, error } = await supabase
                .from("sessions")
                .select(`
                     id,
                     client_id,
                     therapist_id,
                     scheduled_start,
                     scheduled_end,
                     status,
                     service_id,
                     service_type,
                     is_unentitled,
                     organization_id,
                     client:clients!sessions_client_id_fkey(first_name, last_name, is_vip),
                     therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, ams_role, profession)
                 `)
                .eq("organization_id", profile.organization_id)
                .gte("scheduled_start", dateRange.start)
                .lt("scheduled_start", dateRange.end) // Fetch sessions that start within the range
                .order("scheduled_start", { ascending: true });

            if (error) throw error;
            return (data as any[]).map(session => ({ ...session, rawSession: session } as SessionEvent));
        },
        enabled: !!profile?.organization_id
    });

    // ── Pre-completion entitlement check for Planned sessions ─────────────────
    // Get unique client IDs that have upcoming Planned sessions
    const plannedClientIds = useMemo(() =>
        [...new Set(allSessions.filter(s => s.status === 'Planned').map(s => s.client_id))],
        [allSessions]
    );

    // Fetch entitlement balances for all those clients in parallel
    const { data: clientEntitlementMap } = useQuery({
        queryKey: ["planned-client-entitlements", plannedClientIds],
        queryFn: async () => {
            if (!plannedClientIds.length) return {};
            const results = await Promise.all(
                plannedClientIds.map(async (clientId) => {
                    const { data } = await supabase.rpc('fn_compute_entitlement_balance', { p_client_id: clientId });
                    const byServiceId: Record<string, number> = {};
                    const byServiceName: Record<string, number> = {};
                    (data ?? []).forEach((b: any) => {
                        if (b.service_id) byServiceId[b.service_id] = b.sessions_remaining;
                        if (b.service_name) byServiceName[b.service_name?.toLowerCase().trim()] = b.sessions_remaining;
                    });
                    return { clientId, byServiceId, byServiceName };
                })
            );
            const map: Record<string, { byServiceId: Record<string, number>, byServiceName: Record<string, number> }> = {};
            results.forEach(({ clientId, byServiceId, byServiceName }) => { map[clientId] = { byServiceId, byServiceName }; });
            return map;
        },
        enabled: plannedClientIds.length > 0,
        staleTime: 30000,
    });

    // Enrich sessions with pre-unentitled flag
    const sessionsWithEntitlementStatus = useMemo(() =>
        allSessions.map(s => {
            if (s.status !== 'Planned') return s;
            const clientBalance = clientEntitlementMap?.[s.client_id];
            
            let hasNoBalance = true;
            if (clientBalance) {
                if (s.service_id && clientBalance.byServiceId[s.service_id] !== undefined) {
                    hasNoBalance = clientBalance.byServiceId[s.service_id] <= 0;
                } else if (s.service_type) {
                    const serviceKey = s.service_type.toLowerCase().trim();
                    hasNoBalance = clientBalance.byServiceName[serviceKey] === undefined || clientBalance.byServiceName[serviceKey] <= 0;
                }
            }
            
            return {
                ...s,
                is_pre_unentitled: hasNoBalance
            };
        }),
        [allSessions, clientEntitlementMap]
    );

    const sessions = useMemo(() => {
        if (selectedConsultant === "all") return sessionsWithEntitlementStatus;
        return sessionsWithEntitlementStatus.filter(s => s.therapist_id === selectedConsultant);
    }, [sessionsWithEntitlementStatus, selectedConsultant]);

    const renderMasterSchedule = () => {
        if (viewMode === "month") return renderMonthView();
        if (viewMode === "week") return renderWeekView();
        return renderDayView();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Planned': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Completed': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'Missed': return 'bg-red-100 text-red-800 border-red-200';
            case 'Rescheduled': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'Checked In': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-primary/10 text-primary border-primary/20';
        }
    };

    // --- Views --- //
    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = [];

        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const formattedDate = format(cloneDay, "d");
                const dayEvents = sessions.filter(s => isSameDay(parseISO(s.scheduled_start), cloneDay));
                const hasWaitlist = waitlistSummary.some((w: any) => isSameDay(parseISO(w.preferred_date), cloneDay));

                days.push(
                    <div
                        key={cloneDay.toString()}
                        className={`min-h-[120px] p-2 border border-border/50 transition-colors relative ${!isSameMonth(cloneDay, monthStart)
                            ? "bg-muted/30 text-muted-foreground opacity-50"
                            : isSameDay(cloneDay, new Date())
                                ? "bg-primary/5"
                                : "bg-card"
                            }`}
                    >
                        {hasWaitlist && isSameMonth(cloneDay, monthStart) && (
                            <div 
                                className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)] z-10" 
                                title="Active Waitlist Entries" 
                            />
                        )}
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(cloneDay, new Date()) ? "bg-primary text-primary-foreground" : ""}`}>
                                {formattedDate}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => setSelectedSession(event)}
                                    className={`text-xs p-1.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
                                >
                                    <span className="font-semibold">{format(parseISO(event.scheduled_start), "HH:mm")}</span>
                                    {" "}
                                    <span className={event.client?.is_vip ? "text-[#D4AF37] font-bold" : ""}>
                                        {event.client?.first_name} {event.client?.last_name}
                                    </span>
                                    <VIPBadge isVIP={event.client?.is_vip} iconOnly size="sm" className="ml-1 inline-flex" />
                                    {event.is_unentitled && (
                                        <span className="ml-1 px-1 bg-red-500 text-white rounded-[2px] text-[8px] font-bold animate-pulse">
                                            UN
                                        </span>
                                    )}
                                    {(event as any).is_pre_unentitled && (
                                        <span className="ml-1 px-1 bg-orange-400 text-white rounded-[2px] text-[8px] font-bold" title="Client has no entitlements for this service">
                                            ⚠
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
        }

        return (
            <div className="grid grid-cols-7 border-t border-l border-border/50 rounded-lg overflow-hidden">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
                    <div key={dayName} className="p-3 text-center text-sm font-medium bg-muted/50 border-b border-r border-border/50">
                        {dayName}
                    </div>
                ))}
                <div className="col-span-7 grid grid-cols-7 border-r border-b border-border/50">
                    {days.map((day, idx) => (
                        <div key={idx}>{day}</div>
                    ))}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start, end: addDays(start, 6) });
        const hours = Array.from({ length: 13 }, (_, i) => i + 8);

        return (
            <div className="flex flex-col border border-border/50 rounded-lg overflow-hidden bg-card">
                <div className="flex border-b border-border/50 bg-muted/50">
                    <div className="w-16 border-r border-border/50 shrink-0"></div>
                    {weekDays.map(day => (
                        <div key={day.toString()} className={`flex-1 p-3 text-center border-r border-border/50 last:border-r-0 ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}>
                            <div className="text-xs uppercase text-muted-foreground font-medium">{format(day, 'EEE')}</div>
                            <div className={`text-lg font-medium w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1 ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""}`}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative overflow-y-auto max-h-[600px] flex">
                    <div className="w-16 shrink-0 border-r border-border/50 bg-muted/10 relative z-10">
                        {hours.map(hour => (
                            <div key={hour} className="h-20 border-b border-border/50 text-xs text-muted-foreground text-center pt-2 font-medium">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-1 relative">
                        <div className="absolute inset-0 flex">
                            {weekDays.map(day => (
                                <div key={`bg-${day}`} className="flex-1 border-r border-border/50 last:border-r-0">
                                    {hours.map(hour => (
                                        <div key={`cell-${day}-${hour}`} className="h-20 border-b border-border/50/50"></div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="absolute inset-0 flex">
                            {weekDays.map(day => {
                                const dayEvents = sessions.filter(s => isSameDay(parseISO(s.scheduled_start), day));
                                return (
                                    <div key={`ev-${day}`} className="flex-1 relative border-r border-transparent">
                                        {dayEvents.map(event => {
                                            const startD = parseISO(event.scheduled_start);
                                            const endD = parseISO(event.scheduled_end);

                                            const startHour = startD.getHours() + (startD.getMinutes() / 60);
                                            const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                                            const topPos = Math.max(0, (startHour - 8) * 80);
                                            const height = durationHours * 80;

                                            if (startHour > 20 || endD.getHours() < 8) return null;

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => setSelectedSession(event)}
                                                    className={`absolute left-1 right-1 rounded border p-1.5 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all ${getStatusColor(event.status)}`}
                                                    style={{ top: `${topPos}px`, height: `${height}px`, minHeight: '24px' }}
                                                >
                                                    <div className="text-xs font-semibold">{format(startD, "HH:mm")} - {format(endD, "HH:mm")}</div>
                                                    <div className={cn("text-[10px] truncate font-medium flex items-center gap-1", event.client?.is_vip && "text-[#D4AF37] font-bold")}>
                                                        C: {event.client?.first_name} {event.client?.last_name}
                                                        <VIPBadge isVIP={event.client?.is_vip} iconOnly size="sm" />
                                                    </div>
                                                    {selectedConsultant === "all" && height > 40 && (
                                                        <div className="text-[10px] truncate opacity-80 mt-0.5 border-t border-current/20 pt-0.5">
                                                            {event.therapist?.first_name} {event.therapist?.last_name}
                                                        </div>
                                                    )}
                                                    {event.is_unentitled && (
                                                        <div className="mt-1 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded flex items-center gap-1 animate-pulse">
                                                            <Filter className="w-2.5 h-2.5" /> UN-ENTITLED
                                                        </div>
                                                    )}
                                                    {(event as any).is_pre_unentitled && (
                                                        <div className="mt-1 px-1.5 py-0.5 bg-orange-400 text-white text-[9px] font-bold rounded flex items-center gap-1">
                                                            ⚠ NO ENT
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const hours = Array.from({ length: 13 }, (_, i) => i + 8);
        const dayEvents = sessions.filter(s => isSameDay(parseISO(s.scheduled_start), currentDate));

        return (
            <div className="border border-border/50 rounded-lg overflow-hidden bg-card flex flex-col">
                <div className="p-4 border-b border-border/50 bg-muted/30 flex justify-between items-center">
                    <div>
                        <div className="text-lg font-semibold text-primary">{format(currentDate, "EEEE")}</div>
                        <div className="text-muted-foreground">{format(currentDate, "MMMM d, yyyy")}</div>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {dayEvents.length} Sessions Scheduled
                    </div>
                </div>

                <div className="relative overflow-y-auto max-h-[600px] flex p-4">
                    <div className="w-20 shrink-0 border-r border-border/50 relative z-10 pr-4">
                        {hours.map(hour => (
                            <div key={hour} className="h-24 border-b border-border/50 text-sm text-muted-foreground text-right pt-2 font-medium pr-2">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative pl-4">
                        <div className="absolute inset-0 pl-4">
                            {hours.map(hour => (
                                <div key={`cell-${hour}`} className="h-24 border-b border-border/50/50 w-full"></div>
                            ))}
                        </div>

                        {dayEvents.map((event, index) => {
                            const startD = parseISO(event.scheduled_start);
                            const endD = parseISO(event.scheduled_end);

                            const startHour = startD.getHours() + (startD.getMinutes() / 60);
                            const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                            const topPos = Math.max(0, (startHour - 8) * 96);
                            const height = durationHours * 96;

                            if (startHour > 20 || endD.getHours() < 8) return null;

                            const overlapping = dayEvents.filter(e => e.id !== event.id && e.scheduled_start === event.scheduled_start);
                            const myIndex = dayEvents.filter(e => e.scheduled_start === event.scheduled_start).findIndex(e => e.id === event.id);

                            const widthPercent = overlapping.length > 0 ? 100 / (overlapping.length + 1) : 100;
                            const leftPos = overlapping.length > 0 ? (myIndex * widthPercent) : 0;

                            return (
                                <div
                                    key={event.id}
                                    onClick={() => setSelectedSession(event)}
                                    className={`absolute rounded-lg border p-3 flex flex-col justify-start shadow-sm hover:shadow hover:z-20 transition-all cursor-pointer ${getStatusColor(event.status)}`}
                                    style={{
                                        top: `${topPos + 8}px`,
                                        height: `${height - 16}px`,
                                        minHeight: '60px',
                                        left: `calc(1rem + ${leftPos}%)`,
                                        width: `calc(${widthPercent}% - 1.5rem)`
                                    }}
                                >
                                    <div className="font-semibold text-xs mb-1">
                                        {format(startD, "h:mm a")} - {format(endD, "h:mm a")}
                                    </div>
                                    <div className={cn("font-medium text-sm truncate flex items-center gap-2", event.client?.is_vip && "text-[#D4AF37] font-bold")}>
                                        C: {event.client?.first_name} {event.client?.last_name}
                                        <VIPBadge isVIP={event.client?.is_vip} size="sm" />
                                    </div>
                                    {selectedConsultant === "all" && (
                                        <div className="text-xs truncate opacity-80 mt-1 flex items-center gap-1">
                                            {event.therapist?.first_name} {event.therapist?.last_name}
                                        </div>
                                    )}
                                    {event.is_unentitled && (
                                        <div className="mt-2 px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-md flex items-center gap-1.5 animate-pulse w-fit">
                                            <Filter className="w-3 h-3" /> UN-ENTITLED SESSION
                                        </div>
                                    )}
                                    {(event as any).is_pre_unentitled && (
                                        <div className="mt-2 px-2 py-1 bg-orange-400 text-white text-[10px] font-bold rounded-md flex items-center gap-1.5 w-fit" title="Client has no entitlements for this service">
                                            ⚠ NO ENTITLEMENT
                                        </div>
                                    )}

                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout role="admin">
            <div className="max-w-7xl mx-auto space-y-6 pb-10 fade-in animate-in">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                        Clinic Calendar & Scheduling
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage all clinic schedules, appointments, and availability settings</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="w-full overflow-x-auto custom-scrollbar pb-2 mb-4 -mx-1 px-1 sm:mx-0 sm:px-0">
                        <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 min-w-max md:min-w-0 md:max-w-3xl">
                        <TabsTrigger value="master" className="flex items-center gap-2 px-4 py-2 whitespace-nowrap">
                            <CalendarIcon className="w-4 h-4" />
                            Master Schedule
                        </TabsTrigger>
                        <TabsTrigger value="appointments" className="flex items-center gap-2 px-4 py-2 whitespace-nowrap">
                            <Layers className="w-4 h-4" />
                            Appointments List
                        </TabsTrigger>
                        <TabsTrigger value="availability" className="flex items-center gap-2 px-4 py-2 whitespace-nowrap">
                            <Clock className="w-4 h-4" />
                            Availability Settings
                        </TabsTrigger>
                    </TabsList>
                    </div>

                    <TabsContent value="master" className="space-y-6 mt-0">
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" onClick={() => setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : viewMode === "week" ? subWeeks(currentDate, 1) : subDays(currentDate, 1))}>
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <h2 className="text-lg font-semibold min-w-[200px] text-center">
                                                {format(currentDate, viewMode === "month" ? "MMMM yyyy" : "MMMM d, yyyy")}
                                            </h2>
                                            <Button variant="outline" size="icon" onClick={() => setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : viewMode === "week" ? addWeeks(currentDate, 1) : addDays(currentDate, 1))}>
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-2 font-bold uppercase text-[10px] tracking-widest bg-primary/5 text-primary hover:bg-primary/10">Today</Button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                                                <SelectTrigger className="w-[200px] h-9 bg-background"><SelectValue placeholder="All Specialists" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all" className="text-xs font-bold">ALL SPECIALISTS</SelectItem>
                                                    {consultants.map(c => (
                                                        <SelectItem key={c.id} value={c.id} className="text-xs uppercase font-medium">
                                                            {c.name} {c.profession ? `(${c.profession})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <div className="flex bg-muted p-1 rounded-lg border border-border/50">
                                                {(["day", "week", "month"] as ViewMode[]).map((m) => (
                                                    <Button key={m} variant={viewMode === m ? "default" : "ghost"} size="sm" onClick={() => setViewMode(m)} className={cn("h-7 px-3 text-[10px] font-bold uppercase", viewMode === m && "shadow-sm")}>
                                                        {m}
                                                    </Button>
                                                ))}
                                            </div>

                                            <Button variant="outline" size="sm" className="h-9 gap-2 font-bold text-[10px] uppercase tracking-wider" onClick={handleExportDaily} disabled={exporting}>
                                                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-primary" />}
                                                Export
                                            </Button>
                                            
                                            <Button size="sm" className="h-9 gap-2 font-bold text-[10px] uppercase tracking-widest pl-3 pr-4 shadow-lg active:scale-95 transition-transform" onClick={() => { setWaitlistInitialData(null); setIsBookModalOpen(true); }}>
                                                <Plus className="w-3.5 h-3.5" /> Schedule
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-xl overflow-hidden p-3 min-h-[600px] transition-all relative">
                                        {isLoading ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-50">
                                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                                                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Syncing Appointments</p>
                                            </div>
                                        ) : null}
                                        {renderMasterSchedule()}
                                    </div>
                                </div>
                                <div className="hidden lg:block">
                                    <WaitlistSidebar 
                                        selectedDate={currentDate} 
                                        onBook={handleWaitlistBook} 
                                    />
                                </div>
                            </div>
                        </TabsContent>

                    <TabsContent value="appointments" className="mt-0 outline-none">
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <AppointmentList role="admin" hideLayout />
                        </div>
                    </TabsContent>

                    <TabsContent value="availability" className="mt-0 outline-none">
                        <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6">
                            <AdminAvailability hideLayout />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <AdminBookSessionModal 
                open={isBookModalOpen} 
                onOpenChange={(open) => {
                    setIsBookModalOpen(open);
                    if (!open) setWaitlistInitialData(null);
                }} 
                onSuccess={refetch} 
                initialData={waitlistInitialData}
            />

            <AdminSessionStatusModal
                open={!!selectedSession}
                onOpenChange={(open) => !open && setSelectedSession(null)}
                session={selectedSession}
                onSuccess={refetch}
            />
        </DashboardLayout>
    );
}
