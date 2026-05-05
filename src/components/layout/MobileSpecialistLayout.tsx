import React, { useState } from "react";
import SpecialistBottomNav from "../sports-scientist/SpecialistBottomNav";
import { Activity, Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AnnouncementsManager } from "../shared/AnnouncementsManager";

interface MobileSpecialistLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function MobileSpecialistLayout({ children, title = "ISHPO" }: MobileSpecialistLayoutProps) {
  const { profile } = useAuth();
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const queryClient = useQueryClient();

  // Fetch unread count for the specialist
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id || !profile?.organization_id) return 0;
      
      const { count: totalCount } = await (supabase as any).from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .or(`is_broadcast.eq.true,target_user_id.eq.${profile.id}`);

      const { count: readCount } = await (supabase as any).from("notification_reads")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", profile.id);

      return Math.max(0, (totalCount || 0) - (readCount || 0));
    },
    enabled: !!profile?.id,
    refetchInterval: 30000 
  });

  // Real-time subscription for notifications
  React.useEffect(() => {
    if (!profile?.organization_id) return;

    const channel = supabase
      .channel('specialist-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${profile.organization_id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, queryClient]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] flex flex-col pb-20">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-border/50 px-5 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {title || "ISHPO"}
            </h1>
            {profile?.organization && (
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 leading-none">
                {profile.organization.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => {
              setShowAnnouncements(true);
            }}
            className="relative p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-transform active:scale-90 z-50"
          >
            <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-primary" : "")} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-black animate-pulse" />
            )}
          </button>
          <button onClick={() => window.location.href = '/profile'} className="focus:outline-none transition-transform active:scale-95">
            <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-md">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-white font-black text-xs">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="container px-4 py-6">
          {children}
        </div>
      </main>

      {/* Announcements Manager Modal */}
      <AnnouncementsManager 
        open={showAnnouncements} 
        onOpenChange={setShowAnnouncements} 
      />

      {/* Navigation Dock */}
      <SpecialistBottomNav />
    </div>
  );
}
