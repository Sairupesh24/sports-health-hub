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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, Clock, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

import AdminAvailability from "./AdminAvailability";
import AppointmentList from "../shared/AppointmentList";
import { AdminBookSessionModal } from "@/components/admin/AdminBookSessionModal";
import { AdminSessionStatusModal } from "@/components/admin/AdminSessionStatusModal";

type ViewMode = "day" | "week" | "month";

interface SessionEvent {
    id: string;
    client_id: string;
    therapist_id: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    service_type: string;
    client: { first_name: string; last_name: string };
    therapist: { first_name: string; last_name: string };
    rawSession: any;
}

export default function AdminCalendar() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState("master");
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    // Master Schedule States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [consultants, setConsultants] = useState<{ id: string, name: string }[]>([]);
    const [selectedConsultant, setSelectedConsultant] = useState<string>("all");

    // Fetch consultants for the filter dropdown
    useEffect(() => {
        async function fetchConsultants() {
            if (!profile?.organization_id) return;

            // 1. Get user IDs that have the 'consultant' role
            const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("user_id")
                .eq("role", "consultant");

            if (roleError) {
                console.error("Error fetching consultant roles:", roleError);
                return;
            }

            if (roleData && roleData.length > 0) {
                const consultantIds = roleData.map(r => r.user_id);

                // 2. Fetch profiles for those IDs within the same org, checking for approval
                const { data: profilesData, error: profileError } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name")
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
                        name: `${p.first_name} ${p.last_name}`
                    })));
                }
            }
        }
        fetchConsultants();
    }, [profile?.organization_id]);

    const dateRange = useMemo(() => {
        let start, end;
        if (viewMode === "day") {
            start = currentDate;
            end = currentDate;
        } else if (viewMode === "week") {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
            start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
            end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        }

        return {
            start: start.toISOString(),
            end: addDays(end, 1).toISOString()
        };
    }, [currentDate, viewMode]);

    const { data: allSessions = [], isLoading, refetch } = useQuery({
        queryKey: ["admin-master-sessions", profile?.organization_id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!profile?.organization_id) return [];

            // Note: Depending on RLS, Admin can see all sessions from the org. 
            // We'll join client and therapist profiles.
            const { data, error } = await supabase
                .from("sessions")
                .select(`
                     id,
                     client_id,
                     therapist_id,
                     scheduled_start,
                     scheduled_end,
                     status,
                     service_type,
                     client:clients(first_name, last_name),
                     therapist:profiles(first_name, last_name)
                 `)
                .gte("scheduled_start", dateRange.start)
                .lte("scheduled_start", dateRange.end)
                .order("scheduled_start", { ascending: true });

            if (error) throw error;

            return (data as any[]).map(session => {
                return {
                    ...session,
                    rawSession: session
                } as SessionEvent;
            });
        },
        enabled: !!profile?.organization_id
    });

    const sessions = useMemo(() => {
        if (selectedConsultant === "all") return allSessions;
        return allSessions.filter(s => s.therapist_id === selectedConsultant);
    }, [allSessions, selectedConsultant]);

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

                days.push(
                    <div
                        key={cloneDay.toString()}
                        className={`min-h-[120px] p-2 border border-border/50 transition-colors ${!isSameMonth(cloneDay, monthStart)
                            ? "bg-muted/30 text-muted-foreground opacity-50"
                            : isSameDay(cloneDay, new Date())
                                ? "bg-primary/5"
                                : "bg-card"
                            }`}
                    >
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
                                    {" "}{event.client?.first_name} {event.client?.last_name}
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
                                                    <div className="text-[10px] truncate font-medium">C: {event.client?.first_name} {event.client?.last_name}</div>
                                                    {selectedConsultant === "all" && height > 40 && (
                                                        <div className="text-[10px] truncate opacity-80 mt-0.5 border-t border-current/20 pt-0.5">
                                                            Dr. {event.therapist?.last_name}
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

        // Group by consultant if "all" is selected, or just show timeline if filtered
        // For simplicity, we just render them overlapping if 'all', or maybe we can offset them if needed. 
        // Right now, standard layout is fine.

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

                            // Calculate width and left if multiple overlapping
                            // For simplicity on Admin, we give them a generic width if they overlap
                            // But usually they don't if it's filtered to 1 consultant
                            // If it's "all", just stagger them slightly if starting at same time
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
                                    <div className="font-medium text-sm truncate">
                                        C: {event.client?.first_name} {event.client?.last_name}
                                    </div>
                                    {selectedConsultant === "all" && (
                                        <div className="text-xs truncate opacity-80 mt-1 flex items-center gap-1">
                                            Dr. {event.therapist?.last_name}
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
                    <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6">
                        <TabsTrigger value="master" className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Master Schedule
                        </TabsTrigger>
                        <TabsTrigger value="appointments" className="flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Appointments List
                        </TabsTrigger>
                        <TabsTrigger value="availability" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Availability Settings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="master" className="mt-0 outline-none">
                        <Card className="border-border shadow-sm">
                            <CardHeader className="py-4 px-4 sm:px-6 border-b border-border/50 bg-muted/20 pb-0">
                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-1 bg-background rounded-md border border-border">
                                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <CardTitle className="text-lg min-w-[180px]">{getHeaderTitle()}</CardTitle>
                                        <Button variant="outline" size="sm" onClick={handleToday} className="h-8 whitespace-nowrap">
                                            Today
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
                                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-[300px] shrink-0">
                                            <TabsList className="grid w-full grid-cols-3 h-9">
                                                <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
                                                <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                                                <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                                            </TabsList>
                                        </Tabs>

                                        <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                                            <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
                                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                                <SelectValue placeholder="All Consultants" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Consultants</SelectItem>
                                                {consultants.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Button onClick={() => setIsBookModalOpen(true)} className="h-9 gap-2 whitespace-nowrap">
                                            <Plus className="w-4 h-4" /> Book Session
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-muted-foreground">
                                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                                        Loading master schedule...
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
                    </TabsContent>

                    <TabsContent value="appointments" className="mt-0 outline-none">
                        {/* We use standard List component and wrap it via its hideLayout prop inside this container */}
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
                onOpenChange={setIsBookModalOpen}
                onSuccess={refetch}
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
