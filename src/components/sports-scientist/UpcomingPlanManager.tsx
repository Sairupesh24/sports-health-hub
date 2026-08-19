import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
    Calendar, 
    Trash2, 
    Edit3, 
    CheckSquare, 
    AlertTriangle, 
    Loader2, 
    RefreshCw,
    XCircle,
    User,
    Layers,
    Clock,
    Lock,
    CheckCircle2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";

interface Props {
    clientId: string;
    clientName?: string;
}

export function UpcomingPlanManager({ clientId, clientName }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingSession, setEditingSession] = useState<any>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    
    // Dialog states
    const [isDeletePlanDialogOpen, setIsDeletePlanDialogOpen] = useState(false);
    const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");

    // Bulk edit fields
    const [bulkStatus, setBulkStatus] = useState<string>("Cancelled");
    const [bulkReason, setBulkReason] = useState<string>("");

    const { data: rawUpcomingSessions = [], isLoading, refetch } = useQuery({
        queryKey: ["client-upcoming-sessions", clientId],
        queryFn: async () => {
            if (!clientId) return [];
            return await apiFetch<any[]>(`/api/appointments/client/${clientId}/upcoming`);
        },
        enabled: !!clientId,
    });

    // Filter out cancelled, missed, rescheduled, and deleted sessions so deleted plans disappear completely from view
    const upcomingSessions = rawUpcomingSessions.filter((s: any) => {
        const st = (s.status || "").toLowerCase();
        return !['cancelled', 'missed', 'rescheduled', 'deleted'].includes(st);
    });

    const editableSessions = upcomingSessions.filter((s: any) => s.status?.toLowerCase() !== "completed");
    const isAllSelected = editableSessions.length > 0 && editableSessions.every((s: any) => selectedIds.includes(s.id));

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(editableSessions.map((s: any) => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleSingleEdit = (session: any) => {
        setEditingSession(session);
        setIsStatusModalOpen(true);
    };

    const handleSingleDelete = async (sessionId: string) => {
        if (!window.confirm("Are you sure you want to delete this session record? Full audit logs of this deletion will be preserved for internal use.")) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/appointments/${sessionId}`, {
                method: "DELETE",
                body: JSON.stringify({
                    reason: "Single session record deleted by user"
                })
            });
            toast({ title: "Session Record Deleted ✓", description: "Session record deleted and logged in audit trails." });
            queryClient.invalidateQueries({ queryKey: ["client-upcoming-sessions", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client-sessions", clientId] });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete session", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEntirePlan = async () => {
        setActionLoading(true);
        try {
            const res = await apiFetch<any>(`/api/appointments/client/${clientId}/cancel-future-plan`, {
                method: "POST",
                body: JSON.stringify({ reason: deleteReason || "Entire upcoming plan cancelled by specialist" })
            });
            toast({
                title: "Upcoming Training Plan Deleted",
                description: `Successfully cancelled all ${res?.cancelled_count || 0} future sessions.`
            });
            setIsDeletePlanDialogOpen(false);
            setDeleteReason("");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ["client-upcoming-sessions", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client-sessions", clientId] });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete plan", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected session record(s)? Internal audit logs of this deletion will be preserved.`)) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/appointments/bulk-delete`, {
                method: "POST",
                body: JSON.stringify({
                    ids: selectedIds,
                    reason: `Bulk deleted ${selectedIds.length} selected sessions by user`
                })
            });
            toast({
                title: "Selected Sessions Deleted ✓",
                description: `Successfully deleted ${selectedIds.length} session records and updated audit log.`
            });
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ["client-upcoming-sessions", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client-sessions", clientId] });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to delete selected sessions", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkEditSubmit = async () => {
        if (selectedIds.length === 0) return;
        setActionLoading(true);
        try {
            await apiFetch(`/api/appointments/bulk-edit`, {
                method: "POST",
                body: JSON.stringify({
                    ids: selectedIds,
                    status: bulkStatus,
                    cancellation_reason: bulkReason || null
                })
            });
            toast({
                title: "Selected Sessions Updated",
                description: `Updated ${selectedIds.length} sessions to ${bulkStatus}.`
            });
            setIsBulkEditDialogOpen(false);
            setSelectedIds([]);
            setBulkReason("");
            queryClient.invalidateQueries({ queryKey: ["client-upcoming-sessions", clientId] });
            queryClient.invalidateQueries({ queryKey: ["client-sessions", clientId] });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to update sessions", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Calendar className="w-5 h-5 text-primary" />
                                Upcoming Events & Training Plan
                            </CardTitle>
                            <CardDescription className="mt-1 text-xs">
                                View, edit individual sessions, modify selected events together, or delete the entire future plan for {clientName || "athlete"}.
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => refetch()} 
                                disabled={isLoading}
                                className="h-9 gap-1.5 rounded-xl border-border"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                                Refresh
                            </Button>

                            {upcomingSessions.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={actionLoading}
                                    onClick={() => {
                                        if (selectedIds.length > 0) {
                                            handleBulkDelete();
                                        } else {
                                            setIsDeletePlanDialogOpen(true);
                                        }
                                    }}
                                    className="h-9 gap-1.5 rounded-xl font-bold shadow-xs"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {selectedIds.length > 0 ? `Delete Selected (${selectedIds.length})` : "Delete Entire Plan"}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-xs font-medium">Loading upcoming plan sessions...</p>
                        </div>
                    ) : upcomingSessions.length === 0 ? (
                        <div className="text-center py-12 space-y-3 bg-muted/20 rounded-2xl border border-dashed border-border">
                            <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No upcoming events or sessions scheduled for this athlete.</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card List View (Visible on Mobile Viewports) */}
                            <div className="block md:hidden space-y-3.5">
                                {/* Select All Control Bar on Mobile */}
                                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50 text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox 
                                            checked={isAllSelected} 
                                            onCheckedChange={(c) => handleSelectAll(!!c)} 
                                        />
                                        <span>Select All Sessions ({upcomingSessions.length})</span>
                                    </label>
                                    {selectedIds.length > 0 && (
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-black">
                                            {selectedIds.length} Selected
                                        </Badge>
                                    )}
                                </div>

                                {upcomingSessions.map((session: any) => {
                                    const isCompleted = session.status?.toLowerCase() === "completed";
                                    const isSelected = selectedIds.includes(session.id);
                                    const startDateObj = parseISO(session.scheduled_start);
                                    const scientistName = [session.scientist_first_name, session.scientist_last_name].filter(Boolean).join(" ") || "Unassigned";

                                    return (
                                        <div 
                                            key={session.id} 
                                            className={cn(
                                                "p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs transition-all space-y-3",
                                                isCompleted ? "opacity-90 border-slate-200 dark:border-slate-800" :
                                                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60"
                                            )}
                                        >
                                            {/* Header: Checkbox, Status & Mode */}
                                            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                                                {isCompleted ? (
                                                    <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                                                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Locked</span>
                                                    </div>
                                                ) : (
                                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                                                        <Checkbox 
                                                            checked={isSelected} 
                                                            onCheckedChange={(c) => handleSelectOne(session.id, !!c)} 
                                                        />
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select</span>
                                                    </label>
                                                )}

                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-slate-200">
                                                        {session.session_mode || "Individual"}
                                                    </Badge>
                                                    <Badge className={cn(
                                                        "text-[10px] font-black uppercase px-2 py-0.5 border-none",
                                                        session.status === "Completed" ? "bg-emerald-500 text-white" :
                                                        session.status === "Cancelled" ? "bg-rose-500 text-white" :
                                                        session.status === "In Progress" || session.status === "IN_PROGRESS" ? "bg-blue-600 text-white" :
                                                        "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                                    )}>
                                                        {session.status}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Date & Time Header */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                                                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                                                    <span>{format(startDateObj, "EEE, MMM d, yyyy")}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground pl-6 font-mono">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>
                                                        {format(startDateObj, "h:mm a")} - {session.scheduled_end ? format(parseISO(session.scheduled_end), "h:mm a") : ""}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Service & Specialist Metadata */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Session / Service</span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {session.service_type || session.session_type_name || "Sports Science"}
                                                    </span>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Assigned Specialist</span>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{scientistName}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons Row */}
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                                {isCompleted ? (
                                                    <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        <span>Completed Session (Locked)</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSingleEdit(session)}
                                                            className="h-9 px-3.5 text-xs font-bold rounded-xl border-border text-slate-700 dark:text-slate-200 flex-1 justify-center gap-1.5"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" /> Edit Session
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSingleDelete(session.id)}
                                                            className="h-9 px-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 flex-1 justify-center gap-1.5"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop Table View (Visible on Medium & Desktop Screens) */}
                            <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="w-12 text-center">
                                                <Checkbox 
                                                    checked={isAllSelected} 
                                                    onCheckedChange={(c) => handleSelectAll(!!c)} 
                                                />
                                            </TableHead>
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Session Type / Service</TableHead>
                                            <TableHead>Specialist / Scientist</TableHead>
                                            <TableHead>Mode</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {upcomingSessions.map((session: any) => {
                                            const isCompleted = session.status?.toLowerCase() === "completed";
                                            const isSelected = selectedIds.includes(session.id);
                                            const startDateObj = parseISO(session.scheduled_start);
                                            const scientistName = [session.scientist_first_name, session.scientist_last_name].filter(Boolean).join(" ") || "Unassigned";

                                            return (
                                                <TableRow key={session.id} className={isCompleted ? "opacity-75 bg-muted/10" : isSelected ? "bg-primary/5" : "hover:bg-muted/20"}>
                                                    <TableCell className="text-center">
                                                        {isCompleted ? (
                                                            <Lock className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                                                        ) : (
                                                            <Checkbox 
                                                                checked={isSelected} 
                                                                onCheckedChange={(c) => handleSelectOne(session.id, !!c)} 
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-sm">
                                                        <div className="flex flex-col">
                                                            <span>{format(startDateObj, "EEE, MMM d, yyyy")}</span>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {format(startDateObj, "h:mm a")} - {session.scheduled_end ? format(parseISO(session.scheduled_end), "h:mm a") : ""}
                                                            </span>
                                                            {session.actual_start && (
                                                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                                                                    Actual: {format(parseISO(session.actual_start), "h:mm a")}{session.actual_end ? ` - ${format(parseISO(session.actual_end), "h:mm a")}` : ""}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300">
                                                            {session.service_type || session.session_type_name || "Sports Science"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                                            {scientistName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {session.session_mode || "Individual"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={
                                                            session.status === "Completed" ? "bg-emerald-500 text-white" :
                                                            session.status === "Cancelled" ? "bg-rose-500 text-white" :
                                                            session.status === "In Progress" || session.status === "IN_PROGRESS" ? "bg-blue-600 text-white" :
                                                            "bg-amber-500/10 text-amber-700 border-amber-200"
                                                        }>
                                                            {session.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isCompleted ? (
                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1.5 italic">
                                                                <Lock className="w-3.5 h-3.5 text-emerald-500" /> Completed
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleSingleEdit(session)}
                                                                    className="h-8 px-2.5 text-xs font-semibold rounded-lg hover:bg-muted"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleSingleDelete(session.id)}
                                                                    className="h-8 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                                                </Button>
                                                            </div>
                                                        )}
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

            {/* Single Session Status Edit Modal */}
            {editingSession && (
                <SportsScientistSessionStatusModal
                    open={isStatusModalOpen}
                    onOpenChange={setIsStatusModalOpen}
                    session={editingSession}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["client-upcoming-sessions", clientId] });
                        queryClient.invalidateQueries({ queryKey: ["client-sessions", clientId] });
                    }}
                />
            )}

            {/* Delete Entire Training Plan Dialog */}
            <Dialog open={isDeletePlanDialogOpen} onOpenChange={setIsDeletePlanDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="w-5 h-5" />
                            Delete Entire Upcoming Plan?
                        </DialogTitle>
                        <DialogDescription className="text-xs pt-1">
                            This action will cancel all upcoming scheduled sessions for <strong>{clientName || "this athlete"}</strong> ({upcomingSessions.length} sessions). Past sessions will remain unaffected.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="delete-reason" className="text-xs font-bold uppercase tracking-wider text-slate-600">Cancellation Reason (Optional)</Label>
                            <Textarea
                                id="delete-reason"
                                placeholder="E.g., Athlete injured, training plan reset, or client requested plan deletion..."
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDeletePlanDialogOpen(false)} disabled={actionLoading}>
                            Keep Plan
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteEntirePlan} disabled={actionLoading} className="font-bold">
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                            Delete All Future Sessions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Edit Selected Dialog */}
            <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Layers className="w-5 h-5 text-primary" />
                            Edit {selectedIds.length} Selected Sessions Together
                        </DialogTitle>
                        <DialogDescription className="text-xs pt-1">
                            Apply bulk status changes or cancellation reasons to the selected sessions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Target Status</Label>
                            <Select value={bulkStatus} onValueChange={setBulkStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select new status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    <SelectItem value="Planned">Planned</SelectItem>
                                    <SelectItem value="Missed">Missed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {bulkStatus === "Cancelled" && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Cancellation Reason</Label>
                                <Input
                                    placeholder="Reason for bulk cancellation..."
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value)}
                                    className="text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)} disabled={actionLoading}>
                            Cancel
                        </Button>
                        <Button variant="default" onClick={handleBulkEditSubmit} disabled={actionLoading} className="font-bold bg-primary">
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Apply to {selectedIds.length} Sessions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
