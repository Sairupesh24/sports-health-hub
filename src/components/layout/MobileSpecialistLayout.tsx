import React, { useState } from "react";
import SpecialistBottomNav from "../sports-scientist/SpecialistBottomNav";
import { Activity, Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
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
      const data = await apiFetch(`/hr/notifications/unread-count`);
      return data?.unreadCount || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000 
  });

  // Note: Real-time PostgreSQL changes via supabase client are kept for push notifications
  // but we could also poll if we wanted to fully decouple.
  // Given the requirement to migrate backend to Postgres, we still have a Supabase client
  // for real-time features if needed, but here we keep the subscription logic if it works with the new backend.
  // Actually, the new backend is NOT Supabase, so standard Supabase real-time won't work 
  // unless we implement WebSockets. For now, we rely on the refetchInterval.
  
  /* Real-time logic commented out as it relies on Supabase Realtime which won't work with local Postgres */
  /*
  React.useEffect(() => {
    ...
  }, [...]);
  */

  return (
    <div className="h-screen flex flex-col bg-slate-50/50 dark:bg-[#020617] antialiased selection:bg-primary/30 overflow-hidden">
      {/* Header - Fixed Height with Glassmorphism */}
      <header className="flex-shrink-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/5 safe-area-top">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-lg shadow-slate-900/10 dark:shadow-white/5">
              <Activity className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <div className="flex flex-col">
              {profile?.organization && (
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/80 leading-none mb-0.5">
                  {profile.organization.name}
                </p>
              )}
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight italic">
                {title || "ISHPO"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              type="button"
              onClick={() => {
                haptic.light();
                setShowAnnouncements(true);
              }}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-transform active:scale-90"
            >
              <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-primary" : "")} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-black animate-pulse" />
              )}
            </button>
            <button onClick={() => { haptic.light(); window.location.href = '/profile'; }} className="focus:outline-none transition-transform active:scale-95">
              <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-md">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-white font-black text-[10px]">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
        <div className="max-w-lg mx-auto px-6 py-6 min-h-full">
          {children}
        </div>
      </main>

      {/* Announcements Manager Modal */}
      <AnnouncementsManager 
        open={showAnnouncements} 
        onOpenChange={setShowAnnouncements} 
      />

      {/* Fixed Bottom Navigation Area */}
      <SpecialistBottomNav />
    </div>
  );
}
