import React, { useState } from "react";
import SpecialistBottomNav from "../sports-scientist/SpecialistBottomNav";
import { Activity, Bell, User, X } from "lucide-react";
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
  const [activePopup, setActivePopup] = React.useState<any | null>(null);
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

  // Subscribe to real-time notifications via SSE
  React.useEffect(() => {
    if (!profile?.id) return;

    const token = localStorage.getItem('ishpo_jwt');
    if (!token) return;

    const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        console.log('[SSE] New notification received:', notification);
        queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
        queryClient.invalidateQueries({ queryKey: ["staff-notifications-history"] });

        // Show temporary popup preview
        setActivePopup(notification);
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] EventSource failed:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [profile?.id, queryClient]);

  // Auto-dismiss popup after 5 seconds
  React.useEffect(() => {
    if (activePopup) {
      const timer = setTimeout(() => {
        setActivePopup(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activePopup]);

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
            <div className="relative">
               <button 
                type="button"
                onClick={() => {
                  haptic.light();
                  setShowAnnouncements(true);
                }}
                className="relative p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-transform active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-primary" : "")} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-[8px] font-black text-white rounded-full border-2 border-white dark:border-slate-950 animate-in zoom-in duration-300 touchscreen-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {activePopup && (
                <div className="absolute top-12 right-0 w-64 bg-slate-900/95 text-white border border-primary/30 p-3 rounded-2xl shadow-xl z-50 animate-in slide-in-from-top-2 duration-300 font-sans pointer-events-auto">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary">New Alert</span>
                    <button onClick={(e) => { e.stopPropagation(); setActivePopup(null); }} className="text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h5 className="text-[10px] font-black uppercase tracking-tight text-white line-clamp-1">{activePopup.title}</h5>
                  <p className="text-[9px] text-slate-300 leading-snug line-clamp-2 mt-0.5 italic">"{activePopup.content}"</p>
                </div>
              )}
            </div>
            <button onClick={() => { haptic.light(); window.location.href = '/profile'; }} className="focus:outline-none transition-transform active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center">
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
