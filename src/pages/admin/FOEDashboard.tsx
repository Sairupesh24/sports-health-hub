import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { 
    Users, 
    Calendar, 
    Clock, 
    AlertCircle, 
    Bell, 
    Search, 
    CheckCircle2, 
    XCircle,
    UserPlus,
    Phone,
    ArrowRight,
    MapPin,
    Activity,
    CreditCard,
    Plus,
} from "lucide-react";
import { LogEnquiryModal } from "@/components/admin/LogEnquiryModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    startOfDay, 
    endOfDay, 
    format, 
    parseISO, 
    isSameDay,
    getDay
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIPBadge } from "@/components/ui/VIPBadge";

const DAYS_OF_WEEK = [
    { id: 0, label: "Sunday" },
    { id: 1, label: "Monday" },
    { id: 2, label: "Tuesday" },
    { id: 3, label: "Wednesday" },
    { id: 4, label: "Thursday" },
    { id: 5, label: "Friday" },
    { id: 6, label: "Saturday" },
];

export default function FOEDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // 1. Today's Sessions & Appointments Query
  const { data: todaysSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['foe-todays-sessions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          service_type,
          therapist:profiles!sessions_therapist_id_fkey(first_name, last_name),
          client:clients!sessions_client_id_fkey(id, first_name, last_name, uhid, is_vip, mobile_no)
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

  // 2. Waitlist Query
  const { data: waitlistItems, isLoading: waitlistLoading } = useQuery({
    queryKey: ['foe-waitlist', organizationId],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('waitlist')
            .select(`
                id, 
                status, 
                preferred_date, 
                preferred_time_slot,
                created_at,
                client:clients(id, first_name, last_name, is_vip, mobile_no, uhid)
            `)
            .eq('organization_id', organizationId)
            .in('status', ['Waiting', 'Notified'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    enabled: !!organizationId
  });

  // 3. Unentitled Sessions Query
  const { data: unentitledSessions, isLoading: unentitledLoading } = useQuery({
    queryKey: ['foe-unentitled-sessions', organizationId],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select(`
                id,
                status,
                scheduled_start,
                service_type,
                client:clients(id, first_name, last_name, is_vip, uhid)
            `)
            .eq('organization_id', organizationId)
            .eq('is_unentitled', true)
            .neq('status', 'Cancelled')
            .order('scheduled_start', { ascending: false })
            .limit(10);
        if (error) throw error;
        return data;
    },
    enabled: !!organizationId
  });

  // 4. Consultant Availability Query
  const { data: consultants, isLoading: consultantsLoading } = useQuery({
    queryKey: ['foe-consultant-availability', organizationId],
    queryFn: async () => {
        // Skip user_roles lookup — query profiles directly filtered by org
        // This is more reliable since user_roles may not always have all clinical staff
        const { data: profiles, error: pError } = await supabase
            .from("profiles")
            .select(`
                id, 
                first_name, 
                last_name,
                profession,
                consultant_availability(*)
            `)
            .eq("organization_id", organizationId)
            .eq("is_approved", true)
            .not("profession", "is", null)
            .not("profession", "eq", "");
            
        if (pError) throw pError;
        if (!profiles || profiles.length === 0) return [];

        const profileIds = profiles.map(p => p.id);

        // Fetch unresolved alerts separately to avoid join cache issues
        const { data: alerts, error: aError } = await (supabase as any)
            .from("emergency_alerts")
            .select("id, staff_id, status")
            .in("staff_id", profileIds)
            .eq("status", "unresolved");

        if (aError) {
          console.error("Alerts fetch error:", aError);
          return profiles.map(p => ({ ...p, emergency_alerts: [] }));
        }

        return profiles.map(profile => ({
            ...profile,
            emergency_alerts: alerts?.filter(a => a.staff_id === profile.id) ?? []
        }));
    },
    enabled: !!organizationId
  });

  // 5. Dunning Alerts Query
  const { data: dunningSubscriptions } = useQuery({
    queryKey: ['foe-dunning-alerts', organizationId],
    queryFn: async () => {
        const { data, error } = await supabase
            .from('subscriptions')
            .select(`
                id, 
                status, 
                dunning_step,
                client:clients(id, first_name, last_name, uhid)
            `)
            .eq('organization_id', organizationId)
            .in('status', ['Past Due', 'Suspended'])
            .order('dunning_step', { ascending: false });
        if (error) throw error;
        return data;
    },
    enabled: !!organizationId
  });

  // Derived Values
  const availableToday = useMemo(() => {
    const dayOfToday = getDay(new Date());
    return consultants?.filter(c => 
        c.consultant_availability?.some((a: any) => a.day_of_week === dayOfToday)
    ) || [];
  }, [consultants]);

  const availabilityForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfSelected = getDay(parseISO(selectedDate));
    return consultants?.map(c => {
        const schedule = c.consultant_availability?.find((a: any) => a.day_of_week === dayOfSelected);
        const hasEmergency = c.emergency_alerts?.some((a: any) => a.status === 'unresolved');
        return {
            ...c,
            is_available: !!schedule,
            schedule: schedule,
            has_emergency: hasEmergency
        };
    }) || [];
  }, [consultants, selectedDate]);

  const stats: { title: string; value: string | number; icon: any; change: string; changeType: "neutral" | "negative" | "positive" }[] = [
    { title: "Today's Appts", value: todaysSessions?.length || 0, icon: Calendar, change: "Planned Sessions", changeType: "neutral" },
    { title: "Waitlist Queue", value: waitlistItems?.length || 0, icon: Bell, change: "Patients Waiting", changeType: (waitlistItems?.length || 0) > 5 ? "negative" : "neutral" },
    { title: "Unentitled", value: unentitledSessions?.length || 0, icon: AlertCircle, change: "Requires Billing", changeType: "negative" },
    { title: "Staff On-Duty", value: availableToday.length, icon: Users, change: "Consultants Today", changeType: "positive" },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Good Night";
  };

  return (
    <DashboardLayout role="foe">
      <div className="space-y-6 pb-12">
        {/* Dunning Sticky Alerts */}
        {dunningSubscriptions && dunningSubscriptions.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
            {dunningSubscriptions.map((sub: any) => (
              <div 
                key={sub.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border shadow-lg border-l-8",
                  sub.status === 'Suspended' 
                    ? "bg-rose-50 border-rose-200 border-l-rose-600" 
                    : "bg-amber-50 border-amber-200 border-l-amber-600"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                    sub.status === 'Suspended' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={cn("font-black text-sm", sub.status === 'Suspended' ? "text-rose-950" : "text-amber-950")}>
                      {sub.status === 'Suspended' ? "MEMBERSHIP SUSPENDED" : "PAYMENT OVERDUE"}
                    </h3>
                    <p className="text-xs font-bold opacity-70">
                      {sub.client?.first_name} {sub.client?.last_name} ({sub.client?.uhid}) — {sub.status === 'Suspended' ? "Service access blocked due to non-payment." : `Payment reminder sent (Step ${sub.dunning_step})`}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className={cn(
                    "font-bold rounded-xl",
                    sub.status === 'Suspended' ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={() => navigate(`/admin/clients/${sub.client?.id}?tab=billing`)}
                >
                  Resolve Billing
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              {getGreeting()}, {profile?.first_name || 'Team'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">FOE Operations Hub — Daily management console</p>
          </div>
          <div className="bg-muted/30 px-4 py-2 rounded-xl border flex items-center gap-3">
             <Clock className="w-4 h-4 text-primary animate-pulse" />
             <span className="text-sm font-bold">{format(new Date(), "PPP")}</span>
          </div>
          <Button 
            onClick={() => setIsLogModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg gap-2"
          >
            <Plus className="w-4 h-4" /> Quick Log Enquiry
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} className="animate-in fade-in slide-in-from-bottom-2 duration-500" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Column: Schedule & Waitlist */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Today's Schedule Card */}
            <Card className="border-none shadow-premium overflow-hidden">
              <CardHeader className="bg-muted/10 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Today's Appointment Log
                </CardTitle>
                <CardDescription>Real-time view of all scheduled clinical activities</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  {sessionsLoading ? (
                    <div className="p-12 flex justify-center"><Activity className="animate-spin text-primary" /></div>
                  ) : !todaysSessions || todaysSessions.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic">No appointments scheduled for today.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {todaysSessions.map((session: any) => (
                        <div key={session.id} className="p-4 hover:bg-muted/10 transition-colors flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[60px] bg-primary/5 py-2 px-1 rounded-lg border border-primary/10">
                              <span className="block text-xs font-black text-primary uppercase">{format(parseISO(session.scheduled_start), "hh:mm")}</span>
                              <span className="block text-[10px] opacity-60 font-bold uppercase">{format(parseISO(session.scheduled_start), "aa")}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{session.client?.first_name} {session.client?.last_name}</span>
                                    <VIPBadge isVIP={session.client?.is_vip} />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">UHID: {session.client?.uhid}</span>
                                    <span>•</span>
                                    <span className="font-medium text-primary/80">{session.service_type}</span>
                                </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Consultant</p>
                                <p className="text-xs font-semibold">Dr. {session.therapist?.first_name} {session.therapist?.last_name}</p>
                            </div>
                            <Badge className={`uppercase text-[10px] font-black px-2 py-0.5 ${
                                session.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                session.status === 'Checked In' ? 'bg-purple-100 text-purple-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {session.status}
                            </Badge>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => navigate(`/admin/clients/${session.client?.id}?tab=sessions`)}
                            >
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Appointment Waitlist Card */}
            <Card className="border-none shadow-premium overflow-hidden">
              <CardHeader className="bg-orange-50/30 border-b border-orange-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-950 font-black">
                  <Bell className="w-5 h-5 text-orange-600 animate-pulse" />
                  Appointment Waitlist
                </CardTitle>
                <CardDescription className="text-orange-900/60">Patients waiting for cancellations or preferred slots</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px]">
                  {waitlistLoading ? (
                    <div className="p-12 flex justify-center"><Activity className="animate-spin text-orange-500" /></div>
                  ) : !waitlistItems || waitlistItems.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic text-sm">Waitlist is currently empty.</div>
                  ) : (
                    <div className="divide-y divide-orange-100/50">
                      {waitlistItems.map((item: any) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-orange-50/20 transition-all group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700">
                                <Users className="w-5 h-5" />
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                    <span 
                                        className="font-bold text-orange-950 hover:text-orange-700 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/admin/clients/${item.client?.id}?tab=entitlements`)}
                                    >
                                        {item.client?.first_name} {item.client?.last_name}
                                    </span>
                                    <VIPBadge isVIP={item.client?.is_vip} />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-orange-900/60 mt-0.5">
                                    <span className="bg-white/50 px-1.5 py-0.5 rounded border border-orange-100 text-[10px] font-bold">UHID: {item.client?.uhid}</span>
                                    <span>•</span>
                                    <span className="font-bold uppercase text-[9px] tracking-widest">{item.preferred_time_slot.substring(0, 5)} Slot</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <Badge className={`uppercase text-[9px] font-black tracking-tighter ${
                                item.status === 'Notified' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                             }`}>
                                {item.status}
                             </Badge>
                             <a href={`tel:${item.client?.mobile_no}`}>
                                <Button size="sm" variant="outline" className="h-8 gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold text-xs">
                                    <Phone className="w-3 h-3" /> Call
                                </Button>
                             </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Unentitled & Availability */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Unentitled Sessions Card */}
            <Card className="border-none shadow-premium overflow-hidden bg-rose-50/20 border-l-4 border-l-rose-500">
              <CardHeader className="pb-3 px-5 pt-5">
                <CardTitle className="text-lg flex items-center gap-2 text-rose-950">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Unentitled Sessions
                </CardTitle>
                <CardDescription className="text-rose-900/60 font-medium">Review and resolve billing discrepancies</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                 <ScrollArea className="h-[300px] px-2">
                    {unentitledLoading ? (
                        <div className="py-10 flex justify-center"><Activity className="animate-spin text-rose-500" /></div>
                    ) : !unentitledSessions || unentitledSessions.length === 0 ? (
                        <div className="py-10 text-center text-xs text-rose-900/40 italic">No unentitled sessions requiring attention.</div>
                    ) : (
                        <div className="space-y-2">
                            {unentitledSessions.map((session: any) => (
                                <div key={session.id} className="p-3 bg-white/60 border border-rose-100 rounded-xl flex flex-col gap-2 group hover:border-rose-300 transition-all">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-rose-950">{session.client?.first_name} {session.client?.last_name}</span>
                                        <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-tighter h-4">Unpaid</Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-rose-900/60 uppercase tracking-widest">
                                        <span>{session.service_type}</span>
                                        <span>{format(parseISO(session.scheduled_start), "dd MMM, hh:mm a")}</span>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="w-full h-7 text-[10px] uppercase font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-dashed border-rose-200 mt-1"
                                        onClick={() => navigate(`/admin/clients/${session.client?.id}?tab=entitlements`)}
                                    >
                                        Open Profile <ArrowRight className="w-3 h-3 ml-2" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                 </ScrollArea>
              </CardContent>
            </Card>

            {/* Consultant Availability Tracker Card */}
            <Card className="border-none shadow-premium overflow-hidden sticky top-6">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Staff Availability
                </CardTitle>
                <CardDescription>Track consultant schedules by date</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Check Specific Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            type="date" 
                            className="pl-10 h-11 bg-muted/20 border-none font-bold" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-muted-foreground">Consultant</span>
                        <span className="text-xs font-bold text-muted-foreground">Status</span>
                    </div>
                    
                    <ScrollArea className="h-[300px] pr-2">
                        {consultantsLoading ? (
                            <div className="py-10 flex justify-center"><Activity className="animate-spin text-primary" /></div>
                        ) : availabilityForSelectedDate.length === 0 ? (
                            <div className="py-10 text-center text-xs text-muted-foreground">No consultants found for organization.</div>
                        ) : (
                            <div className="space-y-3">
                                {availabilityForSelectedDate.map((c: any) => (
                                    <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                        c.has_emergency ? 'bg-destructive/5 border-destructive/20' :
                                        c.is_available ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300' : 'bg-rose-50/30 border-rose-100 hover:border-rose-300'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs uppercase ${
                                                c.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {c.first_name?.[0]}{c.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-foreground">Dr. {c.first_name} {c.last_name}</p>
                                                {c.is_available && (
                                                    <p className="text-[9px] font-bold text-emerald-600/70 tracking-widest uppercase">
                                                        {c.schedule?.start_time?.substring(0, 5)} - {c.schedule?.end_time?.substring(0, 5)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            {c.has_emergency ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive rounded-lg text-white font-black text-[8px] uppercase tracking-tighter animate-pulse">
                                                    <AlertCircle className="w-2.5 h-2.5" /> Emergency
                                                </div>
                                            ) : c.is_available ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-lg text-white font-black text-[8px] uppercase tracking-tighter">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Available
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500 rounded-lg text-white font-black text-[8px] uppercase tracking-tighter">
                                                    <XCircle className="w-2.5 h-2.5" /> Off-Duty
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
      <LogEnquiryModal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
