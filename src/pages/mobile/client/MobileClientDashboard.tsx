import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import MetricCard from "@/components/client/MetricCard";
import PerformancePill from "@/components/client/PerformancePill";
import { 
  Calendar, Activity, CreditCard, Clock, 
  ChevronRight, Star, Zap, Heart, Moon, ArrowRight, Dumbbell, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, differenceInCalendarDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { subDays } from "date-fns";

export default function MobileClientDashboard() {
  const navigate = useNavigate();
  const { profile, clientId, session } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [unpaidDues, setUnpaidDues] = useState<number>(0);
  const [consistencyWindow, setConsistencyWindow] = useState<'7' | '28' | 'all'>('7');
  const [insights, setInsights] = useState<{physio: any, program: any}>({physio: null, program: null});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!clientId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // 1. Fetch Appointments
      const { data: appts, error: apptError } = await (supabase as any)
        .from('sessions')
        .select(`
          id, scheduled_start, service_type, status,
          therapist:profiles!sessions_therapist_id_fkey(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .gte('scheduled_start', subDays(new Date(), 30).toISOString())
        .order('scheduled_start', { ascending: true });

      if (!apptError && appts) {
        setAppointments(appts);
      }

      // 2. Fetch Assigned Workouts
      const { data: assignments, error: assignError } = await supabase
        .from('program_assignments' as any)
        .select(`
          *,
          program:training_programs(
            *,
            days:workout_days(*)
          )
        `)
        .eq('athlete_id', profile?.id)
        .eq('status', 'active');

      if (!assignError && assignments) {
        setAssignedWorkouts(assignments);
      }

      // 3. Fetch Wellness Logs
      const { data: logs, error: logsError } = await supabase
        .from('wellness_logs')
        .select('*')
        .eq('athlete_id', profile?.id)
        .gte('created_at', subDays(new Date(), 30).toISOString())
        .order('created_at', { ascending: true });

      if (!logsError && logs) {
        setWellnessLogs(logs);
      }

      // 4. Fetch Unpaid Bills
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('total_amount, status')
        .eq('client_id', clientId)
        .neq('status', 'Paid')
        .neq('status', 'Cancelled');

      if (!billsError && bills) {
        const total = bills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        setUnpaidDues(total);
      }

      // 5. Fetch Insights
      const { data: injuries, error: injuryError } = await (supabase as any)
        .from('injuries')
        .select('clinical_notes, updated_at')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
        .limit(1);

      setInsights({
        physio: injuries?.[0] || null,
        program: assignments?.[0]?.program || null
      });

      setLoading(false);
    }
    fetchDashboardData();
  }, [clientId, session?.user?.id]);

  const getTodayWorkout = () => {
    return assignedWorkouts.flatMap(w => {
      const start = new Date(w.start_date);
      const diffDays = differenceInCalendarDays(new Date(), start);
      if (diffDays >= 0 && w.program?.days) {
        const workoutDay = w.program.days.find((d: any) => d.display_order === diffDays);
        if (workoutDay) return [{ ...workoutDay, programName: w.program.name }];
      }
      return [];
    })[0];
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  const todayWorkout = getTodayWorkout();

  const metrics = useMemo(() => {
    if (wellnessLogs.length === 0) return { readiness: 0, consistency: 0, avgPain: 0, sleep: "N/A", recovery: 0, fatigue: "N/A", wellness: 0 };
    
    const latest = wellnessLogs[wellnessLogs.length - 1];
    const readiness = Math.round(((latest.sleep_score + (11 - latest.stress_level) + (11 - latest.fatigue_level)) / 3) * 10);
    
    const last7Days = wellnessLogs.filter(l => differenceInCalendarDays(new Date(), new Date(l.created_at)) <= 7);
    const avgPain = last7Days.length > 0 ? (last7Days.reduce((sum, l) => sum + l.soreness_level, 0) / last7Days.length).toFixed(1) : "0";
    
    const now = new Date();
    let windowDays = consistencyWindow === '7' ? 7 : consistencyWindow === '28' ? 28 : 3650;
    const windowStart = subDays(now, windowDays);
    const relevantSessions = appointments.filter(a => new Date(a.scheduled_start) >= windowStart && new Date(a.scheduled_start) <= now);
    const completedSessions = relevantSessions.filter(a => a.status === 'Completed' || a.status === 'Attended');
    const consistency = relevantSessions.length > 0 ? Math.round((completedSessions.length / relevantSessions.length) * 100) : 0;

    return {
        readiness,
        consistency,
        avgPain,
        sleep: latest.sleep_score > 8 ? "Excellent" : latest.sleep_score > 6 ? "Good" : "Fair",
        recovery: Math.round(((latest.sleep_score + (11 - latest.fatigue_level)) / 2) * 10),
        fatigue: latest.fatigue_level > 7 ? "High" : latest.fatigue_level > 4 ? "Moderate" : "Low",
        wellness: ((latest.sleep_score + (11 - latest.stress_level) + (11 - latest.fatigue_level) + (11 - latest.soreness_level)) / 4).toFixed(1)
    };
  }, [wellnessLogs, appointments, consistencyWindow]);

  const chartData = useMemo(() => {
    return wellnessLogs.slice(-7).map(l => ({
      day: l.created_at ? format(new Date(l.created_at), 'EEE') : 'N/A',
      score: l.soreness_level
    }));
  }, [wellnessLogs]);

  const upcomingAppointments = appointments.filter(a => a.scheduled_start && new Date(a.scheduled_start) >= new Date()).slice(0, 2);

  return (
    <MobileLayout>
      <div className="space-y-8 pb-10">
        
        {/* Mobile Hero Header */}
        <section className="space-y-2">
           <div className="flex items-center gap-2">
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">Live Status</span>
           </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase leading-tight">
              Good {getGreeting()}, <br />
              <span className="text-primary">{profile?.first_name || 'Champion'}</span>
           </h2>
        </section>

        {/* Dynamic Consistency Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-4 flex-1">
              <div className="text-center shrink-0">
                 <p className="text-[7px] sm:text-[8px] uppercase font-black text-slate-500 tracking-widest">Readiness</p>
                 <p className="text-lg sm:text-xl font-black text-primary italic">{metrics.readiness}%</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div 
                className="text-center cursor-pointer active:opacity-60 transition-opacity shrink-0"
                onClick={() => setConsistencyWindow(prev => prev === '7' ? '28' : prev === '28' ? 'all' : '7')}
              >
                 <p className="text-[7px] sm:text-[8px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1">
                   Consistency <Badge className="bg-primary/20 text-white border-none text-[6px] h-3 px-1">{consistencyWindow === 'all' ? 'All' : consistencyWindow + 'D'}</Badge>
                 </p>
                 <p className="text-lg sm:text-xl font-black text-emerald-500 italic">{metrics.consistency}%</p>
              </div>
           </div>
           <Button 
              size="icon" 
              onClick={() => navigate('/mobile/client/appointments')}
              className="w-12 h-12 rounded-2xl bg-white text-slate-900 shadow-lg active:scale-90 transition-transform"
            >
              <Calendar className="w-5 h-5" />
           </Button>
        </div>

        {/* Quick Vertical Stats */}
        <div className="grid grid-cols-2 gap-4">
           <MetricCard 
            title="Next Session"
            value={upcomingAppointments[0] ? format(new Date(upcomingAppointments[0].scheduled_start), "hh:mm a") : "—"}
            subtitle={upcomingAppointments[0] ? (isToday(new Date(upcomingAppointments[0].scheduled_start)) ? 'Today' : format(new Date(upcomingAppointments[0].scheduled_start), 'MMM d')) : "Schedule Now"}
            icon={Clock}
            variant="glass"
            className="p-4"
            onClick={() => navigate('/client/appointments')}
          />
          <MetricCard 
            title="Avg Pain"
            value={metrics.avgPain}
            subtitle="/10 index"
            icon={Activity}
            variant="glass"
            className="p-4"
            trend={{ value: wellnessLogs.length > 0 ? "Live" : "No Data", type: "neutral" }}
          />
        </div>

        {/* Horizontal Performance Pills */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
          <div className="snap-center"><PerformancePill label="Sleep" value={metrics.sleep} icon={Moon} status={metrics.sleep === "Excellent" ? "good" : "warning"} /></div>
          <div className="snap-center"><PerformancePill label="Recovery" value={`${metrics.recovery}%`} icon={Zap} status={metrics.recovery > 70 ? "good" : "warning"} /></div>
          <div className="snap-center"><PerformancePill label="Fatigue" value={metrics.fatigue} icon={Heart} status={metrics.fatigue === "Low" ? "good" : "warning"} /></div>
          <div className="snap-center"><PerformancePill label="Well" value={metrics.wellness} icon={Star} status="good" /></div>
        </div>

        {/* NEXT PROTOCOL - Large Card */}
        {todayWorkout ? (
            <div className="relative group p-4 sm:p-6 rounded-[32px] bg-slate-900 border border-white/5 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer" onClick={() => navigate(`/mobile/client/workout/${todayWorkout.id}`)}>
                <div className="absolute top-0 right-0 p-6 opacity-10">
                   <Dumbbell className="w-16 h-16 rotate-12" />
                </div>
                <div className="relative z-10 space-y-4">
                   <div className="flex items-center gap-2">
                      <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest">Next Protocol</Badge>
                   </div>
                   <div>
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">{todayWorkout.title}</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">{todayWorkout.programName}</p>
                   </div>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/mobile/client/workout/${todayWorkout.id}`);
                      }}
                      className="w-full h-12 rounded-xl bg-white text-slate-900 font-extrabold uppercase italic gap-2 text-xs"
                    >
                       Launch Session <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        ) : (
          <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 flex flex-col items-center justify-center space-y-4 text-center">
             <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                <Heart className="w-6 h-6" />
             </div>
             <p className="text-xs font-black italic uppercase text-slate-400">Rest & Recovery Active</p>
             <Button variant="ghost" className="text-[10px] font-black text-primary uppercase" onClick={() => navigate('/mobile/client/appointments')}>Schedule a Session?</Button>
          </div>
        )}

        {/* Mini Recovery Chart */}
        <section className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Progress Curve</h3>
              <TrendingUp className="w-4 h-4 text-primary" />
           </div>
           <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.length > 0 ? chartData : [{day: 'N/A', score: 0}]}>
                    <defs>
                      <linearGradient id="mobilePainGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="day" 
                      hide
                    />
                    <YAxis hide domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#020617',
                        borderRadius: '16px', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        fontSize: '10px',
                        color: 'white'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#mobilePainGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
        </section>

        {/* Pending Dues - Simple Pill */}
        {unpaidDues > 0 && (
          <div className="flex items-center justify-between p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl" onClick={() => navigate('/client/billing')}>
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                   <CreditCard className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                   <p className="text-[8px] font-black uppercase tracking-widest text-rose-500/60">Pending Dues</p>
                   <p className="text-lg font-black text-rose-500">₹{unpaidDues.toLocaleString()}</p>
                </div>
             </div>
             <ChevronRight className="w-5 h-5 text-rose-500/40" />
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
