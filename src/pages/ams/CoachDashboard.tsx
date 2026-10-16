import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Download, CalendarIcon, Users, Filter, ChevronRight, Activity, Zap, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

import DashboardLayout from "@/components/layout/DashboardLayout";
import AthleteList from "@/components/ams/AthleteList";
import TeamOverviewChart from "@/components/ams/charts/TeamOverviewChart";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function CoachDashboard() {
  const { user, profile, roles } = useAuth();
  
  const userRoles = useMemo(() => {
    return [...(roles || []), profile?.role].filter(Boolean) as string[];
  }, [roles, profile]);

  const hasAmsAccess = useMemo(() => {
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isCoachOrScientist = userRoles.includes('coach') || userRoles.includes('sports_scientist') || profile?.ams_role === 'coach';

    let allowedList: string[] = [];
    if (profile?.allowed_consoles) {
      try {
        allowedList = typeof profile.allowed_consoles === 'string'
          ? JSON.parse(profile.allowed_consoles)
          : profile.allowed_consoles;
      } catch {
        allowedList = (profile.allowed_consoles as string).split(',').map((s) => s.trim());
      }
    }
    const hasConsoleGrant = allowedList.includes('ams') || allowedList.includes('coach') || allowedList.includes('sports_scientist');

    return isAdmin || isCoachOrScientist || hasConsoleGrant;
  }, [userRoles, profile]);

  if (profile && !hasAmsAccess) {
    return <Navigate to="/" replace />;
  }

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  const { data: athletes = [], isLoading } = useQuery<any[]>({
    queryKey: ["athletes_roster", selectedTeam],
    queryFn: async () => {
      const data = await apiFetch<any[]>('/ams/athletes', {
        params: { team: selectedTeam }
      });
      return Array.isArray(data) ? data : [];
    },
  });

  // Unique teams for filter
  const teams = useMemo(() => {
    return ["Badminton", "Cricket", "Football", "Tennis", "Athletics", "Swimming", "Basketball"];
  }, []);

  const handleExport = () => {
    if (!athletes || athletes.length === 0) return;
    const exportData = athletes.map((a: any) => ({
      "Athlete Name": `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.full_name || "Athlete",
      "Email": a.email || "",
      "Team / Sport": a.team || a.sport || "General",
      "Position": a.position || a.athlete_type || "N/A",
      "Recent Wellness Logs": (a.wellness_logs || []).length,
      "Training Sessions": (a.training_sessions || []).length,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AMS Team Roster");
    XLSX.writeFile(wb, `AMS_Athlete_Roster_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Good Night";
  };

  const allLogs = athletes ? athletes.flatMap((a: any) => a.wellness_logs || []) : [];

  return (
    <DashboardLayout role="coach">
      <div className="min-h-screen bg-[#f8fafc]">
        <AmsStaffNav />
        
        <main className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1600px] animate-in fade-in duration-700">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                {getGreeting()}, {profile?.first_name || "Coach"}
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border">
                 <div className="pl-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Viewing</div>
                 <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[180px] border-none shadow-none font-bold focus:ring-0">
                        <SelectValue placeholder="All Environments" />
                    </SelectTrigger>
                    <SelectContent className="glass border-none shadow-2xl">
                        <SelectItem value="all">All Environments</SelectItem>
                        {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                 </Select>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setSelectedTeam("all")}
                   className="text-[10px] font-black uppercase tracking-widest px-4 border-l rounded-none h-6"
                 >
                   Show All
                 </Button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="glass h-11 border-none shadow-sm font-bold gap-2 px-4"
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {date?.from ? (
                      format(date.from, "LLL dd") + " - " + (date.to ? format(date.to, "LLL dd") : "")
                    ) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass border-none shadow-2xl" align="end">
                  <Calendar
                    mode="range"
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              
              <Button variant="outline" className="glass h-11 border-none shadow-sm font-bold" onClick={handleExport} disabled={!athletes || athletes.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </header>

          <div className="space-y-8">
            <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
               {isLoading ? (
                 <div className="p-20 text-center flex flex-col items-center gap-4">
                    <Activity className="w-8 h-8 text-primary animate-pulse" />
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Athlete Data...</p>
                 </div>
               ) : (
                 <AthleteList athletes={athletes} dateRange={date} />
               )}
            </section>

            {/* Secondary Analytics Section */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
               <div className="xl:col-span-8">
                  <TeamOverviewChart logs={allLogs} />
               </div>
               <div className="xl:col-span-4 space-y-6">
                   <div className="glass-card rounded-3xl p-6">
                      <h3 className="font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                         <Zap className="w-4 h-4 text-amber-500" /> System Alerts
                      </h3>
                      <div className="space-y-4">
                         <AlertItem label="High Fatigue detected" count={2} color="text-amber-500" bg="bg-amber-500/10" />
                         <AlertItem label="Missed Workouts" count={5} color="text-rose-500" bg="bg-rose-500/10" />
                         <AlertItem label="New PRs Recorded" count={12} color="text-emerald-500" bg="bg-emerald-500/10" />
                      </div>
                   </div>
               </div>
            </section>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

function AlertItem({ label, count, color, bg }: { label: string, count: number, color: string, bg: string }) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
       <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", bg, color)}>
             {count}
          </div>
          <span className="text-sm font-bold text-slate-700">{label}</span>
       </div>
       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
    </div>
  )
}
