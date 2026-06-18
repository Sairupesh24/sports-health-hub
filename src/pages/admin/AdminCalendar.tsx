import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Layers, Clock, Plus, Download, Bell, AlertCircle, Check, Coffee } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import AppointmentList from "../shared/AppointmentList";
import { AdminBookSessionModal } from "@/components/admin/AdminBookSessionModal";
import { AdminSessionStatusModal } from "@/components/admin/AdminSessionStatusModal";
import EmergencyResponseModal from "@/components/admin/EmergencyResponseModal";
import { VIPBadge } from "@/components/ui/VIPBadge";
import { WaitlistSidebar } from "@/components/admin/WaitlistSidebar";

type ViewMode = "day" | "week" | "month";

interface SessionEvent {
    id: string;
    client_id: string | null;
    therapist_id: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    service_id?: string | null;
    service_type: string;
    client: { first_name: string; last_name: string; is_vip?: boolean } | null;
    therapist: { first_name: string; last_name: string; role?: string };
    rawSession: any;
    is_unentitled?: boolean;
    is_pre_unentitled?: boolean;
    is_guest?: boolean;
    guest_name?: string;
    guest_contact?: string;
    enquiry_id?: string;
}

export default function AdminCalendar() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("master");
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
    const [waitlistInitialData, setWaitlistInitialData] = useState<any>(null);

    // Master Schedule States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    interface ConsultantProfile {
        id: string;
        name: string;
        profession?: string | null;
        avatar_url?: string | null;
        emergency_alerts?: any[];
    }

    const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
    const [filterMode, setFilterMode] = useState<'role' | 'individual'>('role');
    const [selectedRole, setSelectedRole] = useState<string>("all");
    const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);


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

            try {
                const specialists = await apiFetch<any[]>('/hr/employees', {
                    params: { role_type: 'clinical' }
                });

                setConsultants(specialists.map(p => ({
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                    profession: p.profession,
                    avatar_url: p.avatar_url,
                    emergency_alerts: p.emergency_alerts
                })));
            } catch (error) {
                console.error("Error fetching consultant profiles:", error);
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
            try {
                const data = await apiFetch<any[]>('/appointments/waitlist', {
                    params: {
                        start: dateRange.start.split('T')[0],
                        end: dateRange.end.split('T')[0],
                        status: 'Waiting'
                    }
                });
                return data || [];
            } catch (error) {
                console.error("Waitlist error:", error);
                return [];
            }
        },
        enabled: !!profile?.organization_id
    });

    const { data: emergencyAlerts } = useQuery({
        queryKey: ['admin-calendar-emergencies', profile?.organization_id],
        queryFn: async () => {
            try {
                const res = await apiFetch<any>('/hr/emergencies', {
                    params: { status: 'unresolved' }
                });
                return res.data || [];
            } catch (error) {
                console.error("Emergency alerts error:", error);
                return [];
            }
        },
        enabled: !!profile?.organization_id
    });

    const { data: staffSchedules = [] } = useQuery({
        queryKey: ["staff-schedules", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            try {
                const data = await apiFetch<any[]>('/hr/staff-schedules');
                return data || [];
            } catch (error) {
                console.error("Staff schedules fetch error:", error);
                return [];
            }
        },
        enabled: !!profile?.organization_id
    });

    const { data: hrLeaves = [] } = useQuery({
        queryKey: ["hr-leaves", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            try {
                const res = await apiFetch<{ data: any[] }>('/hr/leaves');
                return res.data || [];
            } catch (error) {
                console.error("Leaves fetch error:", error);
                return [];
            }
        },
        enabled: !!profile?.organization_id
    });

    const { data: orgSettings } = useQuery({
        queryKey: ["org-settings", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;
            try {
                return await apiFetch<any>(`/organizations/${profile?.organization_id}/settings`);
            } catch (error) {
                console.error("Org settings fetch error:", error);
                return null;
            }
        },
        enabled: !!profile?.organization_id
    });

    const { data: allSessions = [], isLoading, refetch } = useQuery({
        queryKey: ["admin-master-sessions", profile?.organization_id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!profile?.organization_id) return [];

            const data = await apiFetch<any[]>('/appointments', {
                params: {
                    start: dateRange.start,
                    end: dateRange.end
                }
            });

            return data.map(session => ({ 
                ...session, 
                client: { 
                    first_name: session.client?.first_name || session.client_first_name, 
                    last_name: session.client?.last_name || session.client_last_name, 
                    is_vip: session.client?.is_vip || session.is_vip 
                },
                therapist: { 
                    first_name: session.therapist?.first_name || session.therapist_first_name, 
                    last_name: session.therapist?.last_name || session.therapist_last_name 
                },
                rawSession: session 
            } as SessionEvent));
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
                    try {
                        const data = await apiFetch<any>(`/billing/entitlements/balance/${clientId}`);
                        return { clientId, byServiceName: data.byServiceName || {} };
                    } catch (error) {
                        return { clientId, byServiceName: {} };
                    }
                })
            );
            const map: Record<string, { byServiceName: Record<string, number> }> = {};
            results.forEach(({ clientId, byServiceName }) => { map[clientId] = { byServiceName }; });
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
                if (s.service_type) {
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

    const rolesList = useMemo(() => {
        const professions = consultants
            .map(c => c.profession)
            .filter((p): p is string => typeof p === 'string' && p.trim() !== '');
        return Array.from(new Set(professions));
    }, [consultants]);

    const hasUnassignedSessionsGlobal = useMemo(() => {
        return sessionsWithEntitlementStatus.some(s => 
            !s.therapist_id || !consultants.some(c => c.id === s.therapist_id)
        );
    }, [sessionsWithEntitlementStatus, consultants]);

    const sessions = useMemo(() => {
        return sessionsWithEntitlementStatus.filter(s => {
            const isUnassigned = !s.therapist_id || !consultants.some(c => c.id === s.therapist_id);
            if (filterMode === 'role') {
                if (selectedRole === "all") return true;
                return !isUnassigned && consultants.find(c => c.id === s.therapist_id)?.profession === selectedRole;
            } else {
                if (selectedConsultants.length === 0) return true;
                if (isUnassigned) return selectedConsultants.includes('unassigned');
                return selectedConsultants.includes(s.therapist_id);
            }
        });
    }, [sessionsWithEntitlementStatus, filterMode, selectedRole, selectedConsultants, consultants]);

    // Mobile responsiveness
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const [mobileSelectedClinicianId, setMobileSelectedClinicianId] = useState<string | null>(null);

    const activeClinicians = useMemo(() => {
        const list = consultants.filter(c => {
            if (filterMode === 'role') {
                return selectedRole === "all" || c.profession === selectedRole;
            } else {
                return selectedConsultants.length === 0 || selectedConsultants.includes(c.id);
            }
        });

        // Check if there are any unassigned sessions on the current date
        const hasUnassignedToday = sessionsWithEntitlementStatus.some(s => 
            isSameDay(parseISO(s.scheduled_start), currentDate) && 
            (!s.therapist_id || !consultants.some(c => c.id === s.therapist_id))
        );

        if (hasUnassignedToday) {
            const matchesRoleFilter = filterMode === 'role' && selectedRole === 'all';
            const matchesIndividualFilter = filterMode === 'individual' && (selectedConsultants.length === 0 || selectedConsultants.includes('unassigned'));
            
            if (matchesRoleFilter || matchesIndividualFilter) {
                list.push({
                    id: 'unassigned',
                    name: 'Unassigned',
                    profession: 'Clinic Slot',
                    avatar_url: null,
                    emergency_alerts: []
                });
            }
        }

        return list;
    }, [consultants, filterMode, selectedRole, selectedConsultants, sessionsWithEntitlementStatus, currentDate]);

    useEffect(() => {
        setFilterMode("role");
        setSelectedRole("all");
        setSelectedConsultants([]);
    }, [viewMode]);

    // Automatically set/reset mobile selection
    useEffect(() => {
        if (activeClinicians.length > 0) {
            if (!mobileSelectedClinicianId || !activeClinicians.some(c => c.id === mobileSelectedClinicianId)) {
                setMobileSelectedClinicianId(activeClinicians[0].id);
            }
        } else {
            setMobileSelectedClinicianId(null);
        }
    }, [activeClinicians, mobileSelectedClinicianId]);

    const activeCliniciansToRender = useMemo(() => {
        if (isMobile) {
            const selected = activeClinicians.find(c => c.id === mobileSelectedClinicianId);
            return selected ? [selected] : (activeClinicians.length > 0 ? [activeClinicians[0]] : []);
        }
        return activeClinicians;
    }, [isMobile, activeClinicians, mobileSelectedClinicianId]);

    const calendarHoursRange = useMemo(() => {
        let minHour = 8;
        let maxHour = 20;

        sessionsWithEntitlementStatus.forEach(s => {
            const startD = parseISO(s.scheduled_start);
            const endD = parseISO(s.scheduled_end);

            let isRelevant = false;
            if (viewMode === 'day') {
                isRelevant = isSameDay(startD, currentDate);
            } else if (viewMode === 'week') {
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
                isRelevant = startD >= weekStart && startD <= weekEnd;
            } else {
                isRelevant = true;
            }

            if (isRelevant) {
                const sHour = startD.getHours();
                const eHour = Math.ceil(endD.getHours() + endD.getMinutes() / 60);
                if (sHour < minHour) {
                    minHour = sHour;
                }
                if (eHour > maxHour) {
                    maxHour = eHour;
                }
            }
        });

        if (minHour >= maxHour) {
            maxHour = minHour + 1;
        }

        return { minHour, maxHour };
    }, [sessionsWithEntitlementStatus, viewMode, currentDate]);

    const timeSlots = useMemo(() => {
        const slots: { start: string; end: string; label: string }[] = [];
        const startMinutes = calendarHoursRange.minHour * 60;
        const endMinutes = calendarHoursRange.maxHour * 60;
        const duration = Number(orgSettings?.default_slot_duration) || 30;

        for (let m = startMinutes; m < endMinutes; m += duration) {
            const startHour = Math.floor(m / 60);
            const startMin = m % 60;
            const endHour = Math.floor((m + duration) / 60);
            const endMin = (m + duration) % 60;

            const formatTime = (h: number, min: number) => {
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayHour = h % 12 === 0 ? 12 : h % 12;
                return `${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`;
            };
            
            const formatTime24 = (h: number, min: number) => {
                return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
            };

            slots.push({
                start: formatTime24(startHour, startMin),
                end: formatTime24(endHour, endMin),
                label: formatTime(startHour, startMin)
            });
        }
        return slots;
    }, [orgSettings?.default_slot_duration, calendarHoursRange]);

    const timeToY = (timeStrOrDate: string | Date) => {
        let hours = 0;
        let minutes = 0;
        if (timeStrOrDate instanceof Date) {
            hours = timeStrOrDate.getHours();
            minutes = timeStrOrDate.getMinutes();
        } else {
            const parts = timeStrOrDate.split(':');
            hours = parseInt(parts[0], 10) || 0;
            minutes = parseInt(parts[1], 10) || 0;
        }
        const currentM = hours * 60 + minutes;
        const startM = calendarHoursRange.minHour * 60;
        const totalM = (calendarHoursRange.maxHour - calendarHoursRange.minHour) * 60;
        
        const offsetM = Math.max(0, Math.min(totalM, currentM - startM));
        const totalHeight = timeSlots.length * 60;
        return (offsetM / totalM) * totalHeight;
    };

    const getTopAndHeight = (start: string | Date, end: string | Date) => {
        const top = timeToY(start);
        const bottom = timeToY(end);
        const height = Math.max(20, bottom - top);
        return { top, height };
    };

    const getClinicianBreaks = (clinicianId: string) => {
        const schedule = staffSchedules.find((s: any) => s.consultant_id === clinicianId);
        if (!schedule) return [];

        let loadedBreaks = schedule.breaks || {};
        if (typeof loadedBreaks === 'string') {
            try {
                loadedBreaks = JSON.parse(loadedBreaks);
            } catch (e) {
                loadedBreaks = {};
            }
        }

        let activeBreaksList: any[] = [];
        if (Array.isArray(loadedBreaks)) {
            activeBreaksList = loadedBreaks;
        } else if (loadedBreaks.all) {
            activeBreaksList = loadedBreaks.all;
        } else {
            const dayKey = String(currentDate.getDay());
            activeBreaksList = loadedBreaks[dayKey] || [];
        }

        return activeBreaksList;
    };

    const getBookingStyleAndElements = (session: any) => {
        const start = parseISO(session.scheduled_start);
        const end = parseISO(session.scheduled_end);
        const now = new Date();
        
        let state: 'completed' | 'in_progress' | 'overdue' | 'planned' | 'other' = 'planned';

        if (session.status === 'Completed') {
            state = 'completed';
        } else if (session.status === 'Planned' || session.status === 'Checked In') {
            if (now >= start && now <= end) {
                state = 'in_progress';
            } else if (now > end) {
                state = 'overdue';
            } else {
                state = 'planned';
            }
        } else {
            state = 'completed'; 
        }

        let cardClasses = "";
        let indicatorElement = null;

        switch (state) {
            case 'completed':
                cardClasses = "bg-slate-100 text-slate-700 border-slate-200";
                indicatorElement = (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase">
                        <Check className="w-2.5 h-2.5 text-slate-500" /> Completed
                    </span>
                );
                break;
            case 'in_progress':
                cardClasses = "border-emerald-500 bg-emerald-50 text-emerald-800";
                indicatorElement = (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-600 uppercase">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Active
                    </span>
                );
                break;
            case 'overdue':
                cardClasses = "border-red-500 bg-red-50 text-red-800";
                indicatorElement = (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-red-600 uppercase">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <AlertCircle className="w-2 h-2 text-red-500 relative" />
                        </span>
                        Overdue
                    </span>
                );
                break;
            case 'planned':
            default:
                cardClasses = "border-blue-300 bg-blue-50 text-blue-800";
                indicatorElement = (
                    <span className="text-[8px] font-bold text-blue-600 uppercase">
                        Planned
                    </span>
                );
                break;
        }

        return { cardClasses, indicatorElement };
    };

    const handleCellClick = (consultantId: string, startTime: string) => {
        setWaitlistInitialData({
            consultantId,
            sessionDate: format(currentDate, "yyyy-MM-dd"),
            startTime
        });
        setIsBookModalOpen(true);
    };

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
                        {emergencyAlerts?.some(a => isSameDay(parseISO(a.created_at), cloneDay)) && isSameMonth(cloneDay, monthStart) && (
                            <div 
                                className="absolute bottom-2 right-2 w-3 h-3 bg-destructive rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10" 
                                title="Staff Emergency Reported" 
                            />
                        )}
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
                                    className={`text-[9px] leading-tight p-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
                                >
                                    <span className="font-semibold">{format(parseISO(event.scheduled_start), "HH:mm")}</span>
                                    {" "}
                                    <span className={event.client?.is_vip ? "text-[#D4AF37] font-bold" : ""}>
                                        {event.is_guest ? (
                                            <span className="italic opacity-80 flex items-center gap-1">
                                                G: {event.guest_name}
                                                <span className="px-1 bg-orange-100 text-orange-600 rounded-[2px] text-[7px] font-bold uppercase tracking-tighter">Prov</span>
                                            </span>
                                        ) : (
                                            `${event.client?.first_name} ${event.client?.last_name}`
                                        )}
                                    </span>
                                    {!event.is_guest && <VIPBadge isVIP={event.client?.is_vip} iconOnly size="sm" className="ml-1 inline-flex" />}
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
        const hours = Array.from({ length: calendarHoursRange.maxHour - calendarHoursRange.minHour + 1 }, (_, i) => i + calendarHoursRange.minHour);

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

                                            const topPos = Math.max(0, (startHour - calendarHoursRange.minHour) * 80);
                                            const height = durationHours * 80;

                                            if (startHour > calendarHoursRange.maxHour || endD.getHours() < calendarHoursRange.minHour) return null;

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => setSelectedSession(event)}
                                                    className={`absolute left-1 right-1 rounded border p-1.5 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all ${getStatusColor(event.status)}`}
                                                    style={{ top: `${topPos}px`, height: `${height}px`, minHeight: '24px' }}
                                                >
                                                    <div className="text-[9px] font-bold leading-none mb-0.5">{format(startD, "HH:mm")} - {format(endD, "HH:mm")}</div>
                                                    <div className={cn("text-[9px] truncate font-medium flex items-center gap-1 leading-none", event.client?.is_vip && "text-[#D4AF37] font-bold")}>
                                                        {event.is_guest ? (
                                                            <span className="italic">G: {event.guest_name} <span className="text-[8px] bg-orange-100 text-orange-600 px-1 rounded font-bold uppercase ml-1">PROV</span></span>
                                                        ) : (
                                                            <>C: {event.client?.first_name} {event.client?.last_name}</>
                                                        )}
                                                        {!event.is_guest && <VIPBadge isVIP={event.client?.is_vip} iconOnly size="sm" />}
                                                    </div>
                                                    {((filterMode === 'role') || (filterMode === 'individual' && selectedConsultants.length !== 1)) && height > 40 && (
                                                        <div className="text-[8px] truncate opacity-80 mt-0.5 border-t border-current/20 pt-0.5 leading-none">
                                                            {event.therapist?.first_name} {event.therapist?.last_name}
                                                        </div>
                                                    )}
                                                    {event.is_unentitled && (
                                                        <div className="absolute top-1 right-1 px-1 py-0 bg-red-600 text-white text-[7px] font-black rounded flex items-center gap-0.5 animate-pulse z-10">
                                                            <Filter className="w-2 h-2" /> UN
                                                        </div>
                                                    )}
                                                    {(event as any).is_pre_unentitled && (
                                                        <div className="absolute top-1 right-1 px-1 py-0 bg-orange-400 text-white text-[7px] font-black rounded flex items-center gap-0.5 z-10">
                                                            ⚠ NO
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
        if (activeClinicians.length === 0) {
            return (
                <div className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Active Clinicians Found</p>
                </div>
            );
        }

        const totalHeight = timeSlots.length * 60;

        return (
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm animate-in fade-in duration-500">
                {/* Day Header Block */}
                <div className="p-4 border-b border-border/50 bg-muted/30 flex justify-between items-center">
                    <div>
                        <div className="text-lg font-semibold text-primary">{format(currentDate, "EEEE")}</div>
                        <div className="text-muted-foreground">{format(currentDate, "MMMM d, yyyy")}</div>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {sessions.filter(s => isSameDay(parseISO(s.scheduled_start), currentDate)).length} Sessions Scheduled
                    </div>
                </div>

                {/* Mobile Ribbon Selector */}
                {isMobile && activeClinicians.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 pt-2 px-3 no-scrollbar border-b border-border/50 bg-muted/10">
                        {activeClinicians.map((c) => {
                            const isSelected = mobileSelectedClinicianId === c.id;
                            const initials = c.name ? c.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "";
                            const hasEmergency = c.emergency_alerts && c.emergency_alerts.length > 0;
                            
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setMobileSelectedClinicianId(c.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition-all whitespace-nowrap min-h-[44px] shrink-0",
                                        isSelected 
                                            ? "bg-primary text-white border-primary shadow-sm" 
                                            : "bg-card text-slate-700 border-border hover:bg-muted/50",
                                        hasEmergency && "ring-2 ring-red-500 ring-offset-1"
                                    )}
                                >
                                    {c.avatar_url ? (
                                        <img 
                                            src={c.avatar_url} 
                                            alt={c.name} 
                                            className="w-6 h-6 rounded-full object-cover border border-current"
                                        />
                                    ) : (
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                            isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                        )}>
                                            {initials}
                                        </div>
                                    )}
                                    <span>{c.name}</span>
                                    {hasEmergency && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Resource Matrix Grid */}
                <div className="w-full overflow-x-auto custom-scrollbar">
                    <div 
                        className="grid divide-x divide-border"
                        style={{
                            gridTemplateColumns: `80px repeat(${activeCliniciansToRender.length}, minmax(200px, 1fr))`,
                            minWidth: isMobile ? '100%' : `${80 + activeCliniciansToRender.length * 200}px`
                        }}
                    >
                        {/* Time Column (Y-Axis) */}
                        <div className="flex flex-col select-none">
                            <div className="h-[75px] border-b border-border/50 bg-muted/30 flex items-center justify-center font-bold text-xs text-muted-foreground">
                                Time
                            </div>
                            <div className="relative" style={{ height: `${totalHeight}px` }}>
                                {timeSlots.map((slot, i) => (
                                    <div 
                                        key={slot.start} 
                                        className="absolute left-0 right-0 border-b border-border/10 text-[10px] text-muted-foreground flex items-start justify-end pr-2 pt-1 font-bold"
                                        style={{ top: `${i * 60}px`, height: '60px' }}
                                    >
                                        {slot.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Clinicians Columns */}
                        {activeCliniciansToRender.map((clinician) => {
                            const initials = clinician.name ? clinician.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "";
                            const hasEmergency = clinician.emergency_alerts && clinician.emergency_alerts.length > 0;

                            // Leaves Overlay logic
                            const isCurrentlyOnLeave = hrLeaves.some((leave: any) => {
                                if (leave.employee_id !== clinician.id) return false;
                                if (leave.status !== 'Approved') return false;
                                
                                const startStr = leave.start_date.split('T')[0];
                                const endStr = leave.end_date.split('T')[0];
                                const currentStr = format(currentDate, "yyyy-MM-dd");
                                
                                return currentStr >= startStr && currentStr <= endStr;
                            });

                            // Breaks logic
                            const clinicianBreaks = getClinicianBreaks(clinician.id);

                            // Bookings logic
                            const clinicianSessions = sessions.filter(s => {
                                const isUnassigned = !s.therapist_id || !consultants.some(c => c.id === s.therapist_id);
                                if (clinician.id === 'unassigned') {
                                    return isUnassigned && isSameDay(parseISO(s.scheduled_start), currentDate);
                                }
                                return s.therapist_id === clinician.id && isSameDay(parseISO(s.scheduled_start), currentDate);
                            });

                            // Overlap tracking
                            const sortedSessions = [...clinicianSessions].sort((a, b) => {
                                return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
                            });

                            const columns: any[][] = [];
                            sortedSessions.forEach(session => {
                                const start = new Date(session.scheduled_start).getTime();
                                
                                let placed = false;
                                for (let c = 0; c < columns.length; c++) {
                                    const lastSessionInCol = columns[c][columns[c].length - 1];
                                    const lastEnd = new Date(lastSessionInCol.scheduled_end).getTime();
                                    
                                    if (start >= lastEnd) {
                                        columns[c].push(session);
                                        placed = true;
                                        break;
                                    }
                                }

                                if (!placed) {
                                    columns.push([session]);
                                }
                            });

                            const getSessionLayout = (session: any) => {
                                let colIndex = 0;
                                let totalCols = 1;

                                for (let c = 0; c < columns.length; c++) {
                                    const idx = columns[c].findIndex(s => s.id === session.id);
                                    if (idx !== -1) {
                                        colIndex = c;
                                        totalCols = columns.length;
                                        break;
                                    }
                                }

                                const start = parseISO(session.scheduled_start);
                                const end = parseISO(session.scheduled_end);
                                const { top, height } = getTopAndHeight(start, end);

                                const widthPercent = 100 / totalCols;
                                const leftPercent = colIndex * widthPercent;

                                return {
                                    top,
                                    height,
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`
                                };
                            };

                            return (
                                <div key={clinician.id} className="flex flex-col relative">
                                    {/* Clinician Column Header */}
                                    <div className="h-[75px] border-b border-border/50 bg-muted/10 p-2 flex flex-col justify-center relative select-none">
                                        <div className="flex items-center gap-2">
                                            {clinician.avatar_url ? (
                                                <img 
                                                    src={clinician.avatar_url} 
                                                    alt={clinician.name} 
                                                    className="w-9 h-9 rounded-full object-cover border border-border"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {initials}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 truncate">{clinician.name}</div>
                                                <div className="text-[10px] text-muted-foreground truncate uppercase font-medium">
                                                    {clinician.profession || "Clinician"}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {hasEmergency && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsEmergencyModalOpen(true);
                                                }}
                                                className="absolute inset-x-0 bottom-0 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black py-1 uppercase tracking-widest text-center flex items-center justify-center gap-1 animate-pulse z-20 cursor-pointer border-t border-red-700 shadow-sm"
                                            >
                                                ⚠️ EMERGENCY ACTIVE
                                            </button>
                                        )}
                                    </div>

                                    {/* Column Grid & Overlays Container */}
                                    <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
                                        {/* Background Cells */}
                                        {timeSlots.map((slot, i) => (
                                            <div 
                                                key={slot.start} 
                                                onClick={() => handleCellClick(clinician.id, slot.start)}
                                                className="absolute left-0 right-0 border-b border-border/10 hover:bg-muted/30 cursor-pointer transition-colors"
                                                style={{ top: `${i * 60}px`, height: '60px' }}
                                            />
                                        ))}

                                        {/* Leaves Overlay */}
                                        {isCurrentlyOnLeave && (
                                            <div 
                                                className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-200/50 text-slate-700 font-bold text-sm text-center p-4 border-b border-slate-300 select-none"
                                            >
                                                <AlertCircle className="w-6 h-6 text-slate-500 mb-1" />
                                                Unavailable - Staff Leave
                                            </div>
                                        )}

                                        {/* Breaks Overlays */}
                                        {!isCurrentlyOnLeave && clinicianBreaks.map((breakBlock: any, idx: number) => {
                                            const { top, height } = getTopAndHeight(breakBlock.start_time, breakBlock.end_time);
                                            return (
                                                <div
                                                    key={`break-${idx}`}
                                                    className="absolute inset-x-0 z-10 pointer-events-none flex flex-col items-center justify-center border-y bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_10px,#e2e8f0_10px,#e2e8f0_20px)] border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider text-center px-2 select-none"
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                >
                                                    <Coffee className="w-3.5 h-3.5 mb-0.5 text-slate-400" />
                                                    <span>Staff Break</span>
                                                    <span className="text-[8px] font-normal text-slate-400 mt-0.5">
                                                        {breakBlock.start_time.slice(0, 5)} - {breakBlock.end_time.slice(0, 5)}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {/* Bookings Overlays */}
                                        {!isCurrentlyOnLeave && sortedSessions.map((event) => {
                                            const layout = getSessionLayout(event);
                                            const { cardClasses, indicatorElement } = getBookingStyleAndElements(event);
                                            const startD = parseISO(event.scheduled_start);
                                            const endD = parseISO(event.scheduled_end);

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => setSelectedSession(event)}
                                                    className={`absolute rounded-xl border p-2 flex flex-col justify-between shadow-sm hover:shadow-md hover:z-20 transition-all cursor-pointer overflow-hidden ${cardClasses}`}
                                                    style={{
                                                        top: `${layout.top + 2}px`,
                                                        height: `${layout.height - 4}px`,
                                                        left: `calc(${layout.left} + 2px)`,
                                                        width: `calc(${layout.width} - 4px)`,
                                                        minHeight: '45px'
                                                    }}
                                                >
                                                    <div className="flex flex-col min-w-0 h-full justify-between">
                                                        <div>
                                                            <div className="flex justify-between items-start gap-1">
                                                                <span className="font-bold text-[9px] leading-tight">
                                                                    {format(startD, "h:mm a")} - {format(endD, "h:mm a")}
                                                                </span>
                                                                {indicatorElement}
                                                            </div>

                                                            <div className={cn("font-bold text-xs truncate mt-0.5 flex items-center gap-1", event.client?.is_vip && "text-[#D4AF37]")}>
                                                                {event.is_guest ? (
                                                                    <span className="italic opacity-85">G: {event.guest_name}</span>
                                                                ) : (
                                                                    <span>{event.client?.first_name} {event.client?.last_name}</span>
                                                                )}
                                                                {!event.is_guest && <VIPBadge isVIP={event.client?.is_vip} size="sm" iconOnly />}
                                                            </div>

                                                            <div className="text-[10px] opacity-80 truncate leading-tight mt-0.5">
                                                                {event.service_type || "No Service"}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-1 mt-1">
                                                            {/* Entitlement Warnings */}
                                                            <div className="flex gap-1">
                                                                {event.is_unentitled && (
                                                                    <span className="px-1 bg-red-600 text-white text-[7px] font-black rounded animate-pulse">
                                                                        UN
                                                                    </span>
                                                                )}
                                                                {(event as any).is_pre_unentitled && (
                                                                    <span className="px-1 bg-orange-500 text-white text-[7px] font-black rounded" title="Client has no entitlements for this service">
                                                                        ⚠ NO
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
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
                    <p className="text-muted-foreground mt-1">Manage all clinic schedules and appointments</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="w-full overflow-x-auto custom-scrollbar pb-2 mb-4 -mx-1 px-1 sm:mx-0 sm:px-0">
                        <TabsList className="flex md:grid w-max md:w-full md:grid-cols-2 min-w-max md:min-w-0 md:max-w-2xl">
                        <TabsTrigger value="master" className="flex items-center gap-2 px-4 py-2 whitespace-nowrap">
                            <CalendarIcon className="w-4 h-4" />
                            Master Schedule
                        </TabsTrigger>
                        <TabsTrigger value="appointments" className="flex items-center gap-2 px-4 py-2 whitespace-nowrap">
                            <Layers className="w-4 h-4" />
                            Appointments List
                        </TabsTrigger>
                    </TabsList>
                    </div>

                    <TabsContent value="master" className="space-y-6 mt-0">
                        {emergencyAlerts && emergencyAlerts.length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm animate-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                                        <AlertCircle className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-destructive uppercase tracking-widest">Clinician Emergency Reported</h4>
                                        <p className="text-xs text-destructive/70 font-medium leading-tight">There are active client sessions requiring immediate response.</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="font-bold text-[10px] uppercase tracking-widest h-8"
                                    onClick={() => setIsEmergencyModalOpen(true)}
                                >
                                    Open Command Center
                                </Button>
                            </div>
                        )}
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-2.5">
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : viewMode === "week" ? subWeeks(currentDate, 1) : subDays(currentDate, 1))}
                                                className="w-9 h-9 rounded-xl border-slate-200"
                                            >
                                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                                            </Button>
                                            <h2 className="text-base font-semibold text-slate-800 min-w-[140px] text-center tracking-tight">
                                                {format(currentDate, viewMode === "month" ? "MMMM yyyy" : "MMMM d, yyyy")}
                                            </h2>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : viewMode === "week" ? addWeeks(currentDate, 1) : addDays(currentDate, 1))}
                                                className="w-9 h-9 rounded-xl border-slate-200"
                                            >
                                                <ChevronRight className="w-4 h-4 text-slate-600" />
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setCurrentDate(new Date())} 
                                                className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider hover:bg-slate-50 transition-colors"
                                            >
                                                Today
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider hover:bg-slate-50 transition-colors">
                                                        <Filter className={cn("w-3.5 h-3.5", (filterMode === 'role' ? selectedRole !== 'all' : selectedConsultants.length > 0) ? "text-primary fill-primary/10" : "text-slate-500")} />
                                                        <span>Filter</span>
                                                        {(filterMode === 'role' ? selectedRole !== 'all' : selectedConsultants.length > 0) && (
                                                            <span className="ml-1 px-1.5 py-0.5 text-[8px] font-extrabold bg-primary text-white rounded-full">
                                                                {filterMode === 'role' ? 1 : selectedConsultants.length}
                                                            </span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl z-50" align="end">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                                                            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Calendar Filters</h4>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => {
                                                                    setSelectedRole("all");
                                                                    setSelectedConsultants([]);
                                                                }}
                                                                className="text-[9px] uppercase font-bold text-muted-foreground h-6 px-2 hover:bg-slate-100 rounded-lg"
                                                            >
                                                                Reset
                                                            </Button>
                                                        </div>

                                                        {/* Toggle between Role and Individual */}
                                                        <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-xl border border-slate-100">
                                                            <button
                                                                onClick={() => setFilterMode('role')}
                                                                className={cn(
                                                                    "py-1.5 text-[9px] font-black uppercase rounded-lg transition-all text-center",
                                                                    filterMode === 'role' ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
                                                                )}
                                                            >
                                                                By Role
                                                            </button>
                                                            <button
                                                                onClick={() => setFilterMode('individual')}
                                                                className={cn(
                                                                    "py-1.5 text-[9px] font-black uppercase rounded-lg transition-all text-center",
                                                                    filterMode === 'individual' ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"
                                                                )}
                                                            >
                                                                By Specialist
                                                            </button>
                                                        </div>

                                                        {/* Content based on selected mode */}
                                                        {filterMode === 'role' ? (
                                                            <div className="space-y-2 pt-1">
                                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Select Specialist Role</Label>
                                                                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                                                                    <button
                                                                        onClick={() => setSelectedRole("all")}
                                                                        className={cn(
                                                                            "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors",
                                                                            selectedRole === "all" ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-700"
                                                                        )}
                                                                    >
                                                                        <span>All Roles</span>
                                                                        {selectedRole === "all" && <Check className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                    {rolesList.map(role => (
                                                                        <button
                                                                            key={role}
                                                                            onClick={() => setSelectedRole(role)}
                                                                            className={cn(
                                                                                "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors uppercase",
                                                                                selectedRole === role ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-700"
                                                                            )}
                                                                        >
                                                                            <span>{role}s</span>
                                                                            {selectedRole === role && <Check className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2 pt-1">
                                                                <div className="flex justify-between items-center">
                                                                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Select Specialists</Label>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => setSelectedConsultants([...consultants.map(c => c.id), ...(hasUnassignedSessionsGlobal ? ['unassigned'] : [])])}
                                                                            className="text-[9px] font-bold uppercase text-primary hover:underline"
                                                                        >
                                                                            Select All
                                                                        </button>
                                                                        <span className="text-[9px] text-slate-300">|</span>
                                                                        <button
                                                                            onClick={() => setSelectedConsultants([])}
                                                                            className="text-[9px] font-bold uppercase text-primary hover:underline"
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                                                    {[...consultants, ...(hasUnassignedSessionsGlobal ? [{ id: 'unassigned', name: 'Unassigned', profession: 'Clinic Slot', avatar_url: null, emergency_alerts: [] }] : [])].map(c => {
                                                                        const isChecked = selectedConsultants.includes(c.id);
                                                                        return (
                                                                            <div
                                                                                key={c.id}
                                                                                onClick={() => {
                                                                                    if (isChecked) {
                                                                                        setSelectedConsultants(selectedConsultants.filter(id => id !== c.id));
                                                                                    } else {
                                                                                        setSelectedConsultants([...selectedConsultants, c.id]);
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                                                                            >
                                                                                <Checkbox
                                                                                    checked={isChecked}
                                                                                    onCheckedChange={() => {}}
                                                                                    className="rounded-[4px] border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                                                />
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                                                                                    {c.profession && (
                                                                                        <p className="text-[9px] text-slate-400 font-medium uppercase truncate leading-none mt-0.5">{c.profession}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
 
                                             <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-100">
                                                {(["day", "week", "month"] as ViewMode[]).map((m) => (
                                                    <Button 
                                                        key={m} 
                                                        variant={viewMode === m ? "default" : "ghost"} 
                                                        size="sm" 
                                                        onClick={() => setViewMode(m)} 
                                                        className={cn(
                                                            "h-8 px-3 text-[10px] font-bold uppercase rounded-lg transition-all", 
                                                            viewMode === m ? "bg-white text-primary shadow-sm hover:bg-white" : "text-slate-600 hover:text-slate-900"
                                                        )}
                                                    >
                                                        {m}
                                                    </Button>
                                                ))}
                                            </div>
                                            
                                            <Button 
                                                size="sm" 
                                                className="h-9 gap-1.5 font-bold text-[10px] uppercase tracking-wider pl-3 pr-4 rounded-xl shadow-md bg-primary hover:bg-primary/95 text-white active:scale-95 transition-all" 
                                                onClick={() => { setWaitlistInitialData(null); setIsBookModalOpen(true); }}
                                            >
                                                <Plus className="w-4 h-4" /> Schedule
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
                </Tabs>
            </div>

            <AdminBookSessionModal 
                open={isBookModalOpen} 
                onOpenChange={(open) => {
                    setIsBookModalOpen(open);
                    if (!open) setWaitlistInitialData(null);
                }} 
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["admin-master-sessions"] });
                    queryClient.invalidateQueries({ queryKey: ["waitlist-summary"] });
                    queryClient.invalidateQueries({ queryKey: ["planned-client-entitlements"] });
                }} 
                initialData={waitlistInitialData}
            />

            <AdminSessionStatusModal
                open={!!selectedSession}
                onOpenChange={(open) => !open && setSelectedSession(null)}
                session={selectedSession}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["admin-master-sessions"] });
                    queryClient.invalidateQueries({ queryKey: ["waitlist-summary"] });
                    queryClient.invalidateQueries({ queryKey: ["planned-client-entitlements"] });
                }} 
            />

            <EmergencyResponseModal
                open={isEmergencyModalOpen}
                onOpenChange={setIsEmergencyModalOpen}
                organizationId={profile?.organization_id || ""}
            />
        </DashboardLayout>
    );
}
