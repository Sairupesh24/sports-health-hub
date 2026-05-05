import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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
    CheckCircle2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

    const { data: notifications = [], isLoading: listLoading } = useQuery({
        queryKey: ["staff-notifications-history", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const { data, error } = await (supabase as any).from("notifications")
                .select(`
                    *,
                    sender:profiles!notifications_sender_id_fkey(first_name, last_name, profession)
                `)
                .eq("organization_id", profile.organization_id)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        },
        enabled: open && mode === "list" && !!profile?.organization_id
    });

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || !profile?.organization_id) return;

        setLoading(true);
        try {
            const { error } = await supabase.from("notifications").insert({
                organization_id: profile.organization_id,
                sender_id: profile.id,
                title,
                content,
                priority,
                is_broadcast: target === "all",
                type: 'announcement'
            });

            if (error) throw error;

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
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                                    {mode === 'list' ? 'Notification History' : 'New Broadcast'}
                                </h2>
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
                                                const inserts = notifications.map((n: any) => ({
                                                    notification_id: n.id,
                                                    user_id: profile.id
                                                }));
                                                await supabase.from("notification_reads").upsert(inserts, { onConflict: 'notification_id,user_id' });
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
                            {listLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hydrating Inbox...</p>
                                </div>
                            ) : notifications.length === 0 ? (
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
                                notifications.map((n: any) => (
                                    <div key={n.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm group hover:shadow-md hover:border-primary/20 transition-all cursor-default">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <Badge className={cn(
                                                    "border-none text-[8px] font-black uppercase tracking-widest px-2",
                                                    n.priority === 'high' ? "bg-rose-500 text-white" : "bg-primary/10 text-primary"
                                                )}>
                                                    {n.priority === 'high' ? 'Urgent' : 'General'}
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
                                        <h4 className="text-base font-black text-slate-900 leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors uppercase">{n.title}</h4>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed mb-4 line-clamp-3 italic">
                                            "{n.content}"
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-slate-900 leading-none lowercase italic">{n.sender?.first_name} {n.sender?.last_name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Specialist</p>
                                                </div>
                                            </div>
                                            <Badge variant="ghost" className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">ID: {n.id.substring(0, 8)}</Badge>
                                        </div>
                                    </div>
                                ))
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
                                                    <SelectItem value="all" className="font-bold uppercase tracking-tighter text-[10px] sm:text-xs">Broadcast: All Clients</SelectItem>
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
