import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  Users, 
  Activity, 
  Clock, 
  ChevronRight, 
  Sparkles,
  CheckCircle2,
  Calendar,
  ClipboardList,
  MapPin,
  TrendingUp,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import MobileAthleteDrawer from "@/components/sports-scientist/MobileAthleteDrawer";
import { haptic } from "@/utils/haptic";
import { useNavigate } from "react-router-dom";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";

export default function MobileSpecialistDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [greeting, setGreeting] = useState("Good Day");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["mobile-scientist-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      // 1. Attendance Status
      const { data: attendanceData } = await supabase
        .from('hr_attendance_logs' as any)
        .select('*')
        .eq('profile_id', user.id)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      const lastLog = attendanceData?.[0] || null;
      const isCheckedIn = lastLog?.type === 'check_in';

      // 2. Sessions Today
      const { data: sessionsToday } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('scientist_id', user.id)
        .gte('scheduled_start', todayStart.toISOString())
        .lte('scheduled_start', todayEnd.toISOString());

      const totalSessions = sessionsToday?.length || 0;
      const remainingSessions = sessionsToday?.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled').length || 0;

      // 3. Active Clients
      const { count: activeClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('primary_scientist_id', user.id)
        .is('deleted_at', null);

      // 4. Pending Tasks (Questionnaires)
      const { count: pendingTasks } = await supabase
        .from("form_responses")
        .select("id", { count: 'exact', head: true })
        .eq("specialist_id", user.id)
        .eq("status", "completed")
        .is("clinical_interpretation", null);

      // 5. Active Sessions (Checked-In Athletes)
      const { data: activeSessions } = await supabase
        .from("sessions")
        .select(`
          id, 
          scheduled_start, 
          status, 
          session_mode, 
          group_name,
          client:clients(id, first_name, last_name, uhid, is_vip, sport, org_name)
        `)
        .eq("scientist_id", user.id)
        .eq("status", "Checked In")
        .order("scheduled_start", { ascending: true })
        .limit(10);

      return {
        isCheckedIn,
        totalSessions,
        remainingSessions,
        activeClientsCount: activeClientsCount || 0,
        pendingTasks: pendingTasks || 0,
        activeSessions: activeSessions || []
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const handleAthleteClick = (athlete: any) => {
    haptic.light();
    setSelectedAthlete(athlete);
    setIsDrawerOpen(true);
  };

  return (
    <MobileSpecialistLayout title="ISHPO">
      <div className="space-y-6">
        
        {/* Welcome Section & Attendance Action */}
        <section className="space-y-4">
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] border border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-5 dark:opacity-10 pointer-events-none">
              <Sparkles className="w-40 h-40" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white leading-tight">
                  {greeting}, <span className="text-primary italic">{profile?.first_name || "Specialist"}!</span>
                </h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Ready to elevate performance on the field today?
                </p>
              </div>

              {/* Functional Attendance Marker for Direct Action */}
              <div className="pt-2">
                <AttendanceMarker />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => { haptic.light(); navigate('/mobile/specialist/attendance'); }}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-border/50 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  View Daily Logs
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Analytics Grid */}
        <section className="grid grid-cols-2 gap-4">
          <Card className="bg-white dark:bg-[#0F172A] border-border/50 shadow-sm rounded-3xl">
             <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                   <Target className="w-4 h-4" />
                </div>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">{dashboardData?.remainingSessions || 0}</h3>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining Today</p>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#0F172A] border-border/50 shadow-sm rounded-3xl">
             <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                   <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">{dashboardData?.totalSessions || 0}</h3>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Sessions</p>
                </div>
             </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-[#0F172A] border-border/50 shadow-sm rounded-3xl col-span-2 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => { haptic.light(); navigate('/mobile/specialist/clients'); }}
          >
             <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                     <Users className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black tracking-tight">{dashboardData?.activeClientsCount || 0}</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Clients</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <ChevronRight className="w-4 h-4" />
                </div>
             </CardContent>
          </Card>
        </section>

        {/* Task Summary Banner */}
        {dashboardData && dashboardData.pendingTasks > 0 && (
          <div 
            onClick={() => { haptic.light(); navigate('/mobile/specialist/forms'); }}
            className="bg-primary p-4 rounded-3xl shadow-lg shadow-primary/20 flex items-center justify-between active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black italic text-lg leading-tight">{dashboardData.pendingTasks} Forms</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Awaiting Review</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/50" />
          </div>
        )}

        {/* Active Sessions - Horizontal Scroll */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <Activity className="w-4 h-4 text-emerald-500" /> Active on Field
              </h3>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest border-none">
                {dashboardData?.activeSessions.length || 0} Checked-in
              </Badge>
           </div>

           <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
              {dashboardData?.activeSessions.length === 0 ? (
                <div className="w-full py-8 bg-slate-100 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-muted-foreground opacity-70">
                   <Clock className="w-8 h-8 mb-2 opacity-50" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No active sessions</p>
                </div>
               ) : (
                dashboardData?.activeSessions.map((session: any) => (
                  <button 
                    key={session.id}
                    type="button"
                    onClick={() => handleAthleteClick(session.client)}
                    className={cn(
                      "min-w-[280px] bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-border/50 shadow-md flex items-center gap-4 transition-all active:scale-95 text-left",
                      session.client?.is_vip && "vip-border"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner shrink-0",
                      session.client?.is_vip ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      {session.client?.first_name?.[0]}{session.client?.last_name?.[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-black text-slate-900 dark:text-white truncate">
                        {session.client?.first_name} {session.client?.last_name}
                      </h4>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate">
                        {session.client?.sport || "General"} • {session.client?.uhid}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">In Progress</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
           </div>
        </section>

      </div>

      <MobileAthleteDrawer 
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        athlete={selectedAthlete}
      />
    </MobileSpecialistLayout>
  );
}

