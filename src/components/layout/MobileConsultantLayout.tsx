import React, { useState } from "react";
import ConsultantBottomNav from "../consultant/ConsultantBottomNav";
import { Activity, Bell, X, LogOut, LayoutGrid, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { AnnouncementsManager } from "../shared/AnnouncementsManager";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileConsultantLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function MobileConsultantLayout({ children, title = "ISHPO" }: MobileConsultantLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const queryClient = useQueryClient();
  const [activePopup, setActivePopup] = React.useState<any | null>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id || !profile?.organization_id) return 0;
      const data = await apiFetch<any>(`/hr/notifications/unread-count`);
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
        <div className="h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shadow-lg shadow-slate-900/10 dark:shadow-white/5 min-w-[40px] min-h-[40px]">
              <Activity className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <div className="flex flex-col min-w-0">
              {(profile?.organization?.name || profile?.organization_name) && (
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/80 leading-none mb-0.5 truncate max-w-[120px]">
                  {profile?.organization?.name || profile?.organization_name}
                </p>
              )}
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight italic truncate">
                {title || "ISHPO"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  haptic.light();
                  setShowAnnouncements(true);
                }}
                className="relative p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-transform active:scale-90 min-w-[40px] min-h-[40px] flex items-center justify-center"
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

            {/* Avatar Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={() => haptic.light()} 
                  className="focus:outline-none transition-transform active:scale-95 min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-md">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-white font-black text-[10px]">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-1.5 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{profile?.email}</p>
                </div>
                <DropdownMenuItem onClick={() => navigate("/app-gallery")} className="rounded-xl cursor-pointer text-xs font-semibold py-2 my-0.5">
                  <LayoutGrid className="w-4 h-4 mr-2 text-teal-600" />
                  App Gallery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/mobile/profile")} className="rounded-xl cursor-pointer text-xs font-semibold py-2 my-0.5">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                <DropdownMenuItem onClick={signOut} className="rounded-xl cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-semibold py-2 my-0.5">
                  <LogOut className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400" />
                  Sign Out / Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
        <div className="max-w-lg mx-auto px-6 py-6 min-h-full">
          {children}
        </div>
      </main>

      <AnnouncementsManager 
        open={showAnnouncements} 
        onOpenChange={setShowAnnouncements} 
      />

      {/* Fixed Bottom Navigation Area */}
      <ConsultantBottomNav />
    </div>
  );
}
