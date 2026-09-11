import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SessionCategoryFilterBar from "@/components/shared/SessionCategoryFilterBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    ArrowLeft, User, Phone, CalendarDays, Activity, ClipboardList, History, X,
    Download, FileText, Trophy, FileStack, CheckSquare, Trash2,
    AlertTriangle, Loader2, Clock, CheckCircle2, Edit3, Calendar, PlusCircle
} from "lucide-react";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import AMSTrainingLoadWidget from "@/components/dashboard/AMSTrainingLoadWidget";
import LogInjuryModal from "@/components/consultant/LogInjuryModal";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import ResolveInjuryModal from "@/components/consultant/ResolveInjuryModal";
import AdHocSessionModal from "@/components/consultant/AdHocSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";
import { format, parse, isToday, isTomorrow, differenceInCalendarDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import * as XLSX from "xlsx";
import { VIPName } from "@/components/ui/VIPBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PerformanceSnapshot from "@/components/consultant/PerformanceSnapshot";
import PerformanceAnalytics from "@/components/ams/PerformanceAnalytics";
import { DocumentManager } from "@/components/admin/documents/DocumentManager";
import { EnquiryContextWindow } from "@/components/admin/EnquiryContextWindow";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { AssessmentReportsList } from "@/components/shared/assessment/AssessmentReportsList";
import { cn, formatClientName } from "@/lib/utils";

export const SESSION_CATEGORY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
    physiotherapy: {
        label: "Physiotherapy",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
    },
    sports_science: {
        label: "Sports Science",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
    },
    device_assessment: {
        label: "Device Assessments",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
    },
    nutrition: {
        label: "Nutrition",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
    },
    active_recovery: {
        label: "Active Recovery",
        badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
    },
    other: {
        label: "Other",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
};

const parseDDMMYYYY = (val: string): string | null => {
    const parts = val.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
};

// Helper: determine if a session is upcoming / planned
export const isUpcomingSession = (s: any): boolean => {
    const st = (s.status || '').toLowerCase();
    if (st === 'completed' || st === 'deleted') return false;
    if (['planned', 'scheduled', 'booked'].includes(st)) return true;
    const sessionTime = new Date(s.scheduled_start).getTime();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    return sessionTime >= todayStart;
};

// Helper: format upcoming relative date pill
const formatUpcomingRelativeTime = (dateObj: Date): string => {
    if (isToday(dateObj)) return "Today";
    if (isTomorrow(dateObj)) return "Tomorrow";
    const diff = differenceInCalendarDays(dateObj, new Date());
    if (diff > 0 && diff <= 7) return `In ${diff} days`;
    return "";
};

export default function ConsultantClientProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const { toast } = useToast();
    
    // Determine route context & appropriate layout role
    const isSpecialistRoute = location.pathname.startsWith('/sports-scientist') || location.pathname.startsWith('/mobile/specialist');
    const layoutRole = isSpecialistRoute ? 'sports_scientist' : 'consultant';

    const handleBack = () => {
        if (location.pathname.startsWith('/sports-scientist')) {
            navigate('/sports-scientist/clients');
        } else if (location.pathname.startsWith('/mobile/specialist')) {
            navigate('/mobile/specialist/clients');
        } else if (location.pathname.startsWith('/mobile')) {
            navigate('/mobile/consultant/clients');
        } else {
            navigate('/consultant/clients');
        }
    };

    // Tab state & synchronization with URL search param
    const validTabs = ['sessions', 'diagnoses', 'assessments', 'performance'];
    const resolveTab = (tab: string | null) => {
        if (tab && validTabs.includes(tab)) return tab;
        return 'sessions';
    };

    const [activeTab, setActiveTab] = useState<string>(() => resolveTab(tabParam));

    // Core data
    const [client, setClient] = useState<any>(null);
    const [injuries, setInjuries] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Active modals
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [soapModalOpen, setSoapModalOpen] = useState(false);
    const [selectedInjuryToResolve, setSelectedInjuryToResolve] = useState<any>(null);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [adHocModalOpen, setAdHocModalOpen] = useState(false);
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
    const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

    // Session selection & upcoming plan management state
    const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
    const [editingSessionForStatus, setEditingSessionForStatus] = useState<any>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isCancelPlanDialogOpen, setIsCancelPlanDialogOpen] = useState(false);
    const [cancelPlanReason, setCancelPlanReason] = useState("");
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<string>("Cancelled");
    const [bulkReason, setBulkReason] = useState<string>("");
    const [actionLoading, setActionLoading] = useState(false);
    const [mobileViewMode, setMobileViewMode] = useState<'table' | 'cards'>('table');

    // Auth & Permissions
    const { roles, profile: currentUserProfile } = useAuth();
    const isAdmin = roles.includes('admin');
    const isClinicalSpecialist = currentUserProfile?.profession === 'Sports Physician' || 
                                 currentUserProfile?.profession === 'Physiotherapist' ||
                                 roles.includes('sports_physician') || 
                                 roles.includes('physiotherapist') ||
                                 roles.includes('consultant');
    const isSportsScientist = currentUserProfile?.profession === 'Sports Scientist' || 
                              roles.includes('sports_scientist') ||
                              isSpecialistRoute;
    const isAdminOrFoe = roles?.some(r => ["admin", "super_admin", "clinic_admin", "foe"].includes(r));
    const canAccessDocuments = isAdmin || isClinicalSpecialist || isSportsScientist;

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startDateInput, setStartDateInput] = useState("");
    const [endDateInput, setEndDateInput] = useState("");
    const [sessionTypeFilter, setSessionTypeFilter] = useState("all");
    const [statusScope, setStatusScope] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>(
        tabParam === 'upcoming' ? 'upcoming' : 'all'
    );

    useEffect(() => {
        if (tabParam === 'upcoming') {
            setActiveTab('sessions');
            setStatusScope('upcoming');
        } else if (tabParam && validTabs.includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', val);
        setSearchParams(nextParams, { replace: true });
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id, startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const clientData = await apiFetch<any>(`/clients/${id}`);
            setClient(clientData);

            const injuryData = await apiFetch<any[]>(`/clinical/injuries`, {
                params: { client_id: id }
            });
            setInjuries(injuryData || []);

            const sessionData = await apiFetch<any[]>(`/clients/${id}/sessions`, {
                params: { startDate, endDate }
            });
            setSessions(sessionData || []);

        } catch (err: unknown) {
            const error = err as Error;
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Category Counts
    const categoryCounts = useMemo(() => {
        const counts = {
            all: sessions.length,
            completed: 0,
            physiotherapy: 0,
            sports_science: 0,
            device_assessment: 0,
            nutrition: 0,
            active_recovery: 0,
            other: 0,
        };
        sessions.forEach((s: any) => {
            if (s.status === 'Completed') counts.completed++;
            const cat = (s.session_category || 'other') as keyof typeof counts;
            if (counts[cat] !== undefined) {
                counts[cat]++;
            } else {
                counts.other++;
            }
        });
        return counts;
    }, [sessions]);

    // Category Filtered Sessions
    const categoryFilteredSessions = useMemo(() => {
        if (!sessionTypeFilter || sessionTypeFilter === 'all') return sessions;
        return sessions.filter((s: any) => {
            return s.session_category === sessionTypeFilter || 
                   (s.service_type || '').toLowerCase() === sessionTypeFilter.toLowerCase();
        });
    }, [sessions, sessionTypeFilter]);

    // Status Scope Counts (computed from category-filtered sessions)
    const scopeCounts = useMemo(() => {
        let upcoming = 0;
        let completed = 0;
        let cancelled = 0;

        categoryFilteredSessions.forEach((s: any) => {
            if (s.status === 'Completed') completed++;
            else if (isUpcomingSession(s)) upcoming++;
            else if (['cancelled', 'missed'].includes((s.status || '').toLowerCase())) cancelled++;
        });

        return {
            all: categoryFilteredSessions.length,
            upcoming,
            completed,
            cancelled
        };
    }, [categoryFilteredSessions]);

    // Final Displayed Sessions (with differentiation & smart sorting)
    const displayedSessions = useMemo(() => {
        let list = categoryFilteredSessions;
        if (statusScope === 'upcoming') {
            list = list.filter(s => isUpcomingSession(s));
        } else if (statusScope === 'completed') {
            list = list.filter(s => s.status === 'Completed');
        } else if (statusScope === 'cancelled') {
            list = list.filter(s => ['cancelled', 'missed'].includes((s.status || '').toLowerCase()));
        }

        // In 'all' view: place upcoming sessions prominently at the top, followed by completed history
        if (statusScope === 'all') {
            const upcoming = list
                .filter(s => isUpcomingSession(s))
                .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
            const pastAndOthers = list
                .filter(s => !isUpcomingSession(s))
                .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());
            return [...upcoming, ...pastAndOthers];
        }

        return list;
    }, [categoryFilteredSessions, statusScope]);

    // Non-completed / editable sessions available for checkbox selection
    const editableSessions = useMemo(() => {
        return displayedSessions.filter((s: any) => s.status?.toLowerCase() !== 'completed' && s.status?.toLowerCase() !== 'deleted');
    }, [displayedSessions]);

    const isAllSelected = editableSessions.length > 0 && editableSessions.every((s: any) => selectedSessionIds.includes(s.id));

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSessionIds(editableSessions.map((s: any) => s.id));
        } else {
            setSelectedSessionIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedSessionIds(prev => [...prev, id]);
        } else {
            setSelectedSessionIds(prev => prev.filter(item => item !== id));
        }
    };

    // Active & Resolved injuries
    const activeInjuries = useMemo(() => injuries.filter(i => i.status !== 'Resolved'), [injuries]);
    const resolvedInjuries = useMemo(() => injuries.filter(i => i.status === 'Resolved'), [injuries]);

    // Action handlers
    const handleSingleEditStatus = (session: any) => {
        setEditingSessionForStatus(session);
        setIsStatusModalOpen(true);
    };

    const handleSingleDelete = async (sessionId: string) => {
        if (!window.confirm("Are you sure you want to delete this session record? Full audit logs of this deletion will be preserved.")) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/appointments/${sessionId}`, {
                method: "DELETE",
                body: JSON.stringify({ reason: "Single session record deleted by consultant" })
            });
            toast({ title: "Session Deleted", description: "The session record has been removed." });
            setSelectedSessionIds(prev => prev.filter(item => item !== sessionId));
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete session", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSessionIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedSessionIds.length} selected session record(s)?`)) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/appointments/bulk-delete`, {
                method: "POST",
                body: JSON.stringify({
                    ids: selectedSessionIds,
                    reason: `Bulk deleted ${selectedSessionIds.length} selected sessions by consultant`
                })
            });
            toast({
                title: "Sessions Deleted ✓",
                description: `Successfully deleted ${selectedSessionIds.length} session records.`
            });
            setSelectedSessionIds([]);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete selected sessions", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkEditSubmit = async () => {
        if (selectedSessionIds.length === 0) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/appointments/bulk-edit`, {
                method: "POST",
                body: JSON.stringify({
                    ids: selectedSessionIds,
                    status: bulkStatus,
                    cancellation_reason: bulkReason || null
                })
            });
            toast({
                title: "Selected Sessions Updated",
                description: `Updated ${selectedSessionIds.length} session(s) to ${bulkStatus}.`
            });
            setIsBulkEditDialogOpen(false);
            setBulkReason("");
            setSelectedSessionIds([]);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to update selected sessions", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEntirePlan = async () => {
        setActionLoading(true);
        try {
            const res = await apiFetch<any>(`/api/appointments/client/${id}/cancel-future-plan`, {
                method: "POST",
                body: JSON.stringify({ reason: cancelPlanReason || "Future sessions cancelled by specialist" })
            });
            toast({
                title: "Future Sessions Cancelled",
                description: `Successfully cancelled all ${res?.cancelled_count || 0} future sessions.`
            });
            setIsCancelPlanDialogOpen(false);
            setCancelPlanReason("");
            setSelectedSessionIds([]);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to cancel future plan", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (!displayedSessions || displayedSessions.length === 0) {
            toast({ title: "No data to export", description: "No sessions match the selected duration or filter.", variant: "destructive" });
            return;
        }

        const clientFullName = client ? `${client.first_name || ""} ${client.last_name || ""}`.trim() : "-";
        const clientUHID = client?.uhid || "-";

        const exportData = displayedSessions.map((s: any) => {
            const psd = s.physio_session_details?.[0] || {};
            const startTime = s.scheduled_start ? new Date(s.scheduled_start) : null;
            const endTime = s.scheduled_end ? new Date(s.scheduled_end) : null;

            let durationStr = "-";
            if (s.duration_minutes !== undefined && s.duration_minutes !== null) {
                durationStr = `${s.duration_minutes} mins`;
            } else if (startTime && endTime) {
                const diffMins = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)));
                durationStr = `${diffMins} mins`;
            }

            const specialistName = s.therapist?.first_name || s.therapist?.last_name 
                ? `${s.therapist.first_name || ""} ${s.therapist.last_name || ""}`.trim() 
                : "-";

            const loggedByName = s.logged_by?.first_name || s.logged_by?.last_name
                ? `${s.logged_by.first_name || ""} ${s.logged_by.last_name || ""}`.trim()
                : (specialistName !== "-" ? specialistName : "System Staff");

            const catDisplay = SESSION_CATEGORY_CONFIG[s.session_category]?.label || s.session_category || s.service_type || "General";

            let entitlementDisplay = "Entitled";
            if (s.session_category === 'sports_science') {
                entitlementDisplay = "Exempt (Sports Science)";
            } else if (s.is_unentitled) {
                entitlementDisplay = "UN-ENTITLED";
            }

            const notes = psd.clinical_notes || s.session_notes || "-";
            const recommendations = psd.next_plan || "-";
            const modalities = psd.modality_used || psd.treatment_type || "-";

            return {
                'Client Name': clientFullName,
                'UHID': clientUHID,
                'Category': catDisplay,
                'Session Type': s.service_type || "-",
                'Session Mode': s.session_mode || "Individual",
                'Date': startTime ? format(startTime, "dd MMM yyyy") : "-",
                'From Time': startTime ? format(startTime, "hh:mm a") : "-",
                'To Time': endTime ? format(endTime, "hh:mm a") : "-",
                'Duration': durationStr,
                'Specialist / Consultant': specialistName,
                'Logged By': loggedByName,
                'Status': s.status || "-",
                'Pain Score': psd.pain_score !== undefined && psd.pain_score !== null ? `${psd.pain_score}/10` : "-",
                'Treatment / Modality': modalities,
                'Clinical Notes / Remarks': notes,
                'Recommendations / Next Plan': recommendations,
                'Entitlement Status': entitlementDisplay
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [
            { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 12 },
            { wch: 12 }, { wch: 22 }, { wch: 36 }, { wch: 32 }, { wch: 24 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Session Records");
        const categorySlug = sessionTypeFilter === 'all' ? 'All_Sessions' : (SESSION_CATEGORY_CONFIG[sessionTypeFilter]?.label || sessionTypeFilter).replace(/\s+/g, '_');
        XLSX.writeFile(workbook, `Session_History_${client?.uhid || client?.last_name || id}_${categorySlug}.xlsx`);
    };

    if (loading) return <DashboardLayout role={layoutRole}><div className="p-8 text-sm text-muted-foreground">Loading client profile...</div></DashboardLayout>;
    if (!client) return <DashboardLayout role={layoutRole}><div className="p-8 text-sm text-muted-foreground">Client not found.</div></DashboardLayout>;

    const clientInitials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase() || "CL";

    return (
        <DashboardLayout role={layoutRole}>
            <div className="w-full space-y-6 pb-32 md:pb-20">
                
                {/* Clean Top Profile Banner (Balanced 2-Tier Executive Layout) */}
                <Card className="border-border/60 shadow-xs bg-gradient-to-r from-card via-card to-muted/20 overflow-hidden">
                    <CardContent className="p-4 sm:p-5">
                        {/* Tier 1: Client Identity & Action Toolbar */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            
                            {/* Left: Avatar, Name & Demographics */}
                            <div className="flex items-start sm:items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={handleBack}
                                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground mt-0.5 sm:mt-0"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                
                                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-sm sm:text-base flex items-center justify-center shrink-0">
                                    {clientInitials}
                                </div>

                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <h1 className="text-lg sm:text-2xl font-display font-bold text-foreground tracking-tight break-words">
                                            <VIPName name={formatClientName(client, { includeHonorific: true })} isVIP={client.is_vip} />
                                        </h1>
                                        <Badge variant="outline" className="font-mono text-[10px] sm:text-xs font-semibold px-2 py-0.5 bg-muted/40">
                                            {client.uhid}
                                        </Badge>
                                        {client.sport && (
                                            <Badge variant="secondary" className="text-[10px] sm:text-[11px] font-semibold text-primary bg-primary/10">
                                                {client.sport}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 sm:gap-x-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5 text-muted-foreground/70" /> 
                                            {client.gender || "Unknown"} • {client.age ? `${client.age} yrs` : "--"}
                                        </span>
                                        {client.mobile_no && (
                                            <span className="flex items-center gap-1 font-mono">
                                                <Phone className="w-3.5 h-3.5 text-muted-foreground/70" /> 
                                                {client.mobile_no}
                                            </span>
                                        )}
                                        {client.athlete_type && (
                                            <span className="text-muted-foreground">
                                                Type: <strong className="text-foreground">{client.athlete_type}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions Toolbar with complete visual uniformity */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                                <Button 
                                    size="sm"
                                    onClick={() => setAdHocModalOpen(true)}
                                    className="flex-1 sm:flex-initial h-9 px-3.5 gap-2 text-xs font-bold rounded-xl shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap transition-all"
                                >
                                    <ClipboardList className="w-4 h-4" /> Add SOAP Note
                                </Button>

                                <LogInjuryModal
                                    clientId={client.id}
                                    organizationId={client.organization_id}
                                    onSuccess={fetchData}
                                    trigger={
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 sm:flex-initial h-9 px-3.5 gap-2 text-xs font-bold rounded-xl border-border/80 bg-card hover:bg-muted/70 text-foreground shadow-2xs whitespace-nowrap transition-all"
                                        >
                                            <PlusCircle className="w-4 h-4 text-primary" /> Log New Injury
                                        </Button>
                                    }
                                />

                                {canAccessDocuments && (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-9 px-3.5 gap-2 text-xs font-bold rounded-xl border-border/80 bg-card hover:bg-muted/70 text-foreground shadow-2xs whitespace-nowrap transition-all"
                                        onClick={() => setIsDocumentModalOpen(true)}
                                    >
                                        <FileStack className="w-4 h-4 text-muted-foreground" /> Documents
                                    </Button>
                                )}

                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-9 px-3.5 gap-2 text-xs font-bold rounded-xl border-border/80 bg-card hover:bg-muted/70 text-foreground shadow-2xs whitespace-nowrap transition-all"
                                    onClick={() => setIsEnquiryOpen(true)}
                                >
                                    <History className="w-4 h-4 text-muted-foreground" /> Inquiry
                                </Button>
                            </div>
                        </div>

                        {/* Tier 2: Dedicated Horizontal KPI Strip (No Text Wrapping / Zero Clipping!) */}
                        <div className="mt-3.5 pt-3 border-t border-border/40 flex flex-wrap items-center gap-2.5">
                            <div className="px-3 py-1 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center gap-2 shrink-0 whitespace-nowrap">
                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Active Diagnoses:</span>
                                <Badge variant={activeInjuries.length > 0 ? "destructive" : "secondary"} className="px-2 py-0.5 text-[10px] font-bold whitespace-nowrap leading-none shrink-0">
                                    {activeInjuries.length}
                                </Badge>
                            </div>

                            <div className="px-3 py-1 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center gap-2 shrink-0 whitespace-nowrap">
                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Total Sessions:</span>
                                <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold font-mono whitespace-nowrap leading-none shrink-0">
                                    {categoryCounts.all}
                                </Badge>
                            </div>

                            <div className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-xs flex items-center gap-2 shrink-0 whitespace-nowrap">
                                <span className="text-[10px] uppercase font-black text-sky-700 dark:text-sky-300 tracking-wider">Upcoming & Planned:</span>
                                <Badge className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold font-mono whitespace-nowrap leading-none shrink-0",
                                    scopeCounts.upcoming > 0 ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                    {scopeCounts.upcoming}
                                </Badge>
                            </div>

                            <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs flex items-center gap-2 shrink-0 whitespace-nowrap">
                                <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-300 tracking-wider">Completed:</span>
                                <Badge className="bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold font-mono whitespace-nowrap leading-none shrink-0">
                                    {categoryCounts.completed}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs Architecture */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
                    
                    <div className="w-full overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                        <TabsList className="bg-muted/60 p-1.5 rounded-2xl inline-flex w-max min-w-full justify-start border border-border/40 gap-1 shrink-0">
                            <TabsTrigger 
                                value="sessions" 
                                className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3.5 py-2 shrink-0 whitespace-nowrap"
                            >
                                <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                                <span>Sessions & Notes</span>
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-mono font-bold shrink-0">
                                    {categoryCounts.all}
                                </Badge>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="diagnoses" 
                                className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3.5 py-2 shrink-0 whitespace-nowrap"
                            >
                                <Activity className="w-4 h-4 text-red-500 shrink-0" />
                                <span>Clinical Diagnoses</span>
                                {activeInjuries.length > 0 && (
                                    <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px] font-bold shrink-0">
                                        {activeInjuries.length}
                                    </Badge>
                                )}
                            </TabsTrigger>

                            <TabsTrigger 
                                value="assessments" 
                                className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3.5 py-2 shrink-0 whitespace-nowrap"
                            >
                                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Assessment Reports</span>
                            </TabsTrigger>

                            <TabsTrigger 
                                value="performance" 
                                className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3.5 py-2 shrink-0 whitespace-nowrap"
                            >
                                <Trophy className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span>Performance & AMS</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ==================== TAB 1: SESSIONS & CLINICAL NOTES ==================== */}
                    <TabsContent value="sessions" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                        <Card className="border-border shadow-xs -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x">
                            <CardHeader className="pb-3 border-b border-border/40 p-4 sm:p-6">
                                
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ClipboardList className="w-5 h-5 text-primary" /> Sessions History & Clinical Records
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Unified records of upcoming scheduled sessions and completed clinical history with SOAP notes, provider logs, and future plan management.
                                        </CardDescription>
                                    </div>

                                    {/* Action buttons: Mobile View Switcher, Cancel Future Plan & Export to Excel */}
                                    <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                                        <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-xl border border-border/40 md:hidden">
                                            <button
                                                type="button"
                                                onClick={() => setMobileViewMode('table')}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                                                    mobileViewMode === 'table' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Table View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMobileViewMode('cards')}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                                                    mobileViewMode === 'cards' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Card View
                                            </button>
                                        </div>

                                        {scopeCounts.upcoming > 0 && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-9 px-3.5 gap-2 text-xs font-bold rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 shadow-2xs"
                                                onClick={() => setIsCancelPlanDialogOpen(true)}
                                            >
                                                <AlertTriangle className="w-4 h-4" /> Cancel Future Plan ({scopeCounts.upcoming})
                                            </Button>
                                        )}

                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-9 px-3.5 gap-2 text-xs font-bold rounded-xl border-border/80 bg-card hover:bg-muted/70 text-foreground shadow-2xs"
                                            onClick={handleExportExcel}
                                        >
                                            <Download className="w-4 h-4 text-primary" /> Export to Excel
                                        </Button>
                                    </div>
                                </div>

                                {/* Status Scope Pill Switcher: All | Upcoming | Completed | Cancelled */}
                                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x touch-pan-y overscroll-x-contain">
                                    <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/50 shrink-0">
                                        <button
                                            onClick={() => setStatusScope('all')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                                                statusScope === 'all'
                                                    ? "bg-background text-foreground shadow-xs"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            All Sessions ({scopeCounts.all})
                                        </button>
                                        <button
                                            onClick={() => setStatusScope('upcoming')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                                                statusScope === 'upcoming'
                                                    ? "bg-sky-600 text-white shadow-xs"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                                            Upcoming ({scopeCounts.upcoming})
                                        </button>
                                        <button
                                            onClick={() => setStatusScope('completed')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                                                statusScope === 'completed'
                                                    ? "bg-emerald-600 text-white shadow-xs"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Completed ({scopeCounts.completed})
                                        </button>
                                        {scopeCounts.cancelled > 0 && (
                                            <button
                                                onClick={() => setStatusScope('cancelled')}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                                                    statusScope === 'cancelled'
                                                        ? "bg-rose-600 text-white shadow-xs"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Cancelled ({scopeCounts.cancelled})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Date Range & Category Filters Bar */}
                                <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 items-end">
                                    <div className="flex flex-col gap-1 col-span-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Start Date</span>
                                        <div className="relative flex items-center h-9 w-full sm:w-[145px] bg-muted/30 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring">
                                            <Input 
                                                type="text" 
                                                placeholder="DD-MM-YYYY" 
                                                value={startDateInput} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setStartDateInput(val);
                                                    if (!val) {
                                                        setStartDate("");
                                                    } else {
                                                        const parsed = parseDDMMYYYY(val);
                                                        if (parsed) setStartDate(parsed);
                                                    }
                                                }} 
                                                className="w-full h-full bg-transparent px-2.5 py-1 text-[11px] border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-7 font-mono" 
                                            />
                                            <div className="absolute right-1 flex items-center">
                                                {startDateInput && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                        onClick={() => { setStartDate(""); setStartDateInput(""); }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground">
                                                            <CalendarDays className="h-3.5 w-3.5 text-primary opacity-70" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="end">
                                                        <CalendarPicker
                                                            mode="single"
                                                            selected={startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined}
                                                            onSelect={(date) => {
                                                                if (date) {
                                                                    setStartDate(format(date, "yyyy-MM-dd"));
                                                                    setStartDateInput(format(date, "dd-MM-yyyy"));
                                                                } else {
                                                                    setStartDate("");
                                                                    setStartDateInput("");
                                                                }
                                                            }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 col-span-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">End Date</span>
                                        <div className="relative flex items-center h-9 w-full sm:w-[145px] bg-muted/30 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring">
                                            <Input 
                                                type="text" 
                                                placeholder="DD-MM-YYYY" 
                                                value={endDateInput} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEndDateInput(val);
                                                    if (!val) {
                                                        setEndDate("");
                                                    } else {
                                                        const parsed = parseDDMMYYYY(val);
                                                        if (parsed) setEndDate(parsed);
                                                    }
                                                }} 
                                                className="w-full h-full bg-transparent px-2.5 py-1 text-[11px] border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-7 font-mono" 
                                            />
                                            <div className="absolute right-1 flex items-center">
                                                {endDateInput && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                        onClick={() => { setEndDate(""); setEndDateInput(""); }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground">
                                                            <CalendarDays className="h-3.5 w-3.5 text-primary opacity-70" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="end">
                                                        <CalendarPicker
                                                            mode="single"
                                                            selected={endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined}
                                                            onSelect={(date) => {
                                                                if (date) {
                                                                    setEndDate(format(date, "yyyy-MM-dd"));
                                                                    setEndDateInput(format(date, "dd-MM-yyyy"));
                                                                } else {
                                                                    setEndDate("");
                                                                    setEndDateInput("");
                                                                }
                                                            }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Session Category</span>
                                        <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                                            <SelectTrigger className="h-9 w-full sm:w-[190px] text-[11px] bg-muted/30 rounded-xl font-medium">
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories ({categoryCounts.all})</SelectItem>
                                                <SelectItem value="physiotherapy">Physiotherapy ({categoryCounts.physiotherapy})</SelectItem>
                                                <SelectItem value="sports_science">Sports Science ({categoryCounts.sports_science})</SelectItem>
                                                <SelectItem value="device_assessment">Device Assessments ({categoryCounts.device_assessment})</SelectItem>
                                                <SelectItem value="nutrition">Nutrition ({categoryCounts.nutrition})</SelectItem>
                                                <SelectItem value="active_recovery">Active Recovery Training ({categoryCounts.active_recovery})</SelectItem>
                                                <SelectItem value="other">Other ({categoryCounts.other})</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(startDate || endDate || sessionTypeFilter !== 'all' || statusScope !== 'all') && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => {
                                                setStartDate(""); setStartDateInput("");
                                                setEndDate(""); setEndDateInput("");
                                                setSessionTypeFilter("all");
                                                setStatusScope("all");
                                            }}
                                            className="h-9 px-2.5 text-[11px] text-muted-foreground hover:text-foreground col-span-2 sm:col-span-1"
                                        >
                                            Reset Filters
                                        </Button>
                                    )}
                                </div>

                                {/* Quick Category Filter Buttons with Sideways Scroller & Controls */}
                                <SessionCategoryFilterBar 
                                    selectedCategory={sessionTypeFilter} 
                                    onSelectCategory={setSessionTypeFilter} 
                                    categoryCounts={categoryCounts} 
                                    className="mt-3"
                                />

                            </CardHeader>

                            <CardContent className="p-0 sm:p-4">

                                {/* Bulk Action Bar (Docked when items selected) */}
                                {selectedSessionIds.length > 0 && (
                                    <div className="mb-4 mx-3 sm:mx-0 p-3 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50">
                                        <div className="flex items-center gap-2">
                                            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-xs font-bold text-foreground">
                                                {selectedSessionIds.length} session(s) selected
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                (Ready for bulk cancel or deletion)
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 text-xs font-bold rounded-xl border-primary/30 text-primary bg-background"
                                                onClick={() => setIsBulkEditDialogOpen(true)}
                                            >
                                                Update Status
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                className="h-8 text-xs font-bold rounded-xl"
                                                onClick={handleBulkDelete}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                                                Delete Selected
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 text-xs rounded-xl text-muted-foreground"
                                                onClick={() => setSelectedSessionIds([])}
                                            >
                                                Deselect All
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {displayedSessions.length === 0 ? (
                                    <div className="text-center py-12 text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed m-3 sm:m-0 space-y-1">
                                        <p className="font-semibold text-foreground">No sessions found matching current filters.</p>
                                        <p className="text-[11px]">Try switching status (e.g. All, Upcoming, Completed) or resetting date range.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile View: Clean Session Cards with Differentiation */}
                                        {mobileViewMode === 'cards' && (
                                            <div className="block md:hidden space-y-2.5 p-3">
                                            {displayedSessions.map((session: any) => {
                                                const consultantName = session.therapist?.first_name || session.therapist?.last_name ? (
                                                    `${session.therapist.first_name || ""} ${session.therapist.last_name || ""}`.trim()
                                                ) : "—";
                                                const loggedByName = session.logged_by?.first_name || session.logged_by?.last_name ? (
                                                    `${session.logged_by.first_name || ""} ${session.logged_by.last_name || ""}`.trim()
                                                ) : consultantName;
                                                const catConfig = SESSION_CATEGORY_CONFIG[session.session_category] || SESSION_CATEGORY_CONFIG.other;
                                                const isCompleted = session.status?.toLowerCase() === 'completed';
                                                const isUpcoming = isUpcomingSession(session);
                                                const isSelected = selectedSessionIds.includes(session.id);
                                                const relativeTiming = isUpcoming ? formatUpcomingRelativeTime(new Date(session.scheduled_start)) : "";

                                                return (
                                                    <div 
                                                        key={session.id}
                                                        className={cn(
                                                            "p-3.5 bg-card border rounded-2xl shadow-xs space-y-2.5 transition-all",
                                                            isUpcoming ? "border-l-4 border-l-sky-500 bg-sky-50/20 dark:bg-sky-950/10" : "border-border/60",
                                                            isSelected && "border-primary/60 bg-primary/5"
                                                        )}
                                                    >
                                                        {/* Top Row: Checkbox, Date & Status */}
                                                        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                {!isCompleted && (
                                                                    <Checkbox 
                                                                        checked={isSelected}
                                                                        onCheckedChange={(checked) => handleSelectOne(session.id, !!checked)}
                                                                        className="rounded-md"
                                                                    />
                                                                )}
                                                                <div className="text-xs font-black text-foreground font-mono flex items-center gap-1.5 leading-normal">
                                                                    <CalendarDays className={cn("w-3.5 h-3.5 shrink-0", isUpcoming ? "text-sky-600" : "text-primary")} />
                                                                    <span>{format(new Date(session.scheduled_start), "dd MMM yyyy, hh:mm a")}</span>
                                                                    {relativeTiming && (
                                                                        <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 text-[9px] px-1.5 py-0 border-none font-bold">
                                                                            {relativeTiming}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1">
                                                                {isUpcoming ? (
                                                                    <Badge className="bg-sky-600 text-white font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs whitespace-nowrap leading-none">
                                                                        <Calendar className="w-2.5 h-2.5" /> UPCOMING
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className={cn(
                                                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-none shadow-2xs whitespace-nowrap leading-none",
                                                                        session.status === 'Completed' ? "bg-emerald-600 text-white" :
                                                                        session.status === 'Cancelled' ? "bg-rose-500 text-white" :
                                                                        "bg-slate-600 text-white"
                                                                    )}>
                                                                        {session.status}
                                                                    </Badge>
                                                                )}

                                                                {session.session_category === 'sports_science' ? (
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-bold text-indigo-600 border-indigo-200 bg-indigo-50/60 dark:text-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/40 whitespace-nowrap leading-none">
                                                                        Exempt (SS)
                                                                    </Badge>
                                                                ) : session.is_unentitled && isAdminOrFoe ? (
                                                                    <Badge className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border-none whitespace-nowrap leading-none tracking-wider shadow-2xs">
                                                                        UN-ENTITLED
                                                                    </Badge>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {/* Details Grid */}
                                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                            <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40">
                                                                <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Category & Service</span>
                                                                <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 mb-1 inline-block", catConfig.badgeClass)}>
                                                                    {catConfig.label}
                                                                </Badge>
                                                                <p className="font-semibold text-foreground truncate">{session.service_type || 'Performance'}</p>
                                                            </div>

                                                            <div className="bg-muted/30 p-2.5 rounded-xl border border-border/40">
                                                                <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1">Consultant & Logged By</span>
                                                                <div className="flex items-center gap-1 font-bold text-foreground truncate">
                                                                    <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                    <span className="truncate">{consultantName}</span>
                                                                </div>
                                                                <span className="text-[9px] text-muted-foreground block truncate mt-0.5">By: {loggedByName}</span>
                                                            </div>
                                                        </div>

                                                        {/* Actions & Notes Footer */}
                                                        <div className="pt-2 border-t border-border/40 text-[11px] flex items-center justify-between">
                                                            {isUpcoming ? (
                                                                <span className="text-sky-700 dark:text-sky-300 text-xs flex items-center gap-1 font-medium truncate max-w-[180px]">
                                                                    <Clock className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                                                                    {session.session_notes ? session.session_notes : "Upcoming Appointment"}
                                                                </span>
                                                            ) : session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                                    <FileText className="w-3.5 h-3.5" /> Pain: {session.physio_session_details[0].pain_score}/10
                                                                </span>
                                                            ) : session.session_notes ? (
                                                                <span className="text-muted-foreground truncate max-w-[180px]">
                                                                    {session.session_notes}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground italic text-xs">No notes logged</span>
                                                            )}

                                                            <div className="flex items-center gap-1.5">
                                                                {isUpcoming ? (
                                                                    <>
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="h-7 text-xs font-bold border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 px-2"
                                                                            onClick={() => handleSingleEditStatus(session)}
                                                                        >
                                                                            <Edit3 className="w-3 h-3 mr-1" /> Edit
                                                                        </Button>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                            onClick={() => handleSingleDelete(session.id)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </>
                                                                ) : isCompleted ? (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-7 text-xs font-bold text-primary px-2"
                                                                        onClick={() => { setSelectedSession(session); setSoapModalOpen(true); }}
                                                                    >
                                                                        {session.physio_session_details?.length > 0 ? "View Details" : "+ Add SOAP"}
                                                                    </Button>
                                                                ) : (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-7 text-xs font-bold text-primary px-2"
                                                                        onClick={() => handleSingleEditStatus(session)}
                                                                    >
                                                                        Manage
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        )}

                                        {/* Full-Width Table View (Spans 100% width on Desktop and entire width on Mobile with horizontal scroll) */}
                                        <div 
                                            className={cn(
                                                "w-full overflow-x-auto rounded-none sm:rounded-2xl border-y sm:border border-border/60 touch-pan-x touch-pan-y overscroll-x-contain",
                                                mobileViewMode === 'cards' ? "hidden md:block" : "block"
                                            )}
                                            style={{ WebkitOverflowScrolling: "touch" }}
                                        >
                                            <Table className="w-full text-xs min-w-[760px]">
                                                <TableHeader className="bg-muted/40">
                                                    <TableRow>
                                                        <TableHead className="w-10 text-center">
                                                            <Checkbox 
                                                                checked={isAllSelected}
                                                                onCheckedChange={handleSelectAll}
                                                                disabled={editableSessions.length === 0}
                                                                className="rounded-md"
                                                            />
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Date & Time</TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Category & Service</TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Specialist</TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Logged By</TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Duration</TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap min-w-[130px]">Status & Entitlement</TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider min-w-[190px]">SOAP / Notes</TableHead>
                                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap min-w-[110px]">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {displayedSessions.map((session: any) => {
                                                        const catConfig = SESSION_CATEGORY_CONFIG[session.session_category] || SESSION_CATEGORY_CONFIG.other;
                                                        const consultantName = session.therapist?.first_name || session.therapist?.last_name ? (
                                                            `${session.therapist.first_name || ""} ${session.therapist.last_name || ""}`.trim()
                                                        ) : "—";
                                                        const loggedByName = session.logged_by?.first_name || session.logged_by?.last_name ? (
                                                            `${session.logged_by.first_name || ""} ${session.logged_by.last_name || ""}`.trim()
                                                        ) : consultantName;

                                                        const startTime = session.scheduled_start ? new Date(session.scheduled_start) : null;
                                                        const endTime = session.scheduled_end ? new Date(session.scheduled_end) : null;
                                                        const durationMins = session.duration_minutes !== undefined && session.duration_minutes !== null
                                                            ? session.duration_minutes
                                                            : (startTime && endTime ? Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))) : 0);
                                                        
                                                        const isCompleted = session.status?.toLowerCase() === 'completed';
                                                        const isUpcoming = isUpcomingSession(session);
                                                        const isSelected = selectedSessionIds.includes(session.id);
                                                        const relativeTiming = isUpcoming && startTime ? formatUpcomingRelativeTime(startTime) : "";

                                                        return (
                                                            <TableRow 
                                                                key={session.id} 
                                                                className={cn(
                                                                    "transition-colors cursor-pointer",
                                                                    isUpcoming 
                                                                        ? "bg-sky-50/30 dark:bg-sky-950/15 border-l-4 border-l-sky-500 hover:bg-sky-50/60 dark:hover:bg-sky-900/25" 
                                                                        : "hover:bg-muted/15",
                                                                    isSelected && "bg-primary/5"
                                                                )}
                                                                onClick={(e) => {
                                                                    const target = e.target as HTMLElement;
                                                                    if (target.closest('button') || target.closest('input[type="checkbox"]')) return;
                                                                    if (isCompleted) {
                                                                        setSelectedSession(session);
                                                                        setSoapModalOpen(true);
                                                                    } else {
                                                                        handleSingleEditStatus(session);
                                                                    }
                                                                }}
                                                            >
                                                                {/* Selection Checkbox */}
                                                                <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                                                                    {!isCompleted ? (
                                                                        <Checkbox 
                                                                            checked={isSelected}
                                                                            onCheckedChange={(checked) => handleSelectOne(session.id, !!checked)}
                                                                            className="rounded-md"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-muted-foreground/30 text-xs">—</span>
                                                                    )}
                                                                </TableCell>

                                                                {/* Date & Time (Clean Vertical Rhythm, Zero Clipping!) */}
                                                                <TableCell className="py-3 px-3 whitespace-nowrap">
                                                                    <div className="font-semibold text-xs text-foreground leading-normal">
                                                                        {startTime ? format(startTime, "dd MMM yyyy") : "-"}
                                                                    </div>
                                                                    <div className="text-[11px] text-muted-foreground font-mono leading-normal flex items-center gap-1 mt-0.5">
                                                                        <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                                                        <span>{startTime ? format(startTime, "hh:mm a") : "-"}</span>
                                                                        {relativeTiming && (
                                                                            <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 text-[9px] px-1 py-0 border-none font-bold ml-1">
                                                                                {relativeTiming}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>

                                                                {/* Category & Service */}
                                                                <TableCell className="text-xs py-3">
                                                                    <div className="space-y-1">
                                                                        <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 leading-tight", catConfig.badgeClass)}>
                                                                            {catConfig.label}
                                                                        </Badge>
                                                                        <div className="font-medium text-foreground text-xs">{session.service_type || "Performance"}</div>
                                                                    </div>
                                                                </TableCell>

                                                                {/* Specialist */}
                                                                <TableCell className="text-xs text-muted-foreground py-3">
                                                                    <div className="flex items-center gap-1">
                                                                        <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                                                        <span className="font-medium text-foreground">{consultantName}</span>
                                                                    </div>
                                                                </TableCell>

                                                                {/* Logged By */}
                                                                <TableCell className="text-xs text-muted-foreground py-3">
                                                                    <span className="text-[11px] font-medium">{loggedByName}</span>
                                                                </TableCell>

                                                                {/* Duration */}
                                                                <TableCell className="text-xs font-mono text-muted-foreground py-3">
                                                                    {durationMins > 0 ? `${durationMins}m` : "-"}
                                                                </TableCell>

                                                                {/* Status & Entitlement (Fixed UN-ENTITLED Badge: 100% Readable, No Clipping!) */}
                                                                <TableCell className="py-3 px-3 min-w-[130px]">
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        {isUpcoming ? (
                                                                            <Badge className="bg-sky-600 hover:bg-sky-700 text-white font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs whitespace-nowrap leading-none">
                                                                                <Calendar className="w-2.5 h-2.5" /> UPCOMING
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className={cn(
                                                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-none shadow-2xs whitespace-nowrap leading-none",
                                                                                session.status === 'Completed' ? "bg-emerald-600 text-white" :
                                                                                session.status === 'Cancelled' ? "bg-rose-500 text-white" :
                                                                                "bg-slate-600 text-white"
                                                                            )}>
                                                                                {session.status}
                                                                            </Badge>
                                                                        )}

                                                                        {session.session_category === 'sports_science' ? (
                                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-bold text-indigo-600 border-indigo-200 bg-indigo-50/60 dark:text-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/40 whitespace-nowrap leading-none">
                                                                                Exempt (SS)
                                                                            </Badge>
                                                                        ) : session.is_unentitled && isAdminOrFoe ? (
                                                                            <Badge className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border-none whitespace-nowrap leading-none tracking-wider shadow-2xs">
                                                                                UN-ENTITLED
                                                                            </Badge>
                                                                        ) : null}
                                                                    </div>
                                                                </TableCell>

                                                                {/* SOAP / Notes */}
                                                                <TableCell className="py-3 max-w-[200px]">
                                                                    {isUpcoming ? (
                                                                        <div className="flex items-center gap-1.5 text-xs text-sky-800 dark:text-sky-200 font-medium">
                                                                            <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                                                            <span className="truncate">
                                                                                {session.session_notes ? session.session_notes : "Upcoming Appointment"}
                                                                            </span>
                                                                        </div>
                                                                    ) : session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                                        <div className="space-y-0.5">
                                                                            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-xs font-bold">
                                                                                <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> Pain: {session.physio_session_details[0].pain_score}/10
                                                                            </span>
                                                                            {session.physio_session_details[0].clinical_notes && (
                                                                                <span className="text-[11px] text-muted-foreground truncate block max-w-[190px]">
                                                                                    {session.physio_session_details[0].clinical_notes}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : session.session_notes ? (
                                                                        <span className="text-xs text-muted-foreground truncate block" title={session.session_notes}>
                                                                            {session.session_notes}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-xs italic">No note logged</span>
                                                                    )}
                                                                </TableCell>

                                                                {/* Actions */}
                                                                <TableCell className="text-right py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        {isUpcoming ? (
                                                                            <>
                                                                                <Button 
                                                                                    variant="outline" 
                                                                                    size="sm" 
                                                                                    className="h-7 text-xs font-bold border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100/60 dark:hover:bg-sky-900/40 rounded-lg px-2"
                                                                                    onClick={() => handleSingleEditStatus(session)}
                                                                                >
                                                                                    <Edit3 className="w-3 h-3 mr-1" /> Edit
                                                                                </Button>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="icon" 
                                                                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                                                                                    onClick={() => handleSingleDelete(session.id)}
                                                                                    title="Delete Session"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </>
                                                                        ) : isCompleted ? (
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                size="sm" 
                                                                                className="h-7 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg px-2"
                                                                                onClick={() => { setSelectedSession(session); setSoapModalOpen(true); }}
                                                                            >
                                                                                {session.physio_session_details?.length > 0 ? "View Details" : "+ Add SOAP"}
                                                                            </Button>
                                                                        ) : (
                                                                            <Button 
                                                                                variant="ghost" 
                                                                                size="sm" 
                                                                                className="h-7 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg px-2"
                                                                                onClick={() => handleSingleEditStatus(session)}
                                                                            >
                                                                                Manage
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ==================== TAB 2: CLINICAL DIAGNOSES ==================== */}
                    <TabsContent value="diagnoses" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                        <Card className="border-border shadow-xs">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-red-500" /> Clinical Diagnoses & Injury History
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Active diagnoses, clinical evaluations, injury history, and resolution tracking.
                                    </CardDescription>
                                </div>
                                <LogInjuryModal
                                    clientId={client.id}
                                    organizationId={client.organization_id}
                                    onSuccess={fetchData}
                                />
                            </CardHeader>
                            <CardContent className="pt-5 space-y-6">
                                {injuries.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed text-xs">
                                        No clinical diagnoses or injury records for this client.
                                    </div>
                                ) : (
                                    <>
                                        {/* Active Diagnoses Section */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                                                    Active Diagnoses ({activeInjuries.length})
                                                </h3>
                                            </div>

                                            {activeInjuries.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic pl-4">No active diagnoses. Athlete is clear.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                    {activeInjuries.map(inj => (
                                                        <div key={inj.id} className="p-4 border border-red-200 dark:border-red-900/50 rounded-2xl bg-card shadow-xs flex flex-col justify-between gap-3">
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h4 className="font-bold text-foreground text-sm">{inj.diagnosis}</h4>
                                                                    <Badge variant="destructive" className="text-[10px] font-black uppercase">
                                                                        {inj.status}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1 font-medium">
                                                                    {inj.region} • {inj.injury_type}
                                                                </p>
                                                                {inj.clinical_notes && (
                                                                    <p className="text-xs text-muted-foreground mt-2 border-l-2 border-red-300 pl-2.5 bg-red-50/40 dark:bg-red-950/20 py-1 rounded-r-lg">
                                                                        {inj.clinical_notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                                                <span className="text-muted-foreground">
                                                                    Started: <strong>{format(new Date(inj.injury_date), "MMM d, yyyy")}</strong>
                                                                </span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-xs font-bold rounded-lg border-primary/20 text-primary hover:bg-primary/5"
                                                                    onClick={() => {
                                                                        setSelectedInjuryToResolve(inj);
                                                                        setResolveModalOpen(true);
                                                                    }}
                                                                >
                                                                    Mark Resolved
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Resolved Diagnoses History */}
                                        {resolvedInjuries.length > 0 && (
                                            <div className="space-y-3 pt-4 border-t border-border/40">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                        Resolved History ({resolvedInjuries.length})
                                                    </h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {resolvedInjuries.map(inj => (
                                                        <div key={inj.id} className="p-3.5 border border-border/50 rounded-2xl bg-muted/20 flex flex-col justify-between gap-2">
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h4 className="font-semibold text-foreground text-xs">{inj.diagnosis}</h4>
                                                                    <Badge variant="secondary" className="text-[9px] font-bold">
                                                                        Resolved
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                    {inj.region} • {inj.injury_type}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground">
                                                                <span>Start: {format(new Date(inj.injury_date), "dd MMM yyyy")}</span>
                                                                {inj.resolved_date && (
                                                                    <span className="text-emerald-600 font-bold">
                                                                        Resolved: {format(new Date(inj.resolved_date), "dd MMM yyyy")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ==================== TAB 3: ASSESSMENT REPORTS ==================== */}
                    <TabsContent value="assessments" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                        <AssessmentReportsList clientId={client.id} showDelete={false} />
                    </TabsContent>

                    {/* ==================== TAB 4: PERFORMANCE & AMS ==================== */}
                    <TabsContent value="performance" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {id && <PerformanceSnapshot clientId={id} />}
                            {id && <AMSTrainingLoadWidget clientId={id} />}
                        </div>

                        {id && (
                            <Card className="border-border shadow-xs">
                                <CardHeader className="bg-muted/20 pb-3 border-b border-border/40">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-primary" /> Athlete Performance & Benchmarking
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Comprehensive biomechanical and physical performance benchmarks.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <PerformanceAnalytics athleteId={id} />
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                </Tabs>

                {/* Modals & Dialogs */}
                {client && (
                    <>
                        <SOAPNoteModal
                            open={soapModalOpen}
                            onOpenChange={setSoapModalOpen}
                            session={selectedSession}
                            clientId={client.id}
                            onSuccess={fetchData}
                        />

                        <ResolveInjuryModal
                            open={resolveModalOpen}
                            onOpenChange={setResolveModalOpen}
                            injury={selectedInjuryToResolve}
                            onSuccess={fetchData}
                        />

                        <AdHocSessionModal
                            open={adHocModalOpen}
                            onOpenChange={setAdHocModalOpen}
                            preselectedClientId={client.id}
                            onSuccess={fetchData}
                        />

                        {/* Session Status & Timing Edit Modal */}
                        {editingSessionForStatus && (
                            <SportsScientistSessionStatusModal
                                open={isStatusModalOpen}
                                onOpenChange={(open) => {
                                    setIsStatusModalOpen(open);
                                    if (!open) setEditingSessionForStatus(null);
                                }}
                                session={editingSessionForStatus}
                                onSuccess={fetchData}
                            />
                        )}

                        {/* Bulk Edit Modal */}
                        <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-bold">Bulk Update Sessions</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Update status for {selectedSessionIds.length} selected session(s).
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold">Target Status</Label>
                                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                                            <SelectTrigger className="text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                                <SelectItem value="Missed">Missed</SelectItem>
                                                <SelectItem value="Planned">Planned</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold">Reason (Optional)</Label>
                                        <Textarea
                                            value={bulkReason}
                                            onChange={(e) => setBulkReason(e.target.value)}
                                            placeholder="Provide context or reason for this update..."
                                            className="text-xs min-h-[80px]"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" size="sm" onClick={() => setIsBulkEditDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleBulkEditSubmit} disabled={actionLoading}>
                                        {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                                        Update {selectedSessionIds.length} Sessions
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Cancel Entire Future Plan Confirmation Dialog */}
                        <Dialog open={isCancelPlanDialogOpen} onOpenChange={setIsCancelPlanDialogOpen}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-500" /> Cancel Future Plan
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        This will cancel all upcoming/future sessions scheduled for {formatClientName(client, { includeHonorific: true })}. Past and completed sessions will remain untouched.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold">Cancellation Reason</Label>
                                        <Textarea
                                            value={cancelPlanReason}
                                            onChange={(e) => setCancelPlanReason(e.target.value)}
                                            placeholder="e.g., Athlete travelling / Medical hiatus / Plan concluded"
                                            className="text-xs min-h-[80px]"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" size="sm" onClick={() => setIsCancelPlanDialogOpen(false)}>
                                        Keep Sessions
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={handleDeleteEntirePlan} 
                                        disabled={actionLoading}
                                    >
                                        {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                                        Confirm Cancellation
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Document Manager Modal */}
                        <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
                            <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileStack className="w-5 h-5 text-primary" />
                                        </div>
                                        Client Documents - {formatClientName(client, { includeHonorific: true })}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                    <DocumentManager clientId={client.id} isVIP={client.is_vip} />
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Enquiry Context Sheet */}
                        <Sheet open={isEnquiryOpen} onOpenChange={setIsEnquiryOpen}>
                            <SheetContent className="sm:max-w-xl p-0 border-none">
                                <EnquiryContextWindow clientId={client.id} isMobile={true} />
                            </SheetContent>
                        </Sheet>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
