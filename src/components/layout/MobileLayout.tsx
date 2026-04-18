import React from "react";
import ClientBottomNav from "../client/ClientBottomNav";
import { Activity, Bell, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
}

export default function MobileLayout({ children, showBack }: MobileLayoutProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id || !profile?.organization_id) return 0;
      
      const { data, error, count } = await (supabase as any).from("notifications")
        .select(`id`, { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .or(`is_broadcast.eq.true,target_user_id.eq.${profile.id}`)
        .not("id", "in", (
            supabase.from("notification_reads").select("notification_id").eq("user_id", profile.id)
        ) as any);
      
      // Since 'not in' with subquery is tricky in postgrest, let's do a more robust approach
      // Filter count = Total potential - Total read
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
    refetchInterval: 30000 // Fallback poll
  });

  React.useEffect(() => {
    if (!profile?.organization_id) return;

    const channel = supabase
      .channel('notifications-changes')
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
    <div className="flex flex-col min-h-screen bg-slate-950 text-white selection:bg-primary/30 antialiased overflow-x-hidden">
      {/* Premium Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-6 py-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20" onClick={() => navigate('/mobile/client')}>
              <Activity className="w-5 h-5 text-white" />
            </div>
          )}
          <div onClick={() => !showBack && navigate('/mobile/client')}>
            <h1 className="text-base sm:text-lg font-black italic tracking-tighter uppercase leading-none">ISHPO</h1>
            <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5 sm:mt-1">AMS Console</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => navigate('/mobile/client/notifications')}
            className="relative p-2 rounded-xl bg-white/5 border border-white/5 active:scale-90 transition-transform"
          >
            <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-primary" : "text-slate-400")} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-[8px] font-black text-white rounded-full border-2 border-slate-950 animate-in zoom-in duration-300">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border-2 border-primary/20 overflow-hidden active:scale-95 transition-transform"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <User className="w-5 h-5 text-slate-500" />
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-24 pb-32 px-4 animate-in fade-in duration-700">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </main>

      {/* Floating Glass Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-4">
         <div className="max-w-md mx-auto flex justify-center pointer-events-auto">
            <ClientBottomNav isMobileLayout />
         </div>
      </div>
      
      {/* Premium Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-primary/10 blur-[120px] rounded-full opacity-50" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full opacity-30" />
      </div>
    </div>
  );
}
