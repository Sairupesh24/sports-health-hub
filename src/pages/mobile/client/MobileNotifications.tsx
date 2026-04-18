import React, { useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, Bell, CheckCircle2, History, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MobileNotifications() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications-list", profile?.id],
        queryFn: async () => {
            if (!profile?.id || !profile?.organization_id) return [];
            
            const { data, error } = await (supabase as any).from("notifications")
                .select(`
                    *,
                    sender:profiles!notifications_sender_id_fkey(first_name, last_name, profession)
                `)
                .eq("organization_id", profile.organization_id)
                .or(`is_broadcast.eq.true,target_user_id.eq.${profile.id}`)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.id
    });

    const { data: readIds = [] } = useQuery({
        queryKey: ["notification-reads", profile?.id],
        queryFn: async () => {
            if (!profile?.id) return [];
            const { data } = await supabase.from("notification_reads").select("notification_id").eq("user_id", profile.id);
            return data?.map(r => r.notification_id) || [];
        },
        enabled: !!profile?.id
    });

    const markAllAsRead = async () => {
        if (!profile?.id || notifications.length === 0) return;
        
        const unreadIds = notifications
            .filter(n => !readIds.includes(n.id))
            .map(n => n.id);

        if (unreadIds.length === 0) return;

        const inserts = unreadIds.map(id => ({
            notification_id: id,
            user_id: profile.id
        }));

        await supabase.from("notification_reads").insert(inserts);
        queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notification-reads"] });
    };

    useEffect(() => {
        if (notifications.length > 0) {
            markAllAsRead();
        }
    }, [notifications]);

    return (
        <MobileLayout showBack>
            <div className="space-y-6 pb-20">
                <header className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-tight">
                        Inbox
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                        Broadcasts & Direct Alerts
                    </p>
                </header>

                {isLoading ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-[40px] border border-dashed border-white/10 text-center space-y-4">
                        <History className="w-10 h-10 text-slate-700" />
                        <p className="text-xs font-bold text-slate-500 uppercase italic">Your inbox is empty</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((n) => {
                            const isRead = readIds.includes(n.id);
                            const Icon = n.type === 'announcement' ? Megaphone : Bell;
                            const priorityColor = n.priority === 'high' ? 'text-rose-500' : 'text-primary';
                            const priorityBg = n.priority === 'high' ? 'bg-rose-500/10' : 'bg-primary/10';

                            return (
                                <div 
                                    key={n.id}
                                    className={cn(
                                        "group p-5 rounded-[32px] border transition-all duration-300",
                                        isRead 
                                            ? "bg-white/[0.02] border-white/5" 
                                            : "bg-white/[0.08] border-primary/20 shadow-lg shadow-primary/5"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("p-2.5 rounded-2xl flex items-center justify-center", priorityBg)}>
                                            <Icon className={cn("w-5 h-5", priorityColor)} />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-500 tabular-nums uppercase tracking-widest pt-2">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {!isRead && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                            <h3 className={cn("text-lg font-black tracking-tight uppercase italic", isRead ? "text-slate-200" : "text-white")}>
                                                {n.title}
                                            </h3>
                                        </div>
                                        <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                            {n.content}
                                        </p>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                                {n.sender?.first_name?.[0]}{n.sender?.last_name?.[0]}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 italic">
                                                {n.sender?.first_name} {n.sender?.last_name} • {n.sender?.profession || 'Staff'}
                                            </p>
                                        </div>
                                        {n.priority === 'high' && (
                                            <Badge className="bg-rose-500/20 text-rose-500 border-none text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5">
                                                Urgent
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
