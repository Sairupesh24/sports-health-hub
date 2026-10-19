import React, { useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
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
            const data = await apiFetch<any[]>('/ams/notifications');
            return data;
        },
        enabled: !!profile?.id
    });

    const { data: readIds = [] } = useQuery({
        queryKey: ["notification-reads", profile?.id],
        queryFn: async () => {
            const data = await apiFetch<string[]>('/ams/notifications/reads');
            return data || [];
        },
        enabled: !!profile?.id
    });

    const markAllAsRead = async () => {
        if (!profile?.id || notifications.length === 0) return;
        
        const unreadIds = notifications
            .filter(n => !readIds.includes(n.id))
            .map(n => n.id);

        if (unreadIds.length === 0) return;

        await apiFetch('/ams/notifications/read', {
            method: 'POST',
            body: { notificationIds: unreadIds }
        });
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
            <div className="space-y-4 pb-20">
                <header className="space-y-0.5 pt-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                        Notifications
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Broadcasts & direct announcements
                    </p>
                </header>

                {isLoading ? (
                    <div className="flex justify-center p-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                        <History className="w-8 h-8 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Your inbox is empty</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((n) => {
                            const isRead = readIds.includes(n.id);
                            const Icon = n.type === 'announcement' ? Megaphone : Bell;
                            const priorityColor = n.priority === 'high' ? 'text-rose-600 dark:text-rose-400' : 'text-primary';
                            const priorityBg = n.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60' : 'bg-primary/10 border border-primary/20';

                            return (
                                <div 
                                    key={n.id}
                                    className={cn(
                                        "p-4 rounded-2xl border transition-all shadow-xs",
                                        isRead 
                                            ? "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800" 
                                            : "bg-white dark:bg-slate-900 border-primary/40 shadow-sm"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2.5">
                                        <div className={cn("p-2 rounded-xl flex items-center justify-center", priorityBg)}>
                                            <Icon className={cn("w-4 h-4", priorityColor)} />
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {!isRead && <span className="w-2 h-2 rounded-full bg-primary" />}
                                            <h3 className={cn("text-sm font-bold tracking-tight", isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white")}>
                                                {n.title}
                                            </h3>
                                        </div>
                                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {n.content}
                                        </p>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                {n.sender?.first_name?.[0]}{n.sender?.last_name?.[0]}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                {n.sender?.first_name} {n.sender?.last_name} • {n.sender?.profession || 'Staff'}
                                            </p>
                                        </div>
                                        {n.priority === 'high' && (
                                            <Badge className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[9px] font-semibold uppercase px-2 py-0.5">
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
