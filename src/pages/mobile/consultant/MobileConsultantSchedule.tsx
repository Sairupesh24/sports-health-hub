import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    parseISO,
    isSameDay,
} from "date-fns";
import MobileConsultantLayout from "@/components/layout/MobileConsultantLayout";
import { Calendar } from "@/components/ui/calendar";
import { DayContent, DayContentProps } from "react-day-picker";
import { Loader2, Calendar as CalendarIcon, User, AlertTriangle, Zap, Plus } from "lucide-react";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import { ConsultantBookSlotModal } from "@/components/consultant/ConsultantBookSlotModal";
import { PatientAlertSummaryIcon } from "@/components/consultant/PatientAlertSummaryIcon";
import { VIPName } from "@/components/ui/VIPBadge";
import { Button } from "@/components/ui/button";
import { haptic } from "@/utils/haptic";
import { toast } from "@/hooks/use-toast";

interface SessionEvent {
    id: string;
    client_id: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    service_id?: string | null;
    service_type: string;
    is_adhoc?: boolean;
    client: { first_name: string; last_name: string; is_vip?: boolean };
    rawSession: any;
    is_unentitled?: boolean;
    is_pre_unentitled?: boolean;
}

export default function MobileConsultantSchedule() {
    const { profile, roles } = useAuth();
    const isAdminOrFoe = roles?.some(r => ["admin", "super_admin", "clinic_admin", "foe"].includes(r));
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [monthViewDate, setMonthViewDate] = useState<Date>(new Date());

    // Modal states
    const [soapModalOpen, setSoapModalOpen] = useState(false);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>("");

    const dateRange = useMemo(() => {
        const start = startOfWeek(startOfMonth(monthViewDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(monthViewDate), { weekStartsOn: 1 });
        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }, [monthViewDate]);

    const { data: sessions = [], isLoading, refetch } = useQuery({
        queryKey: ["mobile-consultant-sessions", profile?.id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!profile?.id) return [];
            const data = await apiFetch(`/api/appointments?specialist_id=${profile.id}&start=${dateRange.start}&end=${dateRange.end}`);
            return (data as any[]).map(session => {
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

    // Entitlement checking
    const plannedClientIds = useMemo(() =>
        [...new Set(sessions.filter((s: any) => s.status === 'Planned' && !s.is_adhoc).map((s: any) => s.client_id))],
        [sessions]
    );

    const { data: clientEntitlementMap } = useQuery({
        queryKey: ["mobile-consultant-planned-entitlements", plannedClientIds],
        queryFn: async () => {
            if (!plannedClientIds.length) return {};
            const results = await Promise.all(
                plannedClientIds.map(async (clientId: string) => {
                    const data = await apiFetch(`/api/billing/entitlements/balance/${clientId}`);
                    const byServiceId: Record<string, number> = {};
                    const byServiceName: Record<string, number> = {};
                    (data?.balances ?? []).forEach((b: any) => {
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
            if (s.status !== 'Planned' || s.is_adhoc) return s;
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

    const handleEventClick = (event: SessionEvent) => {
        const rawStatus = (event.status || "").toLowerCase().trim();
        if (rawStatus === "cancelled" || rawStatus === "canceled") {
            haptic.heavy();
            toast({
                variant: "destructive",
                title: "Session Cancelled",
                description: "This session has been cancelled by Admin/FOE."
            });
            return;
        }

        const isCheckedIn = rawStatus === "checked in" || rawStatus === "checked-in" || rawStatus === "checkedin" || rawStatus === "in progress" || rawStatus === "completed";

        if (!isCheckedIn && !isAdminOrFoe) {
            haptic.heavy();
            toast({
                variant: "destructive",
                title: "Check-in Required",
                description: "Client has not checked in yet. SOAP notes can only be opened and filled after the client is checked in by Admin/FOE."
            });
            return;
        }

        haptic.selection();
        setSelectedSession(event.rawSession);
        setSelectedClientId(event.client_id);
        setSoapModalOpen(true);
    };

    const getStatusColor = (event: SessionEvent) => {
        const isAdhoc = event.is_adhoc || event.status === 'Ad-Hoc';
        if (isAdhoc) return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 shadow-amber-500/10';
        
        switch (event.status) {
            case 'Planned': return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-blue-500/10';
            case 'Checked In': case 'Checked-in': return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
            case 'Completed': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700';
            case 'Cancelled': case 'cancelled': return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700 line-through opacity-70';
            case 'Missed': return 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
            case 'Rescheduled': return 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
            default: return 'bg-primary/10 text-primary border-primary/30';
        }
    };

    // Calendar Day component with dots
    const CustomDayContent = (props: DayContentProps) => {
        const hasEvent = enrichedSessions.some(e => isSameDay(parseISO(e.scheduled_start), props.date));
        return (
            <div className="relative flex flex-col items-center justify-center w-full h-full">
                <DayContent {...props} />
                {hasEvent && (
                    <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_4px_rgba(var(--primary-rgb),0.5)]" />
                )}
            </div>
        );
    };

    // Render Timeline View
    const renderDayTimeline = () => {
        // Schedule from 5 AM to 11 PM
        const hours = Array.from({ length: 19 }, (_, i) => i + 5);
        const dayEvents = enrichedSessions.filter(s => isSameDay(parseISO(s.scheduled_start), selectedDate));

        return (
            <div className="relative mt-4 mb-24 pb-12 flex bg-white dark:bg-[#0B1120] rounded-[2rem] border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                {/* Time column */}
                <div className="w-16 shrink-0 border-r border-slate-100 dark:border-white/5 relative z-10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="h-4" /> {/* Top padding buffer */}
                    {hours.map(hour => (
                        <div key={hour} className="h-20 border-b border-transparent text-[10px] font-bold text-slate-400 text-right pr-3 -mt-2">
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                        </div>
                    ))}
                </div>

                {/* Events container */}
                <div className="flex-1 relative">
                    <div className="h-4" /> {/* Top padding buffer */}
                    {/* Background lines */}
                    <div className="absolute inset-0 top-4">
                        {hours.map(hour => (
                            <div key={`cell-${hour}`} className="h-20 border-t border-slate-100 dark:border-white/5 w-full"></div>
                        ))}
                    </div>

                    {/* Events */}
                    {dayEvents.map(event => {
                        const startD = parseISO(event.scheduled_start);
                        const endD = parseISO(event.scheduled_end);

                        const startHour = startD.getHours() + (startD.getMinutes() / 60);
                        const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                        // Position: 5AM = 0px, 1 hour = 80px (h-20)
                        const topPos = Math.max(0, (startHour - 5) * 80);
                        const height = durationHours * 80;

                        if (startHour > 23 || endD.getHours() < 5) return null;

                        const isAdhoc = event.is_adhoc || event.status === 'Ad-Hoc';

                        return (
                            <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className={`absolute left-3 right-3 rounded-2xl border p-3 flex flex-col justify-between shadow-sm active:scale-95 transition-all z-20 ${getStatusColor(event)}`}
                                style={{ top: `${topPos + 16}px`, height: `${height - 4}px`, minHeight: '64px' }}
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-xs flex items-center gap-1.5 opacity-90">
                                            {format(startD, "h:mm a")} - {format(endD, "h:mm a")}
                                        </div>
                                        {isAdhoc && (
                                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                                                <Zap className="w-2.5 h-2.5" /> Ad-Hoc
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-display font-black text-sm flex items-center gap-1.5 truncate">
                                        <User className="w-3.5 h-3.5 opacity-70" />
                                        <VIPName name={`${event.client?.first_name} ${event.client?.last_name}`} isVIP={event.client?.is_vip} className="truncate" />
                                    </div>
                                    <div className="text-[10px] font-semibold opacity-70 truncate mt-0.5 uppercase tracking-wide">
                                        {event.service_type}
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center mt-1">
                                    {event.client_id && isAdminOrFoe && <PatientAlertSummaryIcon clientId={event.client_id} isVIP={event.client?.is_vip} />}
                                    {event.is_unentitled && isAdminOrFoe && (
                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-[8px] font-black uppercase rounded-md animate-pulse">
                                            Un-Entitled
                                        </span>
                                    )}
                                    {(event as any).is_pre_unentitled && isAdminOrFoe && (
                                        <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-[8px] font-black uppercase rounded-md">
                                            ⚠ No Bal
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    return (
        <MobileConsultantLayout title="Schedule">
            <div className="space-y-4 pt-2 px-2">
                
                {/* Mini Calendar Navigation */}
                <div className="bg-white dark:bg-[#0B1120] rounded-[2rem] p-4 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-white/5 relative z-30 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                            if (date) {
                                haptic.light();
                                setSelectedDate(date);
                            }
                        }}
                        onMonthChange={setMonthViewDate}
                        className="w-full max-w-sm"
                        components={{ DayContent: CustomDayContent }}
                        classNames={{
                            months: "w-full",
                            month: "w-full",
                            table: "w-full",
                            head_row: "flex justify-between",
                            row: "flex justify-between mt-2",
                            head_cell: "text-[10px] font-black uppercase tracking-widest text-slate-400 w-9 text-center",
                            cell: "h-9 w-9 text-center p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-bold text-sm aria-selected:opacity-100 rounded-full hover:bg-primary/10 transition-colors mx-auto",
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-lg shadow-primary/30 scale-110 transition-all",
                            day_today: "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-none",
                            caption: "flex justify-center pt-1 pb-2 relative items-center",
                            caption_label: "text-sm font-black uppercase tracking-wider",
                        }}
                    />
                </div>

                {/* Selected Date Header */}
                <div className="px-2 pt-2 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white">
                            {format(selectedDate, "EEEE")}
                        </h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {format(selectedDate, "MMMM do, yyyy")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        <Button
                            size="sm"
                            onClick={() => setIsBookModalOpen(true)}
                            className="gap-1 text-xs font-bold rounded-full px-3 h-8 shadow-md"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Book Slot
                        </Button>
                    </div>
                </div>

                {/* Timeline */}
                {renderDayTimeline()}

                <SOAPNoteModal
                    open={soapModalOpen}
                    onOpenChange={setSoapModalOpen}
                    session={selectedSession}
                    clientId={selectedClientId}
                    onSuccess={refetch}
                />

                <ConsultantBookSlotModal
                    open={isBookModalOpen}
                    onOpenChange={setIsBookModalOpen}
                    defaultDate={selectedDate}
                    onSuccess={refetch}
                />
            </div>
        </MobileConsultantLayout>
    );
}
