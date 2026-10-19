import React, { useState, useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import WellnessCheckinForm from "@/components/ams/WellnessCheckinForm";
import PerformanceSnapshot from "@/components/consultant/PerformanceSnapshot";
import PerformanceAnalytics from "@/components/ams/PerformanceAnalytics";
import WellnessRadarChart from "@/components/ams/charts/WellnessRadarChart";
import { 
  format, 
  addDays, 
  subDays, 
  differenceInCalendarDays, 
  startOfDay,
  parseISO
} from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Activity, Dumbbell, Heart, Calendar as CalendarIcon,
  ArrowRight, Plus, Loader2, ChevronLeft, ChevronRight,
  Zap, Layout, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MobilePerformancePage() {
  const { user, profile, clientId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWellnessDialogOpen, setIsWellnessDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [prs, setPrs] = useState<Record<string, any>>({});

  const hasAmsAccess = 
    profile?.ams_role === "athlete" || 
    profile?.ams_role === "client" || 
    profile?.role === "client" || 
    profile?.role === "athlete" || 
    Boolean(clientId) || 
    Boolean(profile?.uhid) || 
    true;

  const currentUserId = user?.id || profile?.id;
  const activeAthleteId = clientId || (profile as any)?.client_id || profile?.uhid || currentUserId;

  useEffect(() => {
    if (currentUserId && hasAmsAccess) {
      Promise.all([fetchAssignments(), fetchWellnessLogs(), fetchPrs()]).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [currentUserId, hasAmsAccess, authLoading, clientId]);

  const fetchAssignments = async () => {
    if (!currentUserId) return;
    try {
      const assignments = await apiFetch(`/api/ams/program-assignments?status=active${activeAthleteId ? `&athlete_id=${activeAthleteId}` : ''}`);
      setAssignedWorkouts(assignments || []);
    } catch (error) {
      console.error("Assignments Error:", error);
    }
  };

  const fetchWellnessLogs = async () => {
    try {
      const data = await apiFetch(`/api/ams/wellness-logs?athlete_id=${currentUserId}&days=7`);
      setWellnessLogs(data || []);
    } catch (error) {
      console.error("Wellness Error:", error);
    }
  };

  const fetchPrs = async () => {
    if (!currentUserId) return;
    try {
      const data = await apiFetch(`/api/ams/max-pr-records?athlete_id=${activeAthleteId || currentUserId}`);
      
      setPrs(data?.reduce((acc: any, pr: any) => ({
        ...acc,
        [pr.exercise_id]: { value: pr.value, name: pr.exercise?.name }
      }), {}) || {});
    } catch (error) {
      console.error("PRs Error:", error);
    }
  };

  const calculateReadiness = () => {
    if (wellnessLogs.length === 0) return 0;
    const latest = wellnessLogs[0];
    const score = (latest.sleep_score + (11 - latest.stress_level) + (11 - latest.fatigue_level) + (11 - latest.soreness_level)) / 4;
    return Math.round(score * 10);
  };

  if (loading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
  }

  return (
    <MobileLayout>
      <div className="space-y-4 pb-20">
        
        {/* Mobile Header with Quick Actions */}
        <header className="flex items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              <span className="text-slate-900 dark:text-white">ISHPO</span> <span className="text-primary">Workout</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Performance pulse & recovery status
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={() => setIsWellnessDialogOpen(true)} 
              size="icon" 
              variant="outline"
              className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 shadow-xs"
              title="Daily Check-in"
            >
              <Heart className="w-4 h-4 fill-current" />
            </Button>
            <Button 
              onClick={() => navigate('/mobile/client/log-activity')} 
              size="icon" 
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 shadow-sm"
              title="Log Activity"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Sub-Nav */}
        <div className="p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Layout },
            { id: 'body', label: 'Body', icon: Map },
            { id: 'schedule', label: 'Log', icon: CalendarIcon },
            { id: 'analytics', label: 'Analytics', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Content */}
        <main className="space-y-4 animate-in fade-in duration-300">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Readiness Gauge Card */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col items-center gap-5 text-center relative overflow-hidden transition-colors">
                <div className="relative flex items-center justify-center pt-2">
                  <div className="w-36 h-36 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                    <svg className="absolute inset-[-8px] rotate-[-90deg] w-[160px] h-[160px] pointer-events-none">
                      <circle
                        cx="80" cy="80" r="72"
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 72}
                        strokeDashoffset={2 * Math.PI * 72 * (1 - calculateReadiness() / 100)}
                        className="text-primary transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {calculateReadiness()}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                      Readiness
                    </span>
                  </div>
                </div>

                {wellnessLogs.length > 0 ? (
                  <div className="w-full h-[180px] flex items-center justify-center">
                    <WellnessRadarChart logs={wellnessLogs} />
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      No check-in recorded for today
                    </p>
                    <Button 
                      size="sm"
                      onClick={() => setIsWellnessDialogOpen(true)} 
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs px-5 h-8"
                    >
                      Start Daily Check-in
                    </Button>
                  </div>
                )}
              </div>

              {/* Personal Records Cards */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white px-1">
                  Personal Records
                </h3>
                {Object.keys(prs).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.entries(prs).map(([id, pr]: any) => (
                      <div key={id} className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                        <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 truncate mb-0.5">{pr.name}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {pr.value} <span className="text-xs text-slate-400 font-normal">KG</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No personal records logged yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'body' && (
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm min-h-[380px] flex flex-col items-center">
              <div className="w-full text-center space-y-1 mb-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Body Status & Visual Calibration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap affected body regions to review logged soreness and tension
                </p>
              </div>
              <div className="scale-90 origin-top">
                <PerformanceSnapshot clientId={activeAthleteId || currentUserId} />
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase text-slate-900 dark:text-white tracking-wider">
                  Protocol Timeline
                </h3>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-700 dark:text-slate-300" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-bold text-slate-900 dark:text-white px-2">
                    {format(selectedDate, 'MMM d')}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-700 dark:text-slate-300" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {assignedWorkouts.flatMap(w => {
                  const start = parseISO(w.start_date);
                  const diff = differenceInCalendarDays(startOfDay(selectedDate), startOfDay(start));
                  const workoutDay = w.program?.days?.find((d: any) => d.display_order === diff);
                  return workoutDay ? [{ ...workoutDay, programId: w.id }] : [];
                }).map((workout, idx) => (
                  <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="space-y-0.5">
                      <Badge className="bg-primary/10 text-primary border-none text-[9px] font-semibold uppercase px-2 py-0.5">
                        Prescribed Program
                      </Badge>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {workout.title}
                      </h4>
                    </div>

                    <div className="space-y-1.5">
                      {workout.items?.slice(0, 3).map((item: any, i: number) => (
                        <div key={item.id || i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                          <span className="font-medium truncate">{item[item.item_type]?.exercise?.name || `Exercise ${i+1}`}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">Prescribed</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      onClick={() => navigate(`/mobile/client/workout/${workout.id}`)}
                      className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs rounded-xl gap-1.5 shadow-sm"
                    >
                      <span>Start Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    Wellness Check-In Form
                  </h3>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <WellnessCheckinForm onComplete={fetchWellnessLogs} />
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                {currentUserId && <PerformanceAnalytics athleteId={activeAthleteId || currentUserId} />}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Wellness Sheet Overlay */}
      <Dialog open={isWellnessDialogOpen} onOpenChange={setIsWellnessDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 p-0 rounded-2xl overflow-hidden shadow-xl">
          <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              Daily Health Check-in
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 max-h-[75vh] overflow-y-auto">
            <WellnessCheckinForm onComplete={() => {
              setIsWellnessDialogOpen(false);
              fetchWellnessLogs();
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
