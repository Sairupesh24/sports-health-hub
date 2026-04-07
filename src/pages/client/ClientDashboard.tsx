import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/client/MetricCard";
import PerformancePill from "@/components/client/PerformancePill";
import { 
  Calendar, Activity, TrendingDown, CreditCard, Clock, 
  ChevronRight, Star, Zap, Heart, Moon, ArrowRight, Dumbbell, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, differenceInCalendarDays } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';

const mockPainData = [
  { day: 'Mon', score: 7 },
  { day: 'Tue', score: 6 },
  { day: 'Wed', score: 8 },
  { day: 'Thu', score: 5 },
  { day: 'Fri', score: 4 },
  { day: 'Sat', score: 3 },
  { day: 'Sun', score: 3 },
];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { profile, clientId, session } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!clientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const today = new Date().toISOString();

      // 1. Fetch Appointments
      const { data: appts, error: apptError } = await (supabase as any)
        .from('sessions')
        .select(`
          id, scheduled_start, service_type,
          therapist:profiles!sessions_therapist_id_fkey(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .gte('scheduled_start', today)
        .order('scheduled_start', { ascending: true })
        .limit(3);

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
        .eq('athlete_id', session?.user?.id)
        .eq('status', 'active');

      if (!assignError && assignments) {
        setAssignedWorkouts(assignments);
      }

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
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Good Night";
  };

  const todayWorkout = getTodayWorkout();

  return (
    <DashboardLayout role="client">
      <div className="max-w-[1600px] mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Elite Hero Header */}
        <header className="bg-slate-900 rounded-[45px] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
             <TrendingUp className="w-64 h-64" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-primary/20">Elite Dashboard</span>
                <span className="text-white/40 font-black text-[9px] uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do')}</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter italic uppercase">
                {getGreeting()}, <span className="text-primary">{profile?.first_name || 'Champion'}</span>
              </h1>
              <p className="text-white/40 font-medium text-lg max-w-xl">
                 Your recovery protocol is active. Stay focused on your <span className="text-primary font-bold italic">stability metrics</span> today.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
               <Button 
                onClick={() => navigate('/client/book')} 
                className="h-16 px-10 rounded-[24px] bg-white text-slate-900 hover:bg-white/90 shadow-xl font-black text-xl gap-3 uppercase tracking-widest italic"
              >
                <Calendar className="w-6 h-6 text-primary" />
                Book Session
              </Button>
              <div className="flex items-center justify-center gap-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                 <div className="text-center">
                    <p className="text-[9px] uppercase font-black text-white/40">Readiness</p>
                    <p className="text-xl font-black text-primary italic">85%</p>
                 </div>
                 <div className="h-8 w-px bg-white/10" />
                 <div className="text-center">
                    <p className="text-[9px] uppercase font-black text-white/40">Consistency</p>
                    <p className="text-xl font-black text-emerald-500 italic">92%</p>
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Next Appointment"
            value={appointments[0] ? format(new Date(appointments[0].scheduled_start), "hh:mm a") : "None"}
            subtitle={appointments[0] ? `Today with Dr. ${appointments[0].therapist?.last_name}` : "Book your session"}
            icon={Clock}
            variant="primary"
            onClick={() => navigate('/client/appointments')}
          />
          <MetricCard 
            title="Avg Pain Score"
            value="3.2"
            subtitle="/10 this week"
            icon={Activity}
            trend={{ value: "-4 pts", type: "positive" }}
          />
          <MetricCard 
            title="Training Phase"
            value="Stability"
            subtitle="Phase 2 of 4 Active"
            icon={Star}
          />
          <MetricCard 
            title="Pending Dues"
            value="₹3,500"
            subtitle="1 invoice pending"
            icon={CreditCard}
            trend={{ value: "Due", type: "negative" }}
          />
        </div>

        {/* PRESCRIPTION HERO - Prominent Next Workout */}
        {todayWorkout && (
            <section className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-[40px] blur opacity-75 group-hover:opacity-100 transition duration-1000" />
                <div className="relative glass-card bg-white rounded-[40px] p-8 border-none flex flex-col md:flex-row items-center justify-between gap-8 group/card">
                   <div className="flex items-center gap-8 w-full md:w-auto">
                      <div className="w-20 h-20 rounded-[30px] bg-slate-900 flex items-center justify-center text-primary shadow-2xl group-hover/card:scale-110 transition-transform duration-500 shrink-0">
                         <Dumbbell className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                         <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Next Protocol</span>
                         <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{todayWorkout.title}</h3>
                         <p className="text-slate-500 font-medium">Part of <span className="text-slate-900 font-bold">{todayWorkout.programName}</span></p>
                      </div>
                   </div>
                   <Button 
                     onClick={() => navigate('/client/performance')}
                     className="h-16 px-10 rounded-[28px] bg-slate-900 text-white hover:bg-slate-800 font-black text-lg gap-3 w-full md:w-auto shadow-2xl"
                   >
                     Launch Workout <ArrowRight className="w-6 h-6 text-primary" />
                   </Button>
                </div>
            </section>
        )}

        {/* Horizontal Performance Pills */}
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <PerformancePill label="Sleep Quality" value="Excellent" icon={Moon} status="good" trend="up" />
          <PerformancePill label="Recovery" value="82%" icon={Zap} status="good" />
          <PerformancePill label="Fatigue" value="Moderate" icon={Heart} status="warning" />
          <PerformancePill label="Wellness" value="9.4" icon={Star} status="good" trend="up" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed Content (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Pain Trend Chart */}
            <section className="glass-card bg-white rounded-[45px] p-8 space-y-8 shadow-xl border-none">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Recovery Trend</h3>
                  <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">Daily Biometric Progress</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-2xl flex gap-1">
                   <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase bg-white shadow-sm px-4">7D</Button>
                   <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase px-4 text-slate-400">30D</Button>
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockPainData}>
                    <defs>
                      <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}}
                      dy={10}
                    />
                    <YAxis 
                      hide 
                      domain={[0, 10]}
                    />
                    <Tooltip 
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        fontWeight: 900,
                        padding: '16px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={6}
                      fillOpacity={1} 
                      fill="url(#colorPain)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Upcoming Appointments */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Schedule</h3>
                <Button onClick={() => navigate('/client/appointments')} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary gap-2">View All <ArrowRight className="w-3 h-3" /></Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.length > 0 ? (
                  appointments.map((apt) => {
                    const dateObj = new Date(apt.scheduled_start);
                    return (
                      <div 
                        key={apt.id} 
                        onClick={() => navigate('/client/appointments')}
                        className="group flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:translate-y-[-4px] hover:shadow-2xl transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-primary transition-all group-hover:scale-110">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-lg font-black italic text-slate-900 leading-tight uppercase tracking-tighter">{format(dateObj, "EEE, d MMM")}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{format(dateObj, "hh:mm a")} • {apt.service_type}</p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                           <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full p-16 text-center rounded-[45px] bg-white border border-slate-100 shadow-sm">
                     <p className="text-slate-300 font-black italic uppercase tracking-widest mb-4">No Sessions Scheduled</p>
                     <Button onClick={() => navigate('/client/book')} className="rounded-full bg-slate-900 font-extrabold uppercase text-[10px] tracking-widest px-8">Book Now</Button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Content (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Elite Recovery Stats */}
            <div className="bg-slate-900 rounded-[45px] p-8 text-white relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                 <Zap className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Live Recovery Data</p>
                <div className="space-y-8">
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase italic">Elasticity</span>
                        <span className="text-primary font-black">82%</span>
                     </div>
                     <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[82%] rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase italic">Power Output</span>
                        <span className="text-white font-black">64%</span>
                     </div>
                     <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-white/20 w-[64%] rounded-full" />
                     </div>
                  </div>
                </div>
                <Button className="w-full mt-10 h-16 rounded-[24px] bg-white text-slate-900 font-black uppercase italic text-sm tracking-widest hover:bg-white/90 shadow-xl" onClick={() => navigate('/client/performance')}>
                  Full Report
                </Button>
              </div>
            </div>

            {/* Expert Insight Cards */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-4">Insights</h3>
               <div className="p-8 bg-primary rounded-[40px] text-white relative overflow-hidden group shadow-lg hover:translate-y-[-4px] transition-all cursor-pointer">
                  <div className="absolute -right-4 -bottom-4 opacity-20">
                    <Star className="w-32 h-32 fill-white" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/70 mb-2 block">Physio Tip</span>
                  <h4 className="text-xl font-black italic tracking-tight leading-tight mb-3">Optimize Warm-up</h4>
                  <p className="text-xs font-bold text-white/80 leading-relaxed">
                    Integration of dynamic stretching was noted in your last session. Continue this for 10 min daily.
                  </p>
               </div>
               
               <div className="p-8 bg-white border border-slate-100 rounded-[40px] text-slate-900 relative overflow-hidden group shadow-sm hover:shadow-xl transition-all cursor-pointer">
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03]">
                    <Activity className="w-32 h-32" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Program Update</span>
                  <h4 className="text-xl font-black italic tracking-tight leading-tight mb-3">New Mobility Protocol</h4>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    Coach Roy added "Hip Flow v2" to your morning routine. Check the repository.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
