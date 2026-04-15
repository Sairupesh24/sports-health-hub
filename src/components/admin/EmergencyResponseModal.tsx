import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Phone, 
  Clock, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  MessageSquare,
  User,
  Users,
  Loader2,
  Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, addHours, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIPBadge } from "@/components/ui/VIPBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EmergencyResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export default function EmergencyResponseModal({ open, onOpenChange, organizationId }: EmergencyResponseModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Fetch alerts directly on open — bypasses React Query cache entirely
  const fetchAlerts = async () => {
    if (!organizationId) return;
    setAlertsLoading(true);
    try {
      const { data: alertsData, error } = await (supabase as any)
        .from("emergency_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "unresolved")
        .order("created_at", { ascending: false });

      if (error) { console.error("Alert fetch error:", error); setAlerts([]); return; }
      if (!alertsData || alertsData.length === 0) { setAlerts([]); return; }

      // Fetch each staff profile individually to avoid .in() formatting issues
      const merged = await Promise.all(
        alertsData.map(async (alert: any) => {
          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, profession")
              .eq("id", alert.staff_id)
              .maybeSingle();
            return { ...alert, staff: profileData };
          } catch {
            return { ...alert, staff: null };
          }
        })
      );

      setAlerts(merged);
      // Set selected after alerts are set
      if (merged.length > 0) {
        setSelectedAlertId(merged[0].id);
      }
    } catch (e) {
      console.error("Unexpected error fetching alerts:", e);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  // Trigger fetch on open
  useEffect(() => {
    if (open) {
      setAlerts([]);
      setSelectedAlertId(null);
      fetchAlerts();
    }
  }, [open, organizationId]);

  const selectedAlert = useMemo(() =>
    alerts?.find(a => a.id === selectedAlertId),
    [alerts, selectedAlertId]
  );

  // 2. Fetch Sessions for the selected staff member
  const { data: affectedSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["emergency-affected-sessions", selectedAlert?.staff_id],
    queryFn: async () => {
      if (!selectedAlert?.staff_id) return [];
      
      const start = parseISO(selectedAlert.created_at);
      const end = addHours(start, 24).toISOString();

      const { data, error } = await (supabase
        .from("sessions") as any)
        .select(`
          id,
          scheduled_start,
          service_type,
          status,
          client:clients(id, first_name, last_name, uhid, is_vip, mobile_no, email)
        `)
        .eq("therapist_id", selectedAlert.staff_id)
        .gte("scheduled_start", start.toISOString())
        .lte("scheduled_start", end)
        .order("scheduled_start", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedAlert?.staff_id
  });

  // Sort sessions: VIPs first
  const sortedSessions = useMemo(() => {
    if (!affectedSessions) return [];
    return [...affectedSessions].sort((a, b) => {
      if (a.client?.is_vip && !b.client?.is_vip) return -1;
      if (!a.client?.is_vip && b.client?.is_vip) return 1;
      return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
    });
  }, [affectedSessions]);

  // 3. Resolution Mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string, decision: string }) => {
      const { error } = await (supabase as any)
        .from("emergency_alerts")
        .update({
          status: "resolved",
          admin_decision: decision,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unresolved-emergency-alerts"] });
      toast({
        title: "Emergency Resolved",
        description: "The alert has been marked as handled in the system.",
      });
      // Re-fetch to update the list in the modal
      fetchAlerts();
    },
    onError: (error: any) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1100px] h-[90vh] flex flex-col p-0 overflow-hidden border-destructive shadow-2xl">
        <DialogHeader className="p-6 bg-destructive text-destructive-foreground">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <AlertCircle className="w-8 h-8 animate-pulse" />
                Emergency Command Center
              </DialogTitle>
              <DialogDescription className="text-destructive-foreground/80 font-medium">
                Real-time staff disruption management & manual client outreach
              </DialogDescription>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <span className="text-sm font-black">{alerts?.length || 0} PENDING ALERTS</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Alerts List */}
          <div className="w-80 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b bg-white/50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Emergencies</h4>
            </div>
            <ScrollArea className="flex-1">
              {alertsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-destructive" /></div>
              ) : alerts?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic text-sm">No unresolved emergencies.</div>
              ) : (
                <div className="divide-y">
                  {alerts?.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                      className={cn(
                        "w-full p-4 text-left transition-all hover:bg-white flex flex-col gap-2",
                        selectedAlertId === alert.id ? "bg-white shadow-inner border-l-4 border-l-destructive" : ""
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-slate-900">
                          {alert.staff?.first_name} {alert.staff?.last_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold italic">
                          {format(parseISO(alert.created_at), "h:mm a")}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight line-clamp-1">
                        {alert.staff?.profession || "Staff Member"}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 italic bg-muted/50 p-2 rounded border border-dashed">
                        "{alert.reason}"
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Main Area: Impact & Outreach */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedAlert ? (
              <>
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[24px] bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900">
                        Dr. {selectedAlert.staff?.first_name} {selectedAlert.staff?.last_name}
                      </h2>
                      <p className="text-sm font-bold text-destructive/80 uppercase tracking-widest">
                        {selectedAlert.staff?.profession} • Reported {format(parseISO(selectedAlert.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline" className="text-destructive border-destructive/30 font-black px-3 py-1 bg-destructive/5">
                      CRITICAL UNRESOLVED
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Impacted Clients (Next 24 Hours)
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Manual outreach required. VIP clients prioritized.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-200 text-slate-700 font-bold">{sortedSessions.length} SESSIONS</Badge>
                      <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30 font-bold">
                        {sortedSessions.filter(s => s.client?.is_vip).length} VIP
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    {sessionsLoading ? (
                      <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedSessions.map((session) => (
                          <div 
                            key={session.id} 
                            className={cn(
                              "group relative p-4 rounded-3xl border transition-all hover:shadow-xl hover:scale-[1.02]",
                              session.client?.is_vip 
                                ? "bg-gradient-to-br from-[#D4AF37]/5 to-[#D4AF37]/10 border-[#D4AF37]/30 shadow-sm" 
                                : "bg-white border-slate-100 shadow-sm"
                            )}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-2xl flex items-center justify-center font-black",
                                  session.client?.is_vip ? "bg-[#D4AF37] text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                  {session.client?.first_name?.[0]}{session.client?.last_name?.[0]}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900">{session.client?.first_name} {session.client?.last_name}</span>
                                    <VIPBadge isVIP={session.client?.is_vip} size="sm" showText={false} />
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">UHID: {session.client?.uhid}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1.5 text-xs font-black text-destructive bg-destructive/5 px-2 py-1 rounded-lg border border-destructive/10">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(session.scheduled_start), "hh:mm a")}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 p-3 bg-white/50 rounded-2xl border border-dashed border-slate-200 mb-4 text-xs font-medium text-slate-600">
                                <span className="text-primary font-black uppercase tracking-tighter shrink-0">{session.service_type}</span>
                                <span className="opacity-30">•</span>
                                <span className="italic truncate">{session.status}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <a href={`tel:${session.client?.mobile_no}`} className="flex-1">
                                <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
                                  <Phone className="w-3 h-3" /> Call Patient
                                </Button>
                              </a>
                              {session.client?.email && (
                                <a href={`mailto:${session.client?.email}`}>
                                  <Button size="icon" variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-50 transition-colors">
                                    <Mail className="w-3 h-3 text-slate-600" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-6 border-t bg-slate-50 flex items-center justify-between gap-6">
                    <div className="flex-1 space-y-2">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Resolve Conflict</h4>
                       <p className="text-[10px] text-muted-foreground font-medium">Mark this emergency as handled once you have reassigned or notified the athletes.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={() => {
                          onOpenChange(false);
                          navigate("/admin/calendar");
                        }}
                        className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg"
                      >
                        <Calendar className="w-4 h-4" />
                        Reassign on Calendar
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => resolveMutation.mutate({ id: selectedAlert.id, decision: "broadcasted" })}
                        disabled={resolveMutation.isPending}
                        className="gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold"
                      >
                         {resolveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />} 
                         Clients Notified
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/20" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">All Quiet</h3>
                  <p className="text-muted-foreground mt-2">No active clinician emergencies requiring attention.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
