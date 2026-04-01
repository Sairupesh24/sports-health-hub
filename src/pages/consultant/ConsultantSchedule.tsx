import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
    format,
    addDays,
    subDays,
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
    parseISO
} from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, ClipboardList, AlertTriangle } from "lucide-react";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";

type ViewMode = "day" | "week" | "month";

interface SessionEvent {
    id: string;
    client_id: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    service_id?: string | null;
    service_type: string;
    client: { first_name: string; last_name: string; is_vip?: boolean };
    rawSession: any; // For passing to SOAP Modal
    is_unentitled?: boolean;
    is_pre_unentitled?: boolean;
}

export default function ConsultantSchedule() {
    const { profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("month");

    // Modal states
    const [soapModalOpen, setSoapModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>("");

    // Calculate date ranges for data fetching based on current view to ensure we have all needed data
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

        // Add a buffer to ensure timezone differences don't cut off sessions at the edges
        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }, [currentDate, viewMode]);

    const { data: sessions = [], isLoading, refetch } = useQuery({
        queryKey: ["consultant-sessions", profile?.id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!profile?.id) return [];

            const { data, error } = await supabase
                .from("sessions")
                .select(`
          id,
          client_id,
          scheduled_start,
          scheduled_end,
          status,
          service_id,
          service_type,
          is_unentitled,
          client:clients!sessions_client_id_fkey(first_name, last_name, is_vip),
          physio_session_details(*)
        `)
                .eq("therapist_id", profile.id)
                .gte("scheduled_start", dateRange.start)
                .lte("scheduled_end", dateRange.end)
                .order("scheduled_start", { ascending: true });

            if (error) throw error;

            return (data as any[]).map(session => {
                // Determine end time from DB or fallback to 60 mins after start
                let endDateStr = session.scheduled_end;
                if (!endDateStr) {
                    const startDate = new Date(session.scheduled_start);
                    endDateStr = new Date(startDate.getTime() + 60 * 60000).toISOString();
                }

                return {
                    ...session,
                    scheduled_end: endDateStr,
                    rawSession: session
                } as SessionEvent;
            });
        },
        enabled: !!profile?.id
    });

    // ── Pre-completion entitlement check for Planned sessions ─────────────────
    const plannedClientIds = useMemo(() =>
        [...new Set(sessions.filter((s: any) => s.status === 'Planned').map((s: any) => s.client_id))],
        [sessions]
    );

    const { data: clientEntitlementMap } = useQuery({
        queryKey: ["consultant-planned-entitlements", plannedClientIds],
        queryFn: async () => {
            if (!plannedClientIds.length) return {};
            const results = await Promise.all(
                plannedClientIds.map(async (clientId: string) => {
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

    const enrichedSessions = useMemo(() =>
        sessions.map((s: any) => {
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
        [sessions, clientEntitlementMap]
    );

    // Query: Completed sessions with no SOAP notes (pending)
    const { data: pendingSoapSessions = [] } = useQuery({
        queryKey: ["pending-soap-notes", profile?.id],
        queryFn: async () => {
            if (!profile?.id) return [];
            const { data, error } = await supabase
                .from("sessions")
                .select(`
                    id, client_id, scheduled_start, service_type, organization_id,
                    client:clients!sessions_client_id_fkey(first_name, last_name, is_vip),
                    physio_session_details(session_id)
                `)
                .eq("therapist_id", profile.id)
                .eq("status", "Completed")
                .order("scheduled_start", { ascending: false })
                .limit(50);
            if (error) throw error;
            // Only keep sessions that have NO physio_session_details
            return (data ?? []).filter((s: any) =>
                !s.physio_session_details || (Array.isArray(s.physio_session_details) && s.physio_session_details.length === 0)
            );
        },
        enabled: !!profile?.id,
        refetchInterval: 60000,
    });

    // Navigation handlers
    const handlePrev = () => {
        if (viewMode === "day") setCurrentDate(prev => subDays(prev, 1));
        else if (viewMode === "week") setCurrentDate(prev => subWeeks(prev, 1));
        else setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNext = () => {
        if (viewMode === "day") setCurrentDate(prev => addDays(prev, 1));
        else if (viewMode === "week") setCurrentDate(prev => addWeeks(prev, 1));
        else setCurrentDate(prev => addMonths(prev, 1));
    };

    const handleToday = () => setCurrentDate(new Date());

    const handleEventClick = (event: SessionEvent) => {
        setSelectedSession(event.rawSession);
        setSelectedClientId(event.client_id);
        setSoapModalOpen(true);
    };

    // Helper to format the view's current title
    const getHeaderTitle = () => {
        if (viewMode === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
        if (viewMode === "week") {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            if (isSameMonth(start, end)) return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
            return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
        }
        return format(currentDate, "MMMM yyyy");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Planned': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Completed': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'Missed': return 'bg-red-100 text-red-800 border-red-200';
            case 'Rescheduled': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-primary/10 text-primary border-primary/20';
        }
    };

    // --- Views rendering functions --- //

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const dateFormat = "d";
        const days = [];

        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                // Find events for this day
                const dayEvents = enrichedSessions.filter(session => isSameDay(parseISO(session.scheduled_start), cloneDay));

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[120px] p-2 border border-border/50 transition-colors ${!isSameMonth(day, monthStart)
                            ? "bg-muted/30 text-muted-foreground opacity-50"
                            : isSameDay(day, new Date())
                                ? "bg-primary/5"
                                : "bg-card"
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""
                                }`}>
                                {formattedDate}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className={`text-xs p-1.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
                                >
                                    <span className="font-semibold">{format(parseISO(event.scheduled_start), "HH:mm")}</span>
                                    {" "}
                                    <VIPName name={`${event.client?.first_name} ${event.client?.last_name}`} isVIP={event.client?.is_vip} />
                                    {event.is_unentitled && (
                                        <span className="ml-1 px-1 bg-red-500 text-white rounded-[2px] text-[8px] font-bold animate-pulse">
                                            UN
                                        </span>
                                    )}
                                    {(event as any).is_pre_unentitled && (
                                        <span className="ml-1 px-1 bg-orange-400 text-white rounded-[2px] text-[8px] font-bold" title="No entitlement for this service">
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
        const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

        return (
            <div className="flex flex-col border border-border/50 rounded-lg overflow-hidden bg-card">
                {/* Header row */}
                <div className="flex border-b border-border/50 bg-muted/50">
                    <div className="w-16 border-r border-border/50 shrink-0"></div> {/* Time column spacer */}
                    {weekDays.map(day => (
                        <div key={day.toString()} className={`flex-1 p-3 text-center border-r border-border/50 last:border-r-0 ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}>
                            <div className="text-xs uppercase text-muted-foreground font-medium">{format(day, 'EEE')}</div>
                            <div className={`text-lg font-medium w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1 ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : ""}`}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grid body */}
                <div className="relative overflow-y-auto max-h-[600px] flex">
                    {/* Time column */}
                    <div className="w-16 shrink-0 border-r border-border/50 bg-muted/10 relative z-10">
                        {hours.map(hour => (
                            <div key={hour} className="h-20 border-b border-border/50 text-xs text-muted-foreground text-center pt-2 font-medium">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Days columns container */}
                    <div className="flex flex-1 relative">
                        {/* Background grid */}
                        <div className="absolute inset-0 flex">
                            {weekDays.map(day => (
                                <div key={`bg-${day}`} className="flex-1 border-r border-border/50 last:border-r-0">
                                    {hours.map(hour => (
                                        <div key={`cell-${day}-${hour}`} className="h-20 border-b border-border/50/50"></div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Events */}
                        <div className="absolute inset-0 flex">
                            {weekDays.map(day => {
                                const dayEvents = enrichedSessions.filter(s => isSameDay(parseISO(s.scheduled_start), day));
                                return (
                                    <div key={`ev-${day}`} className="flex-1 relative border-r border-transparent">
                                        {dayEvents.map(event => {
                                            const startD = parseISO(event.scheduled_start);
                                            const endD = parseISO(event.scheduled_end);

                                            // Calculate position (8AM = 0px, 1 hour = 80px)
                                            const startHour = startD.getHours() + (startD.getMinutes() / 60);
                                            const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                                            // Map to top pos relative to 6AM
                                            const topPos = Math.max(0, (startHour - 6) * 80);
                                            const height = durationHours * 80;

                                            // Don't render events fully outside the 6am-10pm window
                                            if (startHour > 22 || endD.getHours() < 6) return null;

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => handleEventClick(event)}
                                                    className={`absolute left-1 right-1 rounded border p-1.5 overflow-hidden shadow-sm hover:shadow-md hover:z-20 cursor-pointer transition-all ${getStatusColor(event.status)}`}
                                                    style={{ top: `${topPos}px`, height: `${height}px`, minHeight: '24px' }}
                                                >
                                                    <div className="text-xs font-semibold">{format(startD, "HH:mm")} - {format(endD, "HH:mm")}</div>
                                                    <div className="text-xs truncate font-medium">
                                                        <VIPName name={`${event.client?.first_name} ${event.client?.last_name}`} isVIP={event.client?.is_vip} />
                                                    </div>
                                                    {height > 40 && <div className="text-xs truncate opacity-80 mt-0.5">{event.service_type}</div>}
                                                    {event.is_unentitled && (
                                                        <div className="mt-1 px-1 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded flex items-center gap-1 animate-pulse">
                                                            UN-ENTITLED
                                                        </div>
                                                    )}
                                                    {(event as any).is_pre_unentitled && (
                                                        <div className="mt-1 px-1 py-0.5 bg-orange-400 text-white text-[9px] font-bold rounded flex items-center gap-1">
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
        const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
        const dayEvents = enrichedSessions.filter(s => isSameDay(parseISO(s.scheduled_start), currentDate));

        return (
            <div className="border border-border/50 rounded-lg overflow-hidden bg-card flex flex-col">
                {/* Header row */}
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
                    {/* Time column */}
                    <div className="w-20 shrink-0 border-r border-border/50 relative z-10 pr-4">
                        {hours.map(hour => (
                            <div key={hour} className="h-24 border-b border-border/50 text-sm text-muted-foreground text-right pt-2 font-medium pr-2">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Events container */}
                    <div className="flex-1 relative pl-4">
                        {/* Background lines */}
                        <div className="absolute inset-0 pl-4">
                            {hours.map(hour => (
                                <div key={`cell-${hour}`} className="h-24 border-b border-border/50/50 w-full"></div>
                            ))}
                        </div>

                        {/* Events */}
                        {dayEvents.map(event => {
                            const startD = parseISO(event.scheduled_start);
                            const endD = parseISO(event.scheduled_end);

                            // Calculate position (6AM = 0px, 1 hour = 96px (h-24))
                            const startHour = startD.getHours() + (startD.getMinutes() / 60);
                            const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                            const topPos = Math.max(0, (startHour - 6) * 96);
                            const height = durationHours * 96;

                            if (startHour > 22 || endD.getHours() < 6) return null;

                            return (
                                <div
                                    key={event.id}
                                    onClick={() => handleEventClick(event)}
                                    className={`absolute left-6 right-4 rounded-lg border p-3 flex flex-col sm:flex-row gap-2 sm:items-center justify-between shadow-sm hover:shadow hover:z-20 cursor-pointer transition-all ${getStatusColor(event.status)}`}
                                    style={{ top: `${topPos + 8}px`, height: `${height - 16}px`, minHeight: '60px' }}
                                >
                                    <div className="flex flex-col h-full justify-center">
                                        <div className="font-semibold flex items-center gap-2">
                                            {format(startD, "h:mm a")} - {format(endD, "h:mm a")}
                                            <span className="text-xs font-normal border px-1.5 py-0.5 rounded-full border-current opacity-70">
                                                {event.status}
                                            </span>
                                        </div>
                                        <div className="font-display font-medium text-lg mt-1 flex items-center gap-2">
                                            <User className="w-4 h-4 opacity-70" />
                                            <VIPName name={`${event.client?.first_name} ${event.client?.last_name}`} isVIP={event.client?.is_vip} />
                                        </div>
                                        {event.is_unentitled && (
                                            <div className="mt-1 px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold rounded-md flex items-center gap-1.5 animate-pulse w-fit">
                                                UN-ENTITLED SESSION
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm opacity-90 hidden md:block">
                                        {event.service_type}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout role="consultant">
            <div className="max-w-7xl mx-auto space-y-6 pb-10 fade-in animate-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                            My Schedule
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage and view your upcoming consultations</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleToday}>
                            Today
                        </Button>
                        <div className="flex items-center gap-1 bg-muted/50 rounded-md border border-border">
                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Pending SOAP Notes Widget */}
                {pendingSoapSessions.length > 0 && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3 bg-amber-100 border-b border-amber-200">
                            <ClipboardList className="w-5 h-5 text-amber-700" />
                            <h2 className="font-semibold text-amber-900 text-sm">Pending SOAP Notes</h2>
                            <Badge className="ml-auto bg-amber-600 text-white hover:bg-amber-600">{pendingSoapSessions.length}</Badge>
                        </div>
                        <div className="divide-y divide-amber-100">
                            {pendingSoapSessions.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-amber-50/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-900">
                                                <VIPName name={`${s.client?.first_name} ${s.client?.last_name}`} isVIP={s.client?.is_vip} />
                                            </p>
                                            <p className="text-xs text-amber-700">
                                                {format(new Date(s.scheduled_start), "MMM d, yyyy • h:mm a")} · {s.service_type}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-amber-400 text-amber-800 hover:bg-amber-100 text-xs"
                                        onClick={() => {
                                            setSelectedSession(s);
                                            setSelectedClientId(s.client_id);
                                            setSoapModalOpen(true);
                                        }}
                                    >
                                        <ClipboardList className="w-3 h-3 mr-1" />
                                        Add SOAP Note
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Card className="border-border shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/20 pb-0">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <CardTitle className="text-xl">{getHeaderTitle()}</CardTitle>
                            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-[400px]">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="day">Day</TabsTrigger>
                                    <TabsTrigger value="week">Week</TabsTrigger>
                                    <TabsTrigger value="month">Month</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                                Loading schedule...
                            </div>
                        ) : (
                            <div className="p-4 md:p-6 bg-muted/10">
                                {viewMode === "month" && renderMonthView()}
                                {viewMode === "week" && renderWeekView()}
                                {viewMode === "day" && renderDayView()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <SOAPNoteModal
                open={soapModalOpen}
                onOpenChange={setSoapModalOpen}
                session={selectedSession}
                clientId={selectedClientId}
                onSuccess={refetch}
            />
        </DashboardLayout>
    );
}
