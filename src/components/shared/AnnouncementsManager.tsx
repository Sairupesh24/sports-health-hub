import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { 
    Loader2, 
    Megaphone, 
    Send, 
    History, 
    Plus, 
    Mic, 
    ArrowLeft, 
    Bell, 
    User, 
    Clock,
    X,
    CheckCircle2,
    Sparkles,
    ExternalLink
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { plannerStore, getTodayString } from "@/services/plannerStore";
import { DailyTask } from "@/types/planner";

interface AnnouncementsManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AnnouncementsManager({ open, onOpenChange }: AnnouncementsManagerProps) {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [mode, setMode] = useState<"list" | "create">("list");
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState("normal");
    const [target, setTarget] = useState("all");

    // Load active today's tasks from OrbitFlow Planner Store
    const [todayTasks, setTodayTasks] = useState<DailyTask[]>(() => plannerStore.getTasks(getTodayString()));

    useEffect(() => {
        const refreshTasks = () => setTodayTasks(plannerStore.getTasks(getTodayString()));
        refreshTasks();
        const unsubscribe = plannerStore.subscribe(refreshTasks);
        return unsubscribe;
    }, [open]);

    const activeTaskReminders = React.useMemo(() => {
        return todayTasks.filter(
            (t) => t.status !== "completed" && t.status !== "approved" && (t.start_time || t.deadline_time || t.time_mode === "set_time")
        );
    }, [todayTasks]);

    const { data: notifications = [], isLoading: listLoading } = useQuery({
        queryKey: ["staff-notifications-history", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const data = await apiFetch<any[]>('/admin/notifications');
            return data;
        },
        enabled: open && mode === "list" && !!profile?.organization_id
    });

    const sortedNotifications = React.useMemo(() => {
        return [...notifications].sort((a, b) => {
            if (a.is_vip && !b.is_vip) return -1;
            if (!a.is_vip && b.is_vip) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [notifications]);

    const [actioningId, setActioningId] = useState<string | null>(null);

    const handleApprovalAction = async (notificationId: string, payload: any, approve: boolean) => {
        setActioningId(notificationId);
        try {
            if (approve) {
                // Call approval endpoint
                await apiFetch(`/hr/users/${payload.userId}/approve`, {
                    method: 'POST',
                    body: {
                        role: payload.role || 'client',
                        profession: payload.role === 'sports_physician' ? 'Sports Physician' 
                                  : payload.role === 'physiotherapist' ? 'Physiotherapist'
                                  : payload.role === 'nutritionist' ? 'Nutritionist'
                                  : payload.role === 'sports_scientist' ? 'Sports Scientist'
                                  : null,
                        ams_role: payload.role === 'sports_scientist' ? 'coach' 
                                : payload.role === 'athlete' ? 'athlete'
                                : null,
                        uhid: null // auto generated on backend!
                    }
                });
                toast({ title: "User Approved Successfully" });
            } else {
                // Call delete endpoint permanently
                await apiFetch(`/hr/users/${payload.userId}`, {
                    method: 'DELETE'
                });
                toast({ title: "User Signup Rejected & Deleted Permanently" });
            }

            // Update status on notification
            await apiFetch(`/admin/notifications/${notificationId}/status`, {
                method: 'PATCH',
                body: { action_status: approve ? 'approved' : 'rejected' }
            });

            queryClient.invalidateQueries({ queryKey: ["staff-notifications-history"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        } catch (err: any) {
            console.error(err);
            toast({ title: "Action Failed", description: err.message, variant: "destructive" });
        } finally {
            setActioningId(null);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !profile?.organization_id) return;

        setLoading(true);
        try {
            await apiFetch('/admin/notifications', {
                method: 'POST',
                body: {
                    title,
                    content,
                    priority,
                    is_broadcast: target === "all",
                    target_role: target !== "all" ? target : null,
                    type: 'announcement'
                }
            });

            toast({ title: "Announcement Published!" });
            setTitle("");
            setContent("");
            setMode("list");
            queryClient.invalidateQueries({ queryKey: ["staff-notifications-history"] });
        } catch (error: any) {
            toast({ title: "Failed to send", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] h-[85vh] p-0 overflow-hidden border-none rounded-[32px] sm:rounded-[40px] bg-slate-50 shadow-2xl flex flex-col">
                {/* Custom Modal Header */}
                <div className="p-5 sm:p-8 pb-4 sm:pb-6 border-b border-slate-100 bg-white relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md",
                                mode === 'list' ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                            )}>
                                {mode === 'list' ? <Bell className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </div>
                            <div>
                                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                                    {mode === 'list' ? 'Notification History' : 'New Broadcast'}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    View organizational notifications or send new announcement broadcasts.
                                </DialogDescription>
                                <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1 sm:mt-1.5">
                                    {mode === 'list' ? 'Organisational Timeline' : 'Live Announcement Form'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {mode === 'list' ? (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {notifications.length > 0 && (
                                        <Button 
                                            variant="ghost"
                                            onClick={async () => {
                                                if (!profile?.id || notifications.length === 0) return;
                                                const ids = notifications.map((n: any) => n.id);
                                                await apiFetch('/admin/notifications/read', {
                                                    method: 'POST',
                                                    body: { notification_ids: ids }
                                                });
                                                queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
                                                toast({ title: "Marked all as read" });
                                            }}
                                            className="h-9 sm:h-10 rounded-xl text-slate-400 font-black uppercase tracking-widest text-[8px] sm:text-[9px] px-2 sm:px-3 flex-1 sm:flex-none"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark All Read
                                        </Button>
                                    )}
                                    <Button 
                                        onClick={() => setMode('create')}
                                        className="h-9 sm:h-10 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[8px] sm:text-[10px] shadow-lg shadow-primary/20 gap-2 px-3 sm:px-5 hover:scale-105 transition-transform flex-1 sm:flex-none"
                                    >
                                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> New Broadcast
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="ghost"
                                    onClick={() => setMode('list')}
                                    className="h-9 sm:h-10 rounded-xl text-slate-500 font-black uppercase tracking-widest text-[8px] sm:text-[10px] gap-2 px-3 sm:px-5"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to History
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar">
                    {mode === 'list' ? (
                        <div className="space-y-4">
                            {/* ACTIVE TASK REMINDERS REGION */}
                            {activeTaskReminders.length > 0 && (
                                <div className="space-y-3 pb-2 border-b border-slate-200/80">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" />
                                            Active Task Reminders ({activeTaskReminders.length})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => window.open("/planner", "_blank")}
                                            className="text-[10px] font-black text-fuchsia-600 hover:text-fuchsia-700 flex items-center gap-1 uppercase tracking-wider hover:underline"
                                        >
                                            <span>Open Planner</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {activeTaskReminders.map((task) => {
                                        const prio = task.priority || "medium";
                                        const isCritical = prio === "critical";
                                        const isHigh = prio === "high";
                                        const isLow = prio === "low";

                                        return (
                                            <div
                                                key={`reminder_${task.id}`}
                                                onClick={() => window.open("/planner", "_blank")}
                                                className={cn(
                                                    "p-5 rounded-[28px] border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md",
                                                    isCritical
                                                        ? "border-rose-500/60 bg-rose-50/70 dark:bg-rose-950/25 ring-1 ring-rose-500/30"
                                                        : isHigh
                                                        ? "border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25 ring-1 ring-amber-500/30"
                                                        : isLow
                                                        ? "border-blue-500/60 bg-blue-50/70 dark:bg-blue-950/25"
                                                        : "border-yellow-500/60 bg-yellow-50/70 dark:bg-yellow-950/25"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-2.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge
                                                            className={cn(
                                                                "border-none text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5",
                                                                isCritical
                                                                    ? "bg-rose-500 text-white animate-pulse"
                                                                    : isHigh
                                                                    ? "bg-amber-500 text-white"
                                                                    : isLow
                                                                    ? "bg-blue-500 text-white"
                                                                    : "bg-yellow-500 text-slate-900"
                                                            )}
                                                        >
                                                            {isCritical ? "🔴 Critical Priority" : isHigh ? "🟠 High Priority" : isLow ? "🔵 Low Priority" : "🟡 Medium Priority"}
                                                        </Badge>

                                                        <span className="text-[10px] font-bold text-fuchsia-700 bg-fuchsia-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {task.time_mode === "set_time" || (task.start_time && !task.end_time)
                                                                ? `Today at ${task.start_time}`
                                                                : task.start_time && task.end_time
                                                                ? `${task.start_time} - ${task.end_time}`
                                                                : `Deadline: ${task.deadline || task.date}`}
                                                        </span>
                                                    </div>

                                                    <Badge variant="outline" className="border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 text-[8px] font-black uppercase">
                                                        Task Reminder
                                                    </Badge>
                                                </div>

                                                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight mb-1.5 tracking-tight uppercase italic">
                                                    {task.title}
                                                </h4>

                                                {task.description && (
                                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">
                                                        "{task.description}"
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                                                        <span>Assigned To: <strong className="text-slate-900 dark:text-white font-bold">{task.assignee_name || "Myself"}</strong></span>
                                                        {task.assigner_name && <span>• By: <strong>{task.assigner_name}</strong></span>}
                                                    </div>

                                                    <div className="flex items-center gap-1 text-fuchsia-700 dark:text-fuchsia-400 font-black text-xs">
                                                        <span>Open in Planner</span>
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {listLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hydrating Inbox...</p>
                                </div>
                            ) : notifications.length === 0 && activeTaskReminders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                        <History className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase italic px-10 leading-relaxed tracking-wider">
                                        No announcements have been broadcasted yet. Start by sending your first update.
                                    </p>
                                    <Button onClick={() => setMode('create')} variant="outline" className="rounded-xl border-primary/20 text-primary font-black uppercase text-[9px] tracking-[0.2em]">Initialise System</Button>
                                </div>
                            ) : (
                                sortedNotifications.map((n: any) => {
                                    const payload = typeof n.action_payload === 'string' ? JSON.parse(n.action_payload) : n.action_payload;
                                    
                                    // Custom colors based on type and category
                                    const isPendingRegistration = n.category === 'direct_action' && n.type === 'orange' && n.action_status === 'pending';
                                    const isAmberAlert = n.type === 'amber';
                                    const isMutedGray = n.category === 'global_announcement';

                                    return (
                                        <div 
                                            key={n.id} 
                                            className={cn(
                                                "p-5 rounded-[28px] border transition-all cursor-default relative overflow-hidden",
                                                n.is_vip ? "vip-border bg-amber-50/10 dark:bg-amber-950/10 border-amber-500/30" : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20",
                                                isPendingRegistration && "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/15 animate-pulse",
                                                isAmberAlert && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10",
                                                isMutedGray && "border-slate-100 bg-slate-50/50 dark:bg-slate-900/50"
                                            )}
                                        >
                                            {n.is_vip && (
                                                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-bl-xl shadow-sm z-10 font-sans">
                                                    ★ VIP Athlete
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn(
                                                        "border-none text-[8px] font-black uppercase tracking-widest px-2",
                                                        n.priority === 'high' ? "bg-rose-500 text-white" : "bg-primary/10 text-primary",
                                                        isPendingRegistration && "bg-orange-500 text-white",
                                                        isAmberAlert && "bg-amber-500 text-white"
                                                    )}>
                                                        {n.priority === 'high' ? 'Urgent' : n.category === 'direct_action' ? 'Action Required' : 'General'}
                                                    </Badge>
                                                    <span className="text-[9px] font-black text-slate-400 lowercase italic flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                {n.is_broadcast && (
                                                    <Badge variant="outline" className="border-slate-100 text-[8px] font-black uppercase text-slate-400">Broadcast</Badge>
                                                )}
                                            </div>
                                            <h4 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors uppercase">{n.title}</h4>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-450 leading-relaxed mb-4 line-clamp-3 italic">
                                                "{n.content}"
                                            </p>

                                            {/* Action buttons inside card */}
                                            {n.category === 'direct_action' && n.action_status === 'pending' && payload?.userId && (
                                                <div className="mt-4 pt-4 border-t border-slate-100/50 flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        disabled={actioningId === n.id}
                                                        onClick={() => handleApprovalAction(n.id, payload, true)}
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl h-8 px-4"
                                                    >
                                                        {actioningId === n.id ? "Processing..." : "Approve"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={actioningId === n.id}
                                                        onClick={() => handleApprovalAction(n.id, payload, false)}
                                                        className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl h-8 px-4"
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {n.category === 'direct_action' && n.action_status !== 'pending' && (
                                                <div className="mt-4 pt-2 border-t border-slate-100/50 text-[10px] font-black uppercase tracking-wider text-slate-400 italic">
                                                    Status: {n.action_status}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-slate-900 dark:text-slate-200 leading-none lowercase italic">{n.sender?.first_name || 'System'} {n.sender?.last_name || ''}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{n.sender?.profession || 'Specialist'}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="text-[8px] font-black text-slate-400 bg-slate-100 uppercase tracking-tighter">ID: {n.id.substring(0, 8)}</Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full">
                            <form onSubmit={handleCreateSubmit} className="space-y-4 sm:space-y-6 flex flex-col h-full bg-white p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-sm">
                                <div className="space-y-4 sm:space-y-5 flex-1">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Announcement Title</Label>
                                        <Input 
                                            placeholder="e.g. Lab Maintenance Update" 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value.toUpperCase())}
                                            className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 border-none font-black italic text-slate-900 focus:ring-primary/20 text-base sm:text-lg tracking-tight"
                                        />
                                    </div>
 
                                    <div className="space-y-2">
                                        <Label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Broadcast Message</Label>
                                        <Textarea 
                                            placeholder="Broadcast details to all system participants..." 
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="min-h-[120px] sm:min-h-[160px] rounded-[18px] sm:rounded-[24px] bg-slate-50 border-none font-medium text-slate-700 focus:ring-primary/20 resize-none p-4 sm:p-5 italic text-sm"
                                        />
                                    </div>
 
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Priority Mapping</Label>
                                            <Select value={priority} onValueChange={setPriority}>
                                                <SelectTrigger className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 border-none font-black text-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="normal" className="font-bold">Normal</SelectItem>
                                                    <SelectItem value="high" className="font-bold text-rose-600 italic">High Priority</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Audience</Label>
                                            <Select value={target} onValueChange={setTarget}>
                                                <SelectTrigger className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 border-none font-black text-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="all" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs">Broadcast: Everyone</SelectItem>
                                                    <SelectItem value="admin" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs text-rose-600">Admins Only</SelectItem>
                                                    <SelectItem value="sports_scientist" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs text-indigo-600">Sports Scientists</SelectItem>
                                                    <SelectItem value="athlete" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs text-emerald-600">Athletes / Clients</SelectItem>
                                                    <SelectItem value="consultant" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs text-amber-600">Consultants</SelectItem>
                                                    <SelectItem value="specialist" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs text-blue-600">Specialists (Clinical Staff)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
 
                                <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        className="h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 order-2 sm:order-1"
                                        onClick={() => setMode('list')}
                                    >
                                        Discard
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        disabled={loading || !title || !content}
                                        className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 gap-3 group order-1 sm:order-2"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                        Initialize Broadcast
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
                
                {/* Visual Footer Lip */}
                <div className="h-4 bg-white/50 backdrop-blur-sm border-t border-slate-100" />
            </DialogContent>
        </Dialog>
    );
}
