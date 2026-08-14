import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import InjuriesWidget from "@/components/dashboard/InjuriesWidget";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import AdHocSessionModal from "@/components/consultant/AdHocSessionModal";
import { ConsultantBookSlotModal } from "@/components/consultant/ConsultantBookSlotModal";
import { Users, Calendar, ClipboardList, TrendingUp, Clock, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { format, subDays, addDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import EmergencyLeaveModal from "@/components/shared/EmergencyLeaveModal";
import { cn } from "@/lib/utils";


interface SessionData {
  id: string;
  scheduled_start: string;
  status: "Planned" | "Completed" | "Missed" | "Rescheduled";
  service_type: string;
  client: {
    first_name: string;
    last_name: string;
    is_vip?: boolean;
  };
}

export default function ConsultantDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [waitlistCount, setWaitlistCount] = useState(0);
  const [liveSchedule, setLiveSchedule] = useState<{
    id: string;
    time: string;
    clientName: string;
    type: string;
    status: "pending" | "confirmed" | "completed";
    clientId?: string;
    rawSession?: Database['public']['Tables']['sessions']['Row'];
  }[]>([]);
  const [assignedClientsCount, setAssignedClientsCount] = useState(0);
  const [monthSessionsCount, setMonthSessionsCount] = useState(0);
  const [avgImprovement, setAvgImprovement] = useState("--");

  const [soapModalOpen, setSoapModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Database['public']['Tables']['sessions']['Row'] | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [adHocModalOpen, setAdHocModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const isAdmin = profile.role === "admin" || (profile as any).roles?.includes("admin");
    const isNutritionist =
      (profile.profession || "").toLowerCase().includes("nutrition") ||
      (profile.ams_role || "").toLowerCase().includes("nutrition");

    if (isNutritionist && !isAdmin && profile.role === "nutritionist") {
      navigate("/nutritionist", { replace: true });
    }
  }, [profile, navigate]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    try {
      const data = await apiFetch<any>('/clinical/dashboard/stats');
      
      const isCheckedInStatus = (statusStr: string) => {
        const s = (statusStr || "").toLowerCase().trim();
        return s === "checked in" || s === "checked-in" || s === "checkedin" || s === "in progress" || s === "completed";
      };

      const isCancelledStatus = (statusStr: string) => {
        const s = (statusStr || "").toLowerCase().trim();
        return s === "cancelled" || s === "canceled";
      };

      const formatted = (data.todaySessions || []).map((session: any) => {
        const checkedIn = isCheckedInStatus(session.status);
        const isCancelled = isCancelledStatus(session.status);
        const rawName = `${session.first_name || ""} ${session.last_name || ""}`.trim() || session.guest_name || "Client";

        return {
          id: session.id,
          time: format(new Date(session.scheduled_start), "HH:mm"),
          clientName: rawName,
          type: session.service_type,
          status: isCancelled ? "cancelled" as const :
            session.status === "Completed" ? "completed" as const :
            checkedIn ? "confirmed" as const : "pending" as const,
          clientId: session.client_id,
          isVIP: session.is_vip,
          isCheckedIn: checkedIn,
          isCancelled: isCancelled,
          rawSession: {
            ...session,
            client: {
              first_name: session.first_name || session.guest_name || "Guest",
              last_name: session.last_name || "",
              is_vip: session.is_vip
            }
          }
        };
      });
      
      setLiveSchedule(formatted);
      setWaitlistCount(data.waitlistCount || 0);
      setAssignedClientsCount(data.assignedClientsCount || 0);
      setMonthSessionsCount(data.monthSessionsCount || 0);
      setAvgImprovement("75%"); // Placeholder or calculated server-side
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  const profileId = profile?.id;

  useEffect(() => {
    fetchDashboardData();
  }, [profileId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Good Night";
  };

  return (
    <DashboardLayout role="consultant">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <AttendanceMarker />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {getGreeting()}, {profile?.first_name ? `${profile.first_name}` : (profile?.profession || 'Staff')}
            </h1>
            <p className="text-sm font-medium text-primary/80 mb-1">{profile?.profession || 'Specialist Console'}</p>
            <p className="text-muted-foreground mt-1">
              You have {liveSchedule.filter(s => (s.status as string) !== 'completed' && (s.status as string) !== 'cancelled').length} sessions remaining today
            </p>
          </div>
        </div>

        {/* Top Metrics Map */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard title="Assigned Clients" value={assignedClientsCount} change={assignedClientsCount > 0 ? "Active client portfolio" : "No assigned clients"} changeType="positive" icon={Users} />
          <StatCard title="Today's Sessions" value={liveSchedule.length} change={`${liveSchedule.filter(s => (s.status as string) !== 'completed' && (s.status as string) !== 'cancelled').length} remaining`} changeType="neutral" icon={Calendar} />
          <StatCard title="Pending Waitlist" value={waitlistCount} change={waitlistCount > 0 ? "Potential fills" : "No queue"} changeType={waitlistCount > 0 ? "positive" : "neutral"} icon={Clock} className={waitlistCount > 0 ? "animate-pulse" : ""} />
          <StatCard title="Sessions This Month" value={monthSessionsCount} change="Completed so far" changeType="positive" icon={ClipboardList} />
          <StatCard title="Avg. Improvement" value={avgImprovement} change="Pain score reduction" changeType="positive" icon={TrendingUp} />
        </div>

        {/* Main Middle Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left side: Schedule & Load (12 cols) */}
          <div className="lg:col-span-12 flex flex-col gap-6">
            <ScheduleCard
              items={liveSchedule}
              title="Treatment Queue"
              onItemClick={(item: any) => {
                if (item.isCancelled || item.status === "cancelled") {
                  toast({
                    variant: "destructive",
                    title: "Session Cancelled",
                    description: "This session has been cancelled by Admin/FOE."
                  });
                  return;
                }

                if (!item.isCheckedIn) {
                  toast({
                    variant: "destructive",
                    title: "Check-in Required",
                    description: "Client has not checked in yet. SOAP notes can only be opened and filled after the client is checked in by Admin/FOE."
                  });
                  return;
                }

                if (item.rawSession && item.clientId) {
                  setSelectedSession(item.rawSession);
                  setSelectedClientId(item.clientId);
                  setSoapModalOpen(true);
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not load session details. Missing client ID."
                  });
                }
              }}
            />
            {/* Extended width for active rehab cases since AMS was removed */}
            <div className="grid grid-cols-1 gap-6">
              <InjuriesWidget />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5 gradient-card mt-6">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Start Session", icon: ClipboardList, action: () => {
                  setAdHocModalOpen(true);
                }
              },
              {
                label: "View Schedule", icon: Calendar, action: () => {
                  navigate("/consultant/schedule");
                }
              },
              {
                label: "Client List", icon: Users, action: () => {
                  navigate("/consultant/clients");
                }
              },
              {
                label: "Emergency Leave", icon: AlertCircle, action: () => {
                  setEmergencyModalOpen(true);
                },
                isCritical: true
              },
            ].map((action: any) => (
              <button
                key={action.label}
                onClick={action.action}
                className={cn(
                  "p-4 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all text-center group",
                  action.isCritical && "bg-destructive/5 border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40"
                )}
              >
                <action.icon className={cn(
                  "w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors",
                  action.isCritical && "text-destructive group-hover:text-destructive"
                )} />
                <p className={cn(
                  "text-sm font-medium text-card-foreground",
                  action.isCritical && "text-destructive font-bold"
                )}>{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <SOAPNoteModal
        open={soapModalOpen}
        onOpenChange={setSoapModalOpen}
        session={selectedSession}
        clientId={selectedClientId}
        onSuccess={fetchDashboardData}
      />

      <ConsultantBookSlotModal
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
        onSuccess={fetchDashboardData}
      />

      <AdHocSessionModal
        open={adHocModalOpen}
        onOpenChange={setAdHocModalOpen}
        onSuccess={fetchDashboardData}
      />

      <EmergencyLeaveModal
        open={emergencyModalOpen}
        onOpenChange={setEmergencyModalOpen}
      />
    </DashboardLayout>
  );
}
