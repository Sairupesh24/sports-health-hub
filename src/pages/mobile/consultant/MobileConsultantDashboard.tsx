import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import MobileConsultantLayout from "@/components/layout/MobileConsultantLayout";
import { 
  Clock, 
  ChevronRight, 
  Sparkles,
  AlertTriangle,
  FileText,
  Zap,
  Plus,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useNavigate } from "react-router-dom";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import { format } from "date-fns";
import AdHocSessionModal from "@/components/consultant/AdHocSessionModal";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import { ConsultantBookSlotModal } from "@/components/consultant/ConsultantBookSlotModal";
import { toast } from "@/hooks/use-toast";

export default function MobileConsultantDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [greeting, setGreeting] = useState("Good Day");
  const [swipedSessionId, setSwipedSessionId] = useState<string | null>(null);
  const [adHocModalOpen, setAdHocModalOpen] = useState(false);
  const [soapModalOpen, setSoapModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Swipe logic state
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["mobile-consultant-dashboard", profile?.id],
    queryFn: async () => {
      const response = await apiFetch<any>("/clinical/dashboard/stats");
      const isCheckedInStatus = (statusStr: string) => {
        const s = (statusStr || "").toLowerCase().trim();
        return s === "checked in" || s === "checked-in" || s === "checkedin" || s === "in progress" || s === "completed";
      };

      const isCancelledStatus = (statusStr: string) => {
        const s = (statusStr || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled";
      };

      // Format sessions for our view
      const formattedSessions = (response.todaySessions || []).map((session: any) => {
        const checkedIn = isCheckedInStatus(session.status);
        const isCancelled = isCancelledStatus(session.status);
        const rawName = `${session.first_name || ""} ${session.last_name || ""}`.trim() || session.guest_name || "Client";

        return {
          ...session,
          id: session.id,
          time: format(new Date(session.scheduled_start), "HH:mm"),
          clientName: rawName,
          type: session.service_type,
          status: session.status,
          clientId: session.client_id,
          isVIP: session.is_vip,
          isCheckedIn: checkedIn,
          isCancelled: isCancelled,
          hasBillingWarning: Math.random() > 0.7, // Mocking outstanding balance warning
          enquiryNotes: session.enquiry_notes || "Initial complaint: Lower back pain during squats.",
          adminRemarks: session.admin_remarks || "Requested female therapist if possible.",
          rawSession: session
        };
      });

      return {
        ...response,
        todaySessions: formattedSessions
      };
    },
    enabled: !!profile?.id,
    staleTime: 30000,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); 
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (sessionId: string) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isRightSwipe) {
      setSwipedSessionId(sessionId);
      haptic.light();
    } else if (isLeftSwipe && swipedSessionId === sessionId) {
      setSwipedSessionId(null);
      haptic.light();
    }
  };

  const handleSessionClick = (session: any) => {
    if (session.isCancelled || session.status === "Cancelled" || session.status === "cancelled") {
      haptic.heavy();
      toast({
        variant: "destructive",
        title: "Session Cancelled",
        description: "This session has been cancelled by Admin/FOE."
      });
      return;
    }

    if (!session.isCheckedIn) {
      haptic.heavy();
      toast({
        variant: "destructive",
        title: "Check-in Required",
        description: "Client has not checked in yet. SOAP notes can only be opened and filled after the client is checked in by Admin/FOE."
      });
      return;
    }
    haptic.light();
    setSelectedSession(session.rawSession);
    setSelectedClientId(session.clientId);
    setSoapModalOpen(true);
  };

  if (isLoading) {
    return (
      <MobileConsultantLayout title="Dashboard">
        <div className="space-y-8 pb-20">
          <div className="space-y-4">
             <div className="h-10 w-48 bg-slate-100 dark:bg-slate-900 rounded-lg animate-pulse" />
          </div>
          <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse" />
        </div>
      </MobileConsultantLayout>
    );
  }

  const activeSessions = dashboardData?.todaySessions?.filter((s: any) => s.status !== 'Completed') || [];

  return (
    <MobileConsultantLayout title="Dashboard">
      <div className="space-y-6 pb-20">
        
        {/* Welcome & Geofence Section */}
        <section className="relative overflow-hidden pt-2">
           <div className="relative z-10">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tight leading-none">
                {greeting}, <span className="text-primary">{profile?.first_name || 'Doc'}</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-2 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {profile?.profession} ON-CALL
              </p>
           </div>

          <div className="bg-white dark:bg-[#0F172A] p-5 mt-4 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-5 dark:opacity-10 pointer-events-none">
              <Sparkles className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <AttendanceMarker />
            </div>
          </div>
        </section>

        {/* Quick Action Buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => { haptic.light(); setIsBookModalOpen(true); }}
            className="w-full flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-[2rem] px-5 py-4 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Plus className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm uppercase tracking-wider leading-none">Book Slot</p>
                <p className="text-[10px] font-bold text-white/70 mt-1 uppercase tracking-widest">Schedule Client</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 group-active:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => { haptic.light(); setAdHocModalOpen(true); }}
            className="w-full flex items-center justify-between gap-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-[2rem] px-5 py-4 shadow-xl shadow-amber-500/30 active:scale-95 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm uppercase tracking-wider leading-none">Start Ad-Hoc Session</p>
                <p className="text-[10px] font-bold text-white/70 mt-1 uppercase tracking-widest">Walk-in / Unscheduled</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 group-active:translate-x-1 transition-transform" />
          </button>
        </section>

        {/* Treatment Queue */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <Clock className="w-4 h-4 text-primary" /> Treatment Queue
              </h3>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest border-none bg-primary/10 text-primary">
                {activeSessions.length} Pending
              </Badge>
           </div>

           <div className="flex flex-col gap-3">
              {activeSessions.length === 0 ? (
                <div className="w-full py-8 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-muted-foreground opacity-70">
                   <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No pending sessions</p>
                </div>
               ) : (
                activeSessions.map((session: any) => (
                  <div 
                    key={session.id}
                    className="relative overflow-hidden rounded-[2rem] bg-slate-100 dark:bg-slate-800"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(session.id)}
                  >
                    {/* Drawer Background (Revealed on Swipe) */}
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 p-4 flex gap-4 text-xs">
                      <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-inner overflow-hidden">
                        <p className="font-bold text-slate-500 mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> Enquiry</p>
                        <p className="text-slate-700 dark:text-slate-300 line-clamp-3">{session.enquiryNotes}</p>
                      </div>
                      <div className="flex-1 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-2xl shadow-inner overflow-hidden border border-rose-100 dark:border-rose-900/50">
                        <p className="font-bold text-rose-500 mb-1">Admin Remarks</p>
                        <p className="text-rose-700 dark:text-rose-300 line-clamp-3">{session.adminRemarks}</p>
                      </div>
                    </div>

                    {/* Main Card */}
                    <div 
                      onClick={() => handleSessionClick(session)}
                      className={cn(
                        "relative bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-border/50 shadow-sm flex items-center gap-3 transition-transform duration-300 ease-out z-10 min-h-[90px]",
                        session.isVIP && "border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]",
                        swipedSessionId === session.id ? "translate-x-[85%]" : "translate-x-0"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center w-14 shrink-0 border-r border-slate-100 dark:border-slate-800 pr-3">
                        <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{session.time}</span>
                      </div>

                      <div className="flex-1 overflow-hidden pl-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-black truncate text-[16px]",
                            session.isCancelled ? "text-rose-600 line-through opacity-75" : session.isCheckedIn ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 font-normal"
                          )}>
                            {session.clientName}
                          </h4>
                          {session.isVIP && session.isCheckedIn && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-[9px] uppercase font-black px-1.5 py-0 border-none h-4">VIP</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                            {session.type}
                          </p>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-4 border-none",
                            session.isCancelled
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                              : session.isCheckedIn 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            {session.isCancelled ? "Cancelled" : session.isCheckedIn ? "Checked In" : "Awaiting Check-in"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {session.hasBillingWarning && (
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
           </div>
        </section>
      </div>

      <ConsultantBookSlotModal
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["mobile-consultant-dashboard"] })}
      />

      <AdHocSessionModal
        open={adHocModalOpen}
        onOpenChange={setAdHocModalOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["mobile-consultant-dashboard"] })}
      />

      <SOAPNoteModal
        open={soapModalOpen}
        onOpenChange={setSoapModalOpen}
        session={selectedSession}
        clientId={selectedClientId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["mobile-consultant-dashboard"] })}
      />
    </MobileConsultantLayout>
  );
}
