import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import { Users, Calendar, CreditCard, TrendingUp, Activity, AlertTriangle, Loader2, Bell, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import EmergencyAlertIcon from "@/components/admin/EmergencyAlertIcon";
import EmergencyResponseModal from "@/components/admin/EmergencyResponseModal";
import { AnnouncementsManager } from "@/components/shared/AnnouncementsManager";
import { Megaphone } from "lucide-react";

type WaitlistItem = Database['public']['Tables']['waitlist']['Row'] & {
    client: {
        first_name: string;
        last_name: string;
        is_vip: boolean | null;
        mobile_no: string;
    } | null;
};

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // Query for sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin-sessions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          service_type,
          therapist_id,
          client_id,
          therapist:profiles!sessions_therapist_id_fkey(first_name, last_name),
          client:clients!sessions_client_id_fkey(first_name, last_name)
        `)
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Query for today's sessions (schedule)
  const { data: todaysSessions, isLoading: todaysSessionsLoading } = useQuery({
    queryKey: ['admin-todays-sessions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          service_type,
          client:clients!sessions_client_id_fkey(first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .gte('scheduled_start', todayStart.toISOString())
        .lte('scheduled_start', todayEnd.toISOString())
        .order('scheduled_start', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Query for bills
  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ['admin-bills', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, amount, total, status, payment_method, created_at')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Query for refunds
  const { data: refunds, isLoading: refundsLoading } = useQuery({
    queryKey: ['admin-refunds', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select('id, amount, refund_mode, created_at')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Query for recent clients (for activity feed)
  const { data: recentClients, isLoading: recentClientsLoading } = useQuery({
    queryKey: ['admin-recent-clients', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // Query for recent bills (for activity feed)
  const { data: recentBills, isLoading: recentBillsLoading } = useQuery({
    queryKey: ['admin-recent-bills', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, amount, status, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'Paid')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  const { data: waitlistAlerts, isLoading: waitlistLoading } = useQuery({
    queryKey: ['admin-waitlist-alerts', organizationId],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('waitlist')
            .select(`
                id, 
                status, 
                preferred_date, 
                preferred_time_slot,
                client:clients(first_name, last_name, is_vip, mobile_no)
            `)
            .eq('organization_id', organizationId)
            .in('status', ['Waiting', 'Notified'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    enabled: !!organizationId
  });

  const metrics = useMemo(() => {
    if (!sessions || !bills) return null;

    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);
    
    let start, end;
    if (timeRange === 'daily') {
      start = startOfToday;
      end = endOfToday;
    } else if (timeRange === 'weekly') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const filteredSessions = sessions.filter(s => {
      if (!s.scheduled_start) return false;
      return isWithinInterval(parseISO(s.scheduled_start), { start, end });
    });

    const filteredBills = bills.filter(b => {
      if (!b.created_at || String(b.status).toLowerCase() !== 'paid') return false;
      return isWithinInterval(parseISO(b.created_at), { start, end });
    });

    const totalRevenue = filteredBills.reduce((acc, bill) => acc + (Number(bill.amount) || 0), 0);
    const uniqueClients = new Set(filteredSessions.map(s => s.client_id)).size;
    const totalSessions = filteredSessions.length;

    const cancelledOrMissed = filteredSessions.filter(s => s.status === 'Cancelled' || s.status === 'Missed').length;
    const noShowRate = totalSessions > 0 ? ((cancelledOrMissed / totalSessions) * 100).toFixed(1) : "0.0";

    // Consultant performance
    const consultantCounts: Record<string, { name: string, count: number }> = {};
    filteredSessions.forEach((s) => {
      const therapist = s.therapist;
      if (s.therapist_id && therapist) {
        if (!consultantCounts[s.therapist_id]) {
          consultantCounts[s.therapist_id] = {
            name: `Dr. ${therapist.first_name} ${therapist.last_name}`,
            count: 0
          };
        }
        consultantCounts[s.therapist_id].count += 1;
      }
    });

    const topConsultants = Object.values(consultantCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Today's breakdown
    const todaysBills = bills.filter(b => 
        b.status === 'Paid' && 
        b.created_at && 
        isWithinInterval(parseISO(b.created_at), { start: startOfToday, end: endOfToday })
    );
    const todaysRefunds = (refunds || []).filter(r => 
        r.created_at && 
        isWithinInterval(parseISO(r.created_at), { start: startOfToday, end: endOfToday })
    );

    const breakdown: Record<string, number> = {};
    todaysBills.forEach(b => {
        const mode = b.payment_method || 'Other';
        breakdown[mode] = (breakdown[mode] || 0) + Number(b.total);
    });
    todaysRefunds.forEach(r => {
        const mode = r.refund_mode || 'Other';
        breakdown[mode] = (breakdown[mode] || 0) - Number(r.amount);
    });

    return {
      totalRevenue,
      uniqueClients,
      totalSessions,
      noShowRate,
      topConsultants,
      breakdown
    };
  }, [sessions, bills, refunds, timeRange]);

    const waitingTodayCount = waitlistAlerts?.filter(w => w.preferred_date === format(new Date(), "yyyy-MM-dd") && w.status === 'Waiting').length || 0;
    const notifiedWaitlist = waitlistAlerts?.filter(w => w.status === 'Notified') || [];

    const stats = [
        { title: "Active Clients", value: metrics?.uniqueClients || 0, change: "in selected period", changeType: "neutral" as const, icon: Users },
        { title: "Today's Sessions", value: metrics?.totalSessions || 0, change: "in selected period", changeType: "neutral" as const, icon: Calendar },
        { title: "Revenue", value: `₹${(metrics?.totalRevenue || 0).toLocaleString()}`, change: "in selected period", changeType: "positive" as const, icon: CreditCard },
        { title: "Patients Waiting", value: waitingTodayCount, change: notifiedWaitlist.length > 0 ? `${notifiedWaitlist.length} Notified (Action)` : "No queue", changeType: (notifiedWaitlist.length > 0 ? "positive" : "neutral") as "positive" | "neutral", icon: Bell, className: notifiedWaitlist.length > 0 ? "animate-bounce" : "" },
    ];

  // Transform today's sessions for schedule
  const schedule = useMemo(() => {
    if (!todaysSessions) return [];
    return todaysSessions.map(session => {
      const clientName = session.client ? `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim() : 'Unknown';
      return {
        id: session.id,
        time: session.scheduled_start ? format(parseISO(session.scheduled_start), 'HH:mm') : '--:--',
        clientName,
        type: session.service_type || 'Session',
        status: (session.status === 'Scheduled' ? 'confirmed' : session.status === 'Completed' ? 'completed' : session.status === 'Cancelled' ? 'pending' : 'pending') as 'confirmed' | 'completed' | 'pending'
      };
    });
  }, [todaysSessions]);

  // Transform recent activities from sessions, clients, and bills
  const activities = useMemo(() => {
    const activityList: Array<{ id: string; title: string; description: string; time: string; type: 'client' | 'session' | 'payment' }> = [];

    // Add recent clients
    if (recentClients) {
      recentClients.forEach(client => {
        activityList.push({
          id: `client-${client.id}`,
          title: "New client registered",
          description: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'New client',
          time: formatDistanceToNow(parseISO(client.created_at), { addSuffix: true }),
          type: 'client'
        });
      });
    }

    // Add recent sessions (last 5 completed sessions)
    if (sessions) {
      const completedSessions = sessions
        .filter(s => s.status === 'Completed')
        .slice(0, 5);
      completedSessions.forEach(session => {
        const clientName = session.client ? `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim() : 'Client';
        const therapistName = session.therapist ? `Dr. ${session.therapist.first_name || ''} ${session.therapist.last_name || ''}`.trim() : 'Therapist';
        activityList.push({
          id: `session-${session.id}`,
          title: "Session completed",
          description: `${therapistName} with ${clientName}`,
          time: session.scheduled_start ? formatDistanceToNow(parseISO(session.scheduled_start), { addSuffix: true }) : '',
          type: 'session'
        });
      });
    }

    // Add recent paid bills
    if (recentBills) {
      recentBills.forEach(bill => {
        activityList.push({
          id: `bill-${bill.id}`,
          title: "Payment received",
          description: `₹${Number(bill.amount || 0).toLocaleString()}`,
          time: bill.created_at ? formatDistanceToNow(parseISO(bill.created_at), { addSuffix: true }) : '',
          type: 'payment'
        });
      });
    }

    // Sort by time (most recent first) and take top 10
    return activityList.slice(0, 10);
  }, [recentClients, sessions, recentBills]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Good Night";
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {getGreeting()}, {profile?.first_name || 'Admin'}
            </h1>
            <p className="text-muted-foreground mt-1">Overview of your organization's performance</p>
          </div>

          <div className="flex items-center gap-4">
            <button 
                onClick={() => setAnnouncementModalOpen(true)}
                className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 shadow-sm"
                title="Broadcast Announcement"
            >
                <Megaphone className="w-5 h-5" />
            </button>
            <EmergencyAlertIcon onClick={() => setEmergencyModalOpen(true)} />
            
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as 'daily' | 'weekly' | 'monthly')} className="w-[300px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {sessionsLoading || billsLoading || todaysSessionsLoading || recentClientsLoading || recentBillsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Revenue Chart Placeholder */}
                  <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 gradient-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-card-foreground">Revenue Trend ({timeRange})</h3>
                  <div className="flex items-center gap-1 text-xs text-success font-medium">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
                <div className="h-48 flex items-center justify-center rounded-lg bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Revenue chart will appear here</p>
                    <p className="text-xs">Connect data to visualize trends</p>
                  </div>
                </div>
              </div>

              {/* Today's Collection Card */}
              <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 gradient-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" /> Today's Collection
                      </h3>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">LIVE</span>
                  </div>
                  <div className="space-y-3">
                      {Object.keys(metrics?.breakdown || {}).length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground italic text-xs">
                              No collections recorded today.
                          </div>
                      ) : (
                          Object.entries(metrics?.breakdown || {}).map(([mode, amount]) => (
                              <div key={mode} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50">
                                  <span className="text-xs font-medium">{mode}</span>
                                  <span className={cn("text-xs font-bold", (amount as number) < 0 ? "text-rose-600" : "text-emerald-600")}>
                                      ₹{(amount as number).toLocaleString()}
                                  </span>
                              </div>
                          ))
                      )}
                      {Object.keys(metrics?.breakdown || {}).length > 0 && (
                          <div className="pt-2 border-t border-border flex justify-between items-center">
                              <span className="text-xs font-bold">Total Collection</span>
                              <span className="text-sm font-black text-primary">
                                  ₹{Object.values(metrics?.breakdown || {}).reduce((a, b) => (a as number) + (b as number), 0).toLocaleString()}
                              </span>
                          </div>
                      )}
                  </div>
              </div>

              {/* Waitlist Alerts Widget */}
              <div className="lg:col-span-2 rounded-xl border border-orange-200 bg-orange-50/30 p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold text-orange-900 flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Waitlist Alerts
                    </h3>
                    {notifiedWaitlist.length > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">ACTION</span>}
                </div>
                <div className="space-y-3">
                  {notifiedWaitlist.length === 0 ? (
                    <div className="text-center py-8">
                        <Clock className="w-10 h-10 mx-auto mb-2 text-orange-200" />
                        <p className="text-sm text-orange-800/60 italic">No notified patients pending follow-up.</p>
                    </div>
                  ) : (
                    notifiedWaitlist.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-white/60 border border-orange-200 shadow-sm">
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-orange-950">{w.client?.first_name} {w.client?.last_name}</p>
                          <p className="text-[10px] text-orange-800/70">{format(new Date(w.preferred_date), "MMM d")} @ {w.preferred_time_slot.substring(0, 5)}</p>
                        </div>
                        <a href={`tel:${w.client?.mobile_no}`} className="p-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                            <Activity className="w-3 h-3" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <ScheduleCard items={schedule} title="Today's Appointments" />
              <RecentActivity items={activities} />
            </div>
          </>
        )}
      </div>

      {organizationId && (
        <EmergencyResponseModal
          open={emergencyModalOpen}
          onOpenChange={setEmergencyModalOpen}
          organizationId={organizationId}
        />
      )}

      <AnnouncementsManager 
        open={announcementModalOpen}
        onOpenChange={setAnnouncementModalOpen}
      />
    </DashboardLayout>
  );
}
