import { useState, useEffect, useMemo } from "react";
import { 
    ShieldCheck, 
    Search, 
    RefreshCw, 
    Calendar, 
    UserCheck, 
    Lock, 
    Unlock, 
    FileText, 
    SlidersHorizontal, 
    Activity, 
    ArrowRight, 
    Clock, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Copy, 
    Check,
    User,
    Layers
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

export interface AuditChangeItem {
    field: string;
    label: string;
    old_val?: any;
    new_val?: any;
    display?: string;
    added?: string[];
    removed?: string[];
    added_labels?: string[];
    removed_labels?: string[];
}

export interface AuditLogItem {
    id: string;
    organization_id?: string;
    entity_type: string;
    entity_id: string;
    action: string;
    performed_by?: string;
    details: {
        target_user_id?: string;
        target_user_name?: string;
        target_user_email?: string;
        target_role?: string;
        actor_id?: string;
        actor_name?: string;
        actor_email?: string;
        actor_role?: string;
        summary?: string;
        changes?: AuditChangeItem[];
        reason?: string;
        role?: string;
        profession?: string;
        ams_role?: string;
        uhid?: string;
        [key: string]: any;
    };
    created_at: string;
    actor_name: string;
    actor_email: string;
    actor_role: string;
    actor_avatar_url?: string;
    target_name: string;
    target_email: string;
    target_role: string;
    target_profession?: string;
    target_ams_role?: string;
    target_avatar_url?: string;
}

export interface AuditStats {
    total_events: number | string;
    role_events: number | string;
    console_events: number | string;
    feature_events: number | string;
    status_events: number | string;
}

export default function AuditLogsViewer() {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<"all" | "role" | "console" | "features" | "status">("all");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
    const [stats, setStats] = useState<AuditStats>({
        total_events: 0,
        role_events: 0,
        console_events: 0,
        feature_events: 0,
        status_events: 0
    });
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
    const [copiedJson, setCopiedJson] = useState(false);

    useEffect(() => {
        fetchAuditLogs(page, activeCategory, searchQuery);
    }, [page, activeCategory]);

    const fetchAuditLogs = async (pageNum = 1, cat = activeCategory, search = searchQuery) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set("page", pageNum.toString());
            params.set("limit", "25");
            if (cat !== "all") params.set("category", cat);
            if (search.trim()) params.set("search", search.trim());

            const res = await apiFetch<{
                success: boolean;
                data: AuditLogItem[];
                pagination: { total: number; page: number; limit: number; totalPages: number };
                stats: AuditStats;
            }>(`/hr/audit-logs?${params.toString()}`);

            if (res.success) {
                setLogs(res.data || []);
                setPagination(res.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
                if (res.stats) setStats(res.stats);
            }
        } catch (err: any) {
            toast({
                title: "Failed to load audit logs",
                description: err.message || "An error occurred while fetching security logs.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchAuditLogs(1, activeCategory, searchQuery);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAuditLogs(page, activeCategory, searchQuery);
    };

    const handleExportCSV = () => {
        if (logs.length === 0) {
            toast({ title: "No logs to export", description: "Audit trail is empty for current filter." });
            return;
        }

        const headers = ["ID", "Timestamp", "Action", "Actor Name", "Actor Email", "Actor Role", "Target Name", "Target Email", "Summary", "Details JSON"];
        const rows = logs.map(l => [
            `"${l.id}"`,
            `"${format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss")}"`,
            `"${l.action}"`,
            `"${(l.actor_name || "").replace(/"/g, '""')}"`,
            `"${(l.actor_email || "").replace(/"/g, '""')}"`,
            `"${(l.actor_role || "").replace(/"/g, '""')}"`,
            `"${(l.target_name || "").replace(/"/g, '""')}"`,
            `"${(l.target_email || "").replace(/"/g, '""')}"`,
            `"${(l.details?.summary || l.details?.reason || "").replace(/"/g, '""')}"`,
            `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit-logs-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Audit Log Exported", description: `Exported ${logs.length} entries to CSV.` });
    };

    const formatActionBadge = (action: string) => {
        switch (action) {
            case "role_changed":
                return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200">Role Modified</Badge>;
            case "console_access_changed":
                return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200">Console Access</Badge>;
            case "feature_permissions_changed":
                return <Badge className="bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200">Privilege Toggled</Badge>;
            case "approved":
            case "user_approved":
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200">Account Approved</Badge>;
            case "access_revoked":
            case "access_removed":
                return <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200">Access Revoked</Badge>;
            case "access_restored":
                return <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200">Access Restored</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-800 border-slate-200">{action.replace(/_/g, " ")}</Badge>;
        }
    };

    const handleCopyJson = () => {
        if (!selectedLog) return;
        navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
        toast({ title: "Copied to clipboard", description: "Audit record JSON copied." });
    };

    return (
        <div className="space-y-6">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border/60 bg-gradient-to-br from-white to-slate-50/50 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Audit Events</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.total_events || 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-gradient-to-br from-white to-purple-50/30 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Modifications</p>
                            <p className="text-2xl font-black text-purple-700 tracking-tight">{stats.role_events || 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                            <UserCheck className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Console Access Changes</p>
                            <p className="text-2xl font-black text-indigo-700 tracking-tight">{stats.console_events || 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <Layers className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-gradient-to-br from-white to-sky-50/30 shadow-sm rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Privilege Toggles</p>
                            <p className="text-2xl font-black text-sky-700 tracking-tight">{stats.feature_events || 0}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                            <SlidersHorizontal className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls, Filters & Search */}
            <Card className="border-border/50 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Search Input */}
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search by staff member, admin, or change..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-20 rounded-xl border-slate-200 text-xs h-10 focus-visible:ring-primary"
                            />
                            <Button 
                                type="submit" 
                                size="sm" 
                                variant="ghost" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg"
                            >
                                Search
                            </Button>
                        </form>

                        {/* Top action buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={loading || refreshing}
                                className="h-9 px-3 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 gap-1.5"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", (loading || refreshing) && "animate-spin text-primary")} />
                                <span>Refresh</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                                disabled={logs.length === 0}
                                className="h-9 px-3 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                <span>Export CSV</span>
                            </Button>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Filter:</span>
                        {[
                            { id: "all", label: "All Audit Events", icon: Activity },
                            { id: "role", label: "Role Changes", icon: UserCheck },
                            { id: "console", label: "Console Access", icon: Layers },
                            { id: "features", label: "Module Privileges", icon: SlidersHorizontal },
                            { id: "status", label: "Status & Revocations", icon: Lock },
                        ].map((tab) => {
                            const IconComponent = tab.icon;
                            const isActive = activeCategory === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveCategory(tab.id as any);
                                        setPage(1);
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                                        isActive
                                            ? "bg-slate-900 text-white font-semibold shadow-sm"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                                    )}
                                >
                                    <IconComponent className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Log Feed List */}
            {loading ? (
                <div className="py-20 text-center space-y-3 bg-white border border-border/50 rounded-3xl p-8 shadow-sm">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto opacity-70" />
                    <p className="text-sm font-semibold text-slate-600">Loading permission audit trail...</p>
                    <p className="text-xs text-slate-400">Fetching immutable change logs from secure database</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-white border border-border/50 rounded-3xl p-8 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No Audit Logs Found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                        No role, module access, or permission changes match your current filters. Any changes made in the Console Access matrix will be recorded here in real-time.
                    </p>
                    {searchQuery && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { setSearchQuery(""); fetchAuditLogs(1, activeCategory, ""); }}
                            className="mt-2 text-xs"
                        >
                            Clear Search
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => {
                        const createdDate = new Date(log.created_at);
                        const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });
                        const fullDateTime = format(createdDate, "MMM d, yyyy 'at' h:mm a");

                        const changes = log.details?.changes || [];
                        const summary = log.details?.summary || log.details?.reason || "Permissions updated";

                        return (
                            <Card 
                                key={log.id} 
                                className="border-border/60 hover:border-slate-300 transition-all rounded-2xl bg-white shadow-sm overflow-hidden"
                            >
                                <CardContent className="p-4 sm:p-5 space-y-3.5">
                                    {/* Top Bar: Action badge & Timestamp */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            {formatActionBadge(log.action)}
                                            <span className="text-[11px] font-mono text-slate-400">
                                                ID: {log.id.slice(0, 8)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium" title={createdDate.toISOString()}>
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{timeAgo}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-400 text-[11px]">{fullDateTime}</span>
                                        </div>
                                    </div>

                                    {/* Who changed what for whom */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                        {/* Actor (Who made change) */}
                                        <div className="md:col-span-5 flex items-center gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                            <Avatar className="h-9 w-9 border border-slate-200">
                                                {log.actor_avatar_url && <AvatarImage src={log.actor_avatar_url} />}
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                    {(log.actor_name || "A").slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Changed By</span>
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase font-mono bg-white">
                                                        {log.actor_role || "Admin"}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 truncate">
                                                    {log.actor_name || "System Administrator"}
                                                </p>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {log.actor_email}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Middle Arrow / Indicator */}
                                        <div className="hidden md:flex md:col-span-2 items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        {/* Target Staff (Affected User) */}
                                        <div className="md:col-span-5 flex items-center gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                            <Avatar className="h-9 w-9 border border-slate-200">
                                                {log.target_avatar_url && <AvatarImage src={log.target_avatar_url} />}
                                                <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                                                    {(log.target_name || "U").slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Staff</span>
                                                    {(log.target_role || log.target_profession) && (
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase font-mono bg-indigo-50/50 text-indigo-700 border-indigo-200">
                                                            {log.target_profession || log.target_role}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 truncate">
                                                    {log.target_name || "Staff Member"}
                                                </p>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {log.target_email || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Change Details / Diff View */}
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-slate-800">
                                                {summary}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedLog(log)}
                                                className="h-7 px-2 text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Inspect Record</span>
                                            </Button>
                                        </div>

                                        {/* Granular Diff Pills */}
                                        {changes.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                                                {changes.map((change, cIdx) => {
                                                    // Console Access Granular Diff
                                                    if (change.field === "allowed_consoles") {
                                                        const addedLabels = change.added_labels || change.added || [];
                                                        const removedLabels = change.removed_labels || change.removed || [];
                                                        return (
                                                            <div key={cIdx} className="flex flex-wrap gap-1.5 items-center">
                                                                {addedLabels.map((addName, aIdx) => (
                                                                    <Badge key={`add-${aIdx}`} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        <span>+ Granted {addName}</span>
                                                                    </Badge>
                                                                ))}
                                                                {removedLabels.map((remName, rIdx) => (
                                                                    <Badge key={`rem-${rIdx}`} className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium flex items-center gap-1">
                                                                        <XCircle className="w-3 h-3 text-rose-600" />
                                                                        <span>- Revoked {remName}</span>
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        );
                                                    }

                                                    // Role Change Diff
                                                    if (change.field === "role" || change.field === "profession") {
                                                        return (
                                                            <div key={cIdx} className="flex items-center gap-1.5 bg-purple-50/70 border border-purple-200/70 px-2 py-0.5 rounded-lg text-[11px] text-purple-900 font-medium">
                                                                <span className="font-semibold text-purple-700">{change.label}:</span>
                                                                <span className="line-through text-purple-400">{change.old_val || "None"}</span>
                                                                <ArrowRight className="w-3 h-3 text-purple-600" />
                                                                <span className="font-bold text-purple-800">{change.new_val}</span>
                                                            </div>
                                                        );
                                                    }

                                                    // Boolean Feature Privileges
                                                    if (typeof change.new_val === "boolean") {
                                                        return (
                                                            <Badge 
                                                                key={cIdx}
                                                                className={cn(
                                                                    "text-[10px] font-medium flex items-center gap-1 border",
                                                                    change.new_val 
                                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                                )}
                                                            >
                                                                {change.new_val ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                                                <span>{change.label}: {change.new_val ? "Enabled" : "Disabled"}</span>
                                                            </Badge>
                                                        );
                                                    }

                                                    // Fallback Diff Chip
                                                    return (
                                                        <Badge key={cIdx} variant="outline" className="text-[10px] font-normal bg-white">
                                                            {change.display || `${change.label}: ${change.new_val}`}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white border border-border/60 p-4 rounded-2xl shadow-sm">
                    <span className="text-xs text-slate-500 font-medium">
                        Showing page <strong className="text-slate-800">{pagination.page}</strong> of{" "}
                        <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.total} total log entries)
                    </span>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            disabled={page <= 1 || loading}
                            className="h-8 px-3 rounded-xl text-xs gap-1"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Previous</span>
                        </Button>

                        <div className="text-xs font-bold text-slate-700 px-2">
                            {page} / {pagination.totalPages}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={page >= pagination.totalPages || loading}
                            className="h-8 px-3 rounded-xl text-xs gap-1"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Detail Record Modal */}
            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                Audit Log Record
                            </DialogTitle>
                            {selectedLog && formatActionBadge(selectedLog.action)}
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Immutable cryptographic audit record stored in sports health database.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Timestamp</span>
                                    <p className="font-semibold text-slate-800">{format(new Date(selectedLog.created_at), "yyyy-MM-dd HH:mm:ss (z)")}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Action Type</span>
                                    <p className="font-semibold text-slate-800 font-mono">{selectedLog.action}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Performed By (Actor)</span>
                                    <p className="font-semibold text-slate-800">{selectedLog.actor_name} ({selectedLog.actor_email})</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Target User</span>
                                    <p className="font-semibold text-slate-800">{selectedLog.target_name} ({selectedLog.target_email || "N/A"})</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Raw Technical Audit Payload</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopyJson}
                                        className="h-7 px-2 text-xs gap-1 text-slate-500 hover:text-slate-900"
                                    >
                                        {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                                    </Button>
                                </div>

                                <pre className="bg-slate-950 text-slate-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[300px]">
                                    {JSON.stringify(selectedLog, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
