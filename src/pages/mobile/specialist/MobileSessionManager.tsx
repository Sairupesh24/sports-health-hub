import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  Calendar, 
  Clock, 
  Play, 
  Square, 
  Plus, 
  ChevronRight,
  User,
  History,
  ClipboardList,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay, addDays, subDays, isSameDay } from "date-fns";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";

export default function MobileSessionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate a range of dates for the horizontal timeline (e.g., 3 days before and 10 days after)
  const timelineDates = useMemo(() => {
    const dates = [];
    for (let i = -3; i <= 10; i++) {
      dates.push(addDays(new Date(), i));
    }
    return dates;
  }, []);

  // Fetch sessions for the selected date
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["mobile-sessions", user?.id, selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!user) return [];
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const { data } = await supabase
        .from("sessions")
        .select(`
          *,
          client:clients(id, first_name, last_name, uhid, is_vip, sport),
          session_type:session_types(name)
        `)
        .eq("scientist_id", user.id)
        .gte("scheduled_start", dayStart.toISOString())
        .lte("scheduled_start", dayEnd.toISOString())
        .order("scheduled_start", { ascending: true });
      
      return data || [];
    },
    enabled: !!user
  });

  const handleStartSession = async (session: any) => {
    haptic.success();
    const { error } = await supabase
      .from("sessions")
      .update({ 
        status: "In Progress",
        actual_start: new Date().toISOString()
      })
      .eq("id", session.id);

    if (error) {
      toast({ title: "Failed to start session", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
      toast({ title: "Session Started" });
    }
  };

  return (
    <MobileSpecialistLayout title="Session Manager">
      <div className="space-y-8 pb-20">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between">
           <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Scheduled for</h3>
              <h4 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight mt-0.5">
                 {format(selectedDate, "MMMM yyyy")}
              </h4>
           </div>
           <Button 
            onClick={() => { haptic.light(); setIsBookModalOpen(true); }}
            className="rounded-full bg-primary text-white h-10 px-6 font-black italic shadow-lg shadow-primary/20 active:scale-95 transition-all"
           >
              <Plus className="w-4 h-4 mr-2" /> Plan Session
           </Button>
        </div>

        {/* Horizontal Timeline Picker */}
        <section className="overflow-x-auto no-scrollbar -mx-6 px-6">
           <div className="flex items-center gap-3 pb-2">
              {timelineDates.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => { haptic.light(); setSelectedDate(date); }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[56px] h-20 rounded-3xl transition-all duration-300",
                    isSameDay(date, selectedDate)
                      ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-105"
                      : "bg-white dark:bg-slate-900 border border-border/50 text-slate-500"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
                    {format(date, "EEE")}
                  </span>
                  <span className="text-lg font-black italic">
                    {format(date, "dd")}
                  </span>
                  {isSameDay(date, new Date()) && !isSameDay(date, selectedDate) && (
                    <div className="w-1 h-1 rounded-full bg-primary mt-1" />
                  )}
                </button>
              ))}
           </div>
        </section>

        {/* Sessions Timeline */}
        <div className="space-y-4">
           {isLoading ? (
             <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse" />)}
             </div>
           ) : sessions?.length === 0 ? (
             <div className="py-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
                   <Calendar className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">No sessions planned for today</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Tap 'Plan Session' to get started</p>
             </div>
           ) : (
             sessions?.map((session: any) => (
               <Card 
                key={session.id}
                className={cn(
                  "bg-white dark:bg-slate-900 border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden transition-all active:scale-[0.98]",
                  session.status === "In Progress" && "border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                )}
               >
                  <CardContent className="p-6">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-slate-400" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {format(parseISO(session.scheduled_start), "hh:mm a")}
                              </p>
                              <h4 className="font-black text-slate-900 dark:text-white italic">
                                {session.session_type?.name || "Standard Session"}
                              </h4>
                           </div>
                        </div>
                        <Badge className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-none",
                          session.status === "Scheduled" ? "bg-blue-500 text-white" :
                          session.status === "In Progress" ? "bg-emerald-500 text-white animate-pulse" :
                          "bg-slate-200 text-slate-500"
                        )}>
                          {session.status}
                        </Badge>
                     </div>

                     <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                              <User className="w-5 h-5 text-primary" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">Athlete</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {session.client?.first_name} {session.client?.last_name}
                              </p>
                           </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-1 rounded">
                          {session.client?.uhid}
                        </span>
                     </div>

                     <div className="flex gap-3">
                        {session.status === "Scheduled" && (
                          <button 
                            onClick={() => handleStartSession(session)}
                            className="flex-1 bg-emerald-500 text-white h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                             <Play className="w-4 h-4 fill-current" /> Start Session
                          </button>
                        )}
                        {session.status === "In Progress" && (
                          <button 
                            onClick={() => { haptic.warning(); setSelectedSession(session); }}
                            className="flex-1 bg-rose-500 text-white h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                          >
                             <Square className="w-4 h-4 fill-current" /> End Session
                          </button>
                        )}
                        <button 
                          onClick={() => { haptic.light(); setSelectedSession(session); }}
                          className="w-12 h-12 rounded-2xl border border-border/50 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                        >
                           <ClipboardList className="w-5 h-5" />
                        </button>
                     </div>
                  </CardContent>
               </Card>
             ))
           )}
        </div>

        {/* Stats Section */}
        <section className="grid grid-cols-2 gap-4">
           <Card className="bg-white dark:bg-slate-900 border-border/50 rounded-[2.5rem] p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                 <History className="w-5 h-5" />
              </div>
              <h5 className="text-2xl font-black italic text-slate-900 dark:text-white">{sessions?.filter(s => s.status === "Completed").length || 0}</h5>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Today</p>
           </Card>
           <Card className="bg-white dark:bg-slate-900 border-border/50 rounded-[2.5rem] p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                 <AlertCircle className="w-5 h-5" />
              </div>
              <h5 className="text-2xl font-black italic text-slate-900 dark:text-white">{sessions?.filter(s => s.status === "Scheduled").length || 0}</h5>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
           </Card>
        </section>
      </div>

      <SportsScientistBookSessionModal 
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
      />

      <SportsScientistSessionStatusModal 
        open={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSession(null)}
        session={selectedSession}
        onStatusUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
          setSelectedSession(null);
        }}
      />
    </MobileSpecialistLayout>
  );
}
