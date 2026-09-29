import React, { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiFetch } from "@/utils/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatClientName } from "@/lib/utils";
import CaseSheetModal from "@/components/consultant/CaseSheetModal";
import {
    FolderKanban,
    PlusCircle,
    Search,
    Filter,
    Calendar,
    User,
    Activity,
    ChevronRight,
    CheckCircle2,
    Lock,
    Sparkles,
    FileText,
    Stethoscope,
    RefreshCw,
    X,
    FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientData {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    honorific?: string;
    uhid: string;
    gender?: string;
    age?: number;
    dob?: string;
    mobile_no?: string;
    sport?: string;
}

interface CaseItem {
    id: string;
    case_number: string;
    client_id: string;
    organization_id: string;
    status: "open" | "closed" | string;
    chief_complaint?: string;
    final_diagnosis?: string;
    provisional_diagnosis?: string;
    body_region?: string;
    injury_type?: string;
    severity?: string;
    side_of_body?: string;
    injury_nature?: string;
    etiology?: string;
    pain_score?: number;
    created_at: string;
    closed_at?: string;
    created_by_first?: string;
    created_by_last?: string;
    closed_by_first?: string;
    closed_by_last?: string;
    session_count?: number;
    client: ClientData | null;
}

const SEVERITY_COLORS: Record<string, string> = {
    Mild: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    Moderate: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    Severe: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
};

export default function CaseRepoPage() {
    const { profile } = useAuth();
    const [cases, setCases] = useState<CaseItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [regionFilter, setRegionFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [severityFilter, setSeverityFilter] = useState<string>("all");

    // Master-data options
    const [regionsList, setRegionsList] = useState<string[]>([]);
    const [typesList, setTypesList] = useState<string[]>([]);

    // Modals
    const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
    const [caseModalOpen, setCaseModalOpen] = useState(false);

    // Client Selector for New Case
    const [clientSelectOpen, setClientSelectOpen] = useState(false);
    const [clientsList, setClientsList] = useState<ClientData[]>([]);
    const [clientSearch, setClientSearch] = useState("");
    const [clientsLoading, setClientsLoading] = useState(false);
    const [newCaseClient, setNewCaseClient] = useState<ClientData | null>(null);

    const fetchCases = async () => {
        try {
            setLoading(true);
            const data = await apiFetch<CaseItem[]>("/clinical/cases");
            setCases(data || []);
        } catch (err) {
            console.error("Failed to fetch cases:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [regs, typs] = await Promise.all([
                apiFetch<string[]>("/clinical/master-data/regions").catch(() => []),
                apiFetch<string[]>("/clinical/master-data/types").catch(() => []),
            ]);
            setRegionsList(regs || []);
            setTypesList(typs || []);
        } catch (err) {
            console.error("Failed to fetch master data", err);
        }
    };

    const fetchClients = async () => {
        try {
            setClientsLoading(true);
            const data = await apiFetch<ClientData[]>("/clients");
            setClientsList(data || []);
        } catch (err) {
            console.error("Failed to fetch clients:", err);
        } finally {
            setClientsLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
        fetchMasterData();
    }, []);

    // Unique filter options derived from cases + master data
    const availableRegions = useMemo(() => {
        const set = new Set<string>(regionsList);
        cases.forEach((c) => {
            if (c.body_region) set.add(c.body_region);
        });
        return Array.from(set).filter(Boolean).sort();
    }, [regionsList, cases]);

    const availableTypes = useMemo(() => {
        const set = new Set<string>(typesList);
        cases.forEach((c) => {
            if (c.injury_type) set.add(c.injury_type);
        });
        return Array.from(set).filter(Boolean).sort();
    }, [typesList, cases]);

    // Filtered Cases
    const filteredCases = useMemo(() => {
        return cases.filter((c) => {
            // Search
            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const clientName = c.client ? formatClientName(c.client).toLowerCase() : "";
                const uhid = (c.client?.uhid || "").toLowerCase();
                const caseNum = (c.case_number || "").toLowerCase();
                const complaint = (c.chief_complaint || "").toLowerCase();
                const finalDx = (c.final_diagnosis || "").toLowerCase();
                const provDx = (c.provisional_diagnosis || "").toLowerCase();
                const region = (c.body_region || "").toLowerCase();
                const type = (c.injury_type || "").toLowerCase();

                const matches =
                    clientName.includes(q) ||
                    uhid.includes(q) ||
                    caseNum.includes(q) ||
                    complaint.includes(q) ||
                    finalDx.includes(q) ||
                    provDx.includes(q) ||
                    region.includes(q) ||
                    type.includes(q);

                if (!matches) return false;
            }

            // Status filter
            if (statusFilter !== "all" && c.status !== statusFilter) {
                return false;
            }

            // Region filter
            if (regionFilter !== "all" && c.body_region !== regionFilter) {
                return false;
            }

            // Type of injury filter
            if (typeFilter !== "all" && c.injury_type !== typeFilter) {
                return false;
            }

            // Severity filter
            if (severityFilter !== "all" && c.severity !== severityFilter) {
                return false;
            }

            return true;
        });
    }, [cases, search, statusFilter, regionFilter, typeFilter, severityFilter]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = cases.length;
        const open = cases.filter((c) => c.status === "open").length;
        const closed = cases.filter((c) => c.status === "closed").length;
        const now = new Date();
        const thisMonth = cases.filter((c) => {
            const d = new Date(c.created_at);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;

        return { total, open, closed, thisMonth };
    }, [cases]);

    const hasActiveFilters =
        search !== "" ||
        statusFilter !== "all" ||
        regionFilter !== "all" ||
        typeFilter !== "all" ||
        severityFilter !== "all";

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setRegionFilter("all");
        setTypeFilter("all");
        setSeverityFilter("all");
    };

    const handleOpenCase = (c: CaseItem) => {
        setSelectedCase(c);
        setNewCaseClient(c.client);
        setCaseModalOpen(true);
    };

    const handleStartNewCase = () => {
        fetchClients();
        setClientSearch("");
        setClientSelectOpen(true);
    };

    const handleSelectClientForNewCase = (client: ClientData) => {
        setClientSelectOpen(false);
        setSelectedCase(null);
        setNewCaseClient(client);
        setCaseModalOpen(true);
    };

    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return clientsList.slice(0, 20);
        const q = clientSearch.toLowerCase().trim();
        return clientsList
            .filter((c) => {
                const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
                const uhid = (c.uhid || "").toLowerCase();
                const phone = (c.mobile_no || "").toLowerCase();
                return name.includes(q) || uhid.includes(q) || phone.includes(q);
            })
            .slice(0, 30);
    }, [clientsList, clientSearch]);

    return (
        <DashboardLayout role="consultant">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                <FolderKanban className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
                                    Case Repository
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Comprehensive consultation episodes, clinical diagnoses, and care plans
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchCases}
                            disabled={loading}
                            className="h-9 px-3 gap-1.5 rounded-xl border-border/70 text-xs font-semibold hover:bg-muted/50"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                            Refresh
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleStartNewCase}
                            className="h-9 px-4 gap-2 rounded-xl text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <PlusCircle className="w-4 h-4" />
                            New Case Sheet
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div
                        onClick={() => setStatusFilter("all")}
                        className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer select-none bg-card shadow-xs hover:border-primary/50",
                            statusFilter === "all" ? "border-primary/60 bg-primary/5" : "border-border/60"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Total Cases
                            </span>
                            <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black font-display text-foreground">
                                {metrics.total}
                            </span>
                            <span className="text-[11px] text-muted-foreground">all-time</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setStatusFilter("open")}
                        className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer select-none bg-card shadow-xs hover:border-emerald-500/60",
                            statusFilter === "open" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border/60"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active Cases
                            </span>
                            <Activity className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black font-display text-emerald-600 dark:text-emerald-400">
                                {metrics.open}
                            </span>
                            <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">in care</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setStatusFilter("closed")}
                        className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer select-none bg-card shadow-xs hover:border-slate-500/60",
                            statusFilter === "closed" ? "border-slate-500 bg-slate-50/50 dark:bg-slate-900/40" : "border-border/60"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Closed Cases
                            </span>
                            <Lock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black font-display text-foreground">
                                {metrics.closed}
                            </span>
                            <span className="text-[11px] text-muted-foreground">resolved / closed</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                New This Month
                            </span>
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-black font-display text-teal-600 dark:text-teal-400">
                                {metrics.thisMonth}
                            </span>
                            <span className="text-[11px] text-muted-foreground">consultations</span>
                        </div>
                    </div>
                </div>

                {/* Filters Strip */}
                <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-xs space-y-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by client name, UHID, case number, diagnosis, region..."
                                className="pl-9.5 h-10 rounded-xl bg-background border-border text-xs"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Filters Row */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border min-w-[130px]">
                                    <SelectValue placeholder="Status: All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="open">Active (Open)</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Body Region Filter */}
                            <Select value={regionFilter} onValueChange={setRegionFilter}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border min-w-[140px]">
                                    <SelectValue placeholder="Region: All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Regions</SelectItem>
                                    {availableRegions.map((reg) => (
                                        <SelectItem key={reg} value={reg}>
                                            {reg}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Injury Type Filter */}
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border min-w-[140px]">
                                    <SelectValue placeholder="Type: All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Injury Types</SelectItem>
                                    {availableTypes.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Severity Filter */}
                            <Select value={severityFilter} onValueChange={setSeverityFilter}>
                                <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border min-w-[125px]">
                                    <SelectValue placeholder="Severity: All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Severities</SelectItem>
                                    <SelectItem value="Mild">Mild</SelectItem>
                                    <SelectItem value="Moderate">Moderate</SelectItem>
                                    <SelectItem value="Severe">Severe</SelectItem>
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl shrink-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Result count & status pill indicators */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>
                                Showing <strong className="text-foreground">{filteredCases.length}</strong> of{" "}
                                {cases.length} cases
                            </span>
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="text-[10px] font-bold py-0 h-5">
                                    Filtered
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cases Table */}
                <div className="bg-card border border-border/70 shadow-xs rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/40 border-b border-border/70">
                                <tr>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Case #
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Diagnosis &amp; Complaint
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Region &amp; Type
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Severity
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Sessions
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Date Opened
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-5 py-3.5 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {loading ? (
                                    Array(6)
                                        .fill(0)
                                        .map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-44" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-28" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                                                <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                                                <td className="px-5 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto rounded-xl" /></td>
                                            </tr>
                                        ))
                                ) : filteredCases.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-16 text-center text-muted-foreground">
                                            <FolderOpen className="w-10 h-10 opacity-25 mx-auto mb-3 text-muted-foreground" />
                                            <p className="text-sm font-semibold text-foreground">
                                                No cases found{hasActiveFilters ? " matching your filter criteria" : ""}.
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                                {hasActiveFilters
                                                    ? "Try resetting the search or filter options to see all consultation cases."
                                                    : "Click 'New Case Sheet' to open a consultation case for an athlete."}
                                            </p>
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={clearFilters}
                                                    className="mt-4 text-xs font-semibold rounded-xl"
                                                >
                                                    Reset Filters
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCases.map((c) => {
                                        const isOpen = c.status === "open";
                                        const sevColor = SEVERITY_COLORS[c.severity || "Moderate"] || SEVERITY_COLORS.Moderate;
                                        const clientName = c.client ? formatClientName(c.client) : "Unknown Client";

                                        return (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-muted/40 transition-colors cursor-pointer group"
                                                onClick={() => handleOpenCase(c)}
                                            >
                                                {/* Case # */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs border border-teal-200 dark:border-teal-800">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {c.case_number || "–"}
                                                    </span>
                                                </td>

                                                {/* Client */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 group-hover:bg-primary/20 transition-colors">
                                                            {c.client?.first_name?.[0] || "C"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-foreground truncate max-w-[160px]">
                                                                {clientName}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                                                <span>{c.client?.uhid || "–"}</span>
                                                                {c.client?.age ? <span>· {c.client.age}y</span> : null}
                                                                {c.client?.gender ? <span>· {c.client.gender}</span> : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Diagnosis & Complaint */}
                                                <td className="px-5 py-4 max-w-[240px]">
                                                    <div className="font-medium text-foreground text-xs truncate" title={c.final_diagnosis || c.provisional_diagnosis || c.chief_complaint}>
                                                        {c.final_diagnosis || c.provisional_diagnosis || c.chief_complaint || "–"}
                                                    </div>
                                                    {c.chief_complaint && (c.final_diagnosis || c.provisional_diagnosis) && (
                                                        <div className="text-[11px] text-muted-foreground truncate" title={c.chief_complaint}>
                                                            {c.chief_complaint}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Region & Type */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-foreground text-xs flex items-center gap-1">
                                                            {c.body_region || "–"}
                                                            {c.side_of_body && c.side_of_body !== 'N/A' && (
                                                                <span className="text-[10px] font-semibold text-primary px-1 rounded bg-primary/10">
                                                                    {c.side_of_body}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                                            <span>{c.injury_type || "General"}</span>
                                                            {c.injury_nature && (
                                                                <span className="text-[10px] text-muted-foreground/80 px-1 rounded bg-muted">
                                                                    {c.injury_nature}
                                                                </span>
                                                            )}
                                                            {c.etiology && (
                                                                <span className="text-[10px] text-muted-foreground/80 px-1 rounded bg-muted">
                                                                    {c.etiology}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Severity */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border", sevColor)}>
                                                        {c.severity || "Moderate"}
                                                    </span>
                                                </td>

                                                {/* Sessions */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
                                                        <Activity className="w-3 h-3 text-primary" />
                                                        {c.session_count || 0}
                                                    </span>
                                                </td>

                                                {/* Date Opened */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="text-xs text-foreground font-medium">
                                                        {c.created_at ? format(new Date(c.created_at), "dd MMM yyyy") : "–"}
                                                    </div>
                                                    {c.created_by_first && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {c.created_by_first} {c.created_by_last}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <Badge
                                                        className={cn(
                                                            "text-[10px] font-black uppercase px-2.5 py-0.5 tracking-wider gap-1",
                                                            isOpen
                                                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                                                : "bg-slate-600 text-white hover:bg-slate-700"
                                                        )}
                                                    >
                                                        {isOpen ? (
                                                            <>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                                OPEN
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock className="w-2.5 h-2.5" />
                                                                CLOSED
                                                            </>
                                                        )}
                                                    </Badge>
                                                </td>

                                                {/* Action */}
                                                <td className="px-5 py-4 whitespace-nowrap text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenCase(c);
                                                        }}
                                                        className="h-8 px-2.5 text-xs font-bold rounded-xl gap-1 text-primary hover:bg-primary/10"
                                                    >
                                                        Case Sheet <ChevronRight className="w-3.5 h-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Client Selector Dialog for Creating a New Case */}
            <Dialog open={clientSelectOpen} onOpenChange={setClientSelectOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl z-[70]">
                    <DialogHeader className="p-5 pb-3 border-b border-border/70">
                        <DialogTitle className="text-lg font-bold font-display flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-teal-600" />
                            Select Client for New Case Sheet
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Choose an athlete or client to start a comprehensive consultation case sheet
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                placeholder="Search client by name, UHID, or mobile..."
                                className="pl-9 h-10 text-xs rounded-xl"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                            {clientsLoading ? (
                                Array(4)
                                    .fill(0)
                                    .map((_, i) => (
                                        <div key={i} className="p-3 rounded-xl border border-border/60">
                                            <Skeleton className="h-4 w-40 mb-1" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    ))
                            ) : filteredClients.length === 0 ? (
                                <div className="text-center py-8 text-xs text-muted-foreground">
                                    No clients found matching "{clientSearch}".
                                </div>
                            ) : (
                                filteredClients.map((client) => {
                                    const fullName = formatClientName(client);
                                    return (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => handleSelectClientForNewCase(client)}
                                            className="w-full text-left p-3 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/30 border border-transparent hover:border-teal-300 dark:hover:border-teal-800 transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                                    {client.first_name?.[0] || "C"}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                                        {fullName}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        {client.uhid} {client.sport ? `· ${client.sport}` : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-teal-600 transition-colors" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Full Case Sheet Modal */}
            {newCaseClient && (
                <CaseSheetModal
                    open={caseModalOpen}
                    onOpenChange={(isOpen) => {
                        setCaseModalOpen(isOpen);
                        if (!isOpen) {
                            setSelectedCase(null);
                            setNewCaseClient(null);
                        }
                    }}
                    clientId={newCaseClient.id}
                    client={newCaseClient}
                    caseId={selectedCase?.id || null}
                    onSuccess={() => {
                        fetchCases();
                    }}
                />
            )}
        </DashboardLayout>
    );
}
