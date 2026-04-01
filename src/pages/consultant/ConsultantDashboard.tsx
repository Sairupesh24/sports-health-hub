import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import InjuriesWidget from "@/components/dashboard/InjuriesWidget";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import AdHocSessionModal from "@/components/consultant/AdHocSessionModal";
import { Users, Calendar, ClipboardList, TrendingUp, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, addDays, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const stats = [
  { title: "Assigned Clients", value: 24, change: "+3 this week", changeType: "positive" as const, icon: Users },
  { title: "Today's Sessions", value: 6, change: "2 remaining", changeType: "neutral" as const, icon: Calendar },
  { title: "Sessions This Month", value: 42, change: "+15% vs last month", changeType: "positive" as const, icon: ClipboardList },
  { title: "Avg. Improvement", value: "18%", change: "Pain score reduction", changeType: "positive" as const, icon: TrendingUp },
];

interface SessionData {
  id: string;
  scheduled_start: string;
  status: "Planned" | "Completed" | "Missed" | "Rescheduled";
  service_type: string;
  client: {
    first_name: string;
    last_name: string;
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
    rawSession?: any;
  }[]>([]);

  const [soapModalOpen, setSoapModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [adHocModalOpen, setAdHocModalOpen] = useState(false);

  const fetchTodaySessions = async () => {
    if (!profile?.id) return;

    const today = new Date();
    // Broaden search to generously catch UTC shifts for the "current" day
    const start = subDays(today, 1).toISOString();
    const end = addDays(today, 1).toISOString();

    const { data, error } = await supabase
      .from("sessions")
      .select(`
                    id, 
                    client_id,
                    scheduled_start, 
                    status, 
                    service_type,
                    client:clients(first_name, last_name, is_vip),
                    physio_session_details(*)
                `)
      .eq("therapist_id", profile.id)
      .gte("scheduled_start", start)
      .lte("scheduled_start", end)
      .order("scheduled_start", { ascending: true });

    if (!error && data) {
      const formatted = (data as unknown as any[]).map(session => ({
        id: session.id,
        time: format(new Date(session.scheduled_start), "HH:mm"),
        clientName: `${session.client?.first_name || ""} ${session.client?.last_name || ""}`.trim(),
        type: session.service_type,
        status: session.status === "Completed" ? "completed" as const :
          session.status === "Planned" ? "confirmed" as const : "pending" as const,
        clientId: session.client_id,
        isVIP: session.client?.is_vip,
        rawSession: session
      }));
      setLiveSchedule(formatted);
    }
  };

  const fetchWaitlistCount = async () => {
    if (!profile?.id || !profile?.organization_id) return;
    
    const today = format(new Date(), "yyyy-MM-dd");
    const { count, error } = await (supabase as any)
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .eq("preferred_date", today)
      .eq("status", "Waiting")
      .or(`therapist_id.eq.${profile.id},therapist_id.is.null`);

    if (!error) {
      setWaitlistCount(count || 0);
    }
  };

  useEffect(() => {
    fetchTodaySessions();
    fetchWaitlistCount();
  }, [profile?.id]);

  return (
    <DashboardLayout role="consultant">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Good Morning, {profile?.first_name ? `Dr. ${profile.first_name}` : 'Doctor'}
          </h1>
          <p className="text-muted-foreground mt-1">
            You have {liveSchedule.filter(s => s.status !== 'completed').length} sessions remaining today
          </p>
        </div>

        {/* Top Metrics Map */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Assigned Clients" value={24} change="+3 this week" changeType="positive" icon={Users} />
          <StatCard title="Today's Sessions" value={liveSchedule.length} change={`${liveSchedule.filter(s => s.status !== 'completed').length} remaining`} changeType="neutral" icon={Calendar} />
          <StatCard title="Pending Waitlist" value={waitlistCount} change={waitlistCount > 0 ? "Potential fills" : "No queue"} changeType={waitlistCount > 0 ? "positive" : "neutral"} icon={Clock} className={waitlistCount > 0 ? "animate-pulse" : ""} />
          <StatCard title="Sessions This Month" value={42} change="+15% vs last month" changeType="positive" icon={ClipboardList} />
          <StatCard title="Avg. Improvement" value="18%" change="Pain score reduction" changeType="positive" icon={TrendingUp} />
        </div>

        {/* Main Middle Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left side: Schedule & Load (12 cols) */}
          <div className="lg:col-span-12 flex flex-col gap-6">
            <ScheduleCard
              items={liveSchedule}
              title="My Clinic Schedule Today"
              onItemClick={(item) => {
                // Remove the strict 'completed' block so they can view/edit notes!
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
          <div className="grid grid-cols-3 gap-3">
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
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all text-center group"
              >
                <action.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium text-card-foreground">{action.label}</p>
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
        onSuccess={fetchTodaySessions}
      />

      <AdHocSessionModal
        open={adHocModalOpen}
        onOpenChange={setAdHocModalOpen}
        onSuccess={fetchTodaySessions}
      />
    </DashboardLayout>
  );
}
