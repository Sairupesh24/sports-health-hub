import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, Calendar, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addHours } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIPBadge } from "@/components/ui/VIPBadge";

interface EmergencyLeaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmergencyLeaveModal({ open, onOpenChange }: EmergencyLeaveModalProps) {
  const { profile } = useAuth();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [affectedSessions, setAffectedSessions] = useState<any[]>([]);
  const [existingEmergency, setExistingEmergency] = useState<any>(null);

  useEffect(() => {
    if (open && profile?.id) {
      setExistingEmergency(null);
      setReason("");
      fetchAffectedSessions();
      checkExistingEmergency();
    }
  }, [open, profile?.id]);

  const checkExistingEmergency = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("emergency_alerts")
        .select("*")
        .eq("staff_id", profile?.id)
        .gte("created_at", `${today}T00:00:00Z`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setExistingEmergency(data[0]);
      }
    } catch (error) {
      console.error("Error checking emergency:", error);
    }
  };

  const fetchAffectedSessions = async () => {
    setFetchingSessions(true);
    try {
      const start = new Date().toISOString();
      const end = addHours(new Date(), 24).toISOString();

      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id,
          scheduled_start,
          service_type,
          client:clients(first_name, last_name, uhid, is_vip)
        `)
        .eq("therapist_id", profile?.id)
        .gte("scheduled_start", start)
        .lte("scheduled_start", end)
        .order("scheduled_start", { ascending: true });

      if (error) throw error;
      setAffectedSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
    } finally {
      setFetchingSessions(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a brief reason for the emergency leave.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Insert the emergency alert
      const { error } = await (supabase as any)
        .from("emergency_alerts")
        .insert({
          organization_id: profile?.organization_id,
          staff_id: profile?.id,
          reason: reason,
          status: "unresolved",
        });

      if (error) throw error;

      // 2. Auto-checkout or log emergency in attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: todayLogs } = await supabase
        .from("hr_attendance_logs")
        .select("*")
        .eq("profile_id", profile?.id)
        .gte("created_at", `${today}T00:00:00Z`)
        .order("created_at", { ascending: false });

      const lastCheckIn = todayLogs?.find((l: any) => l.type === "check_in");
      const alreadyCheckedOut = todayLogs?.some((l: any) => l.type === "check_out");

      if (lastCheckIn && !alreadyCheckedOut) {
        // Staff has an open check-in — log emergency_leave and close session
        await supabase.from("hr_attendance_logs").insert({
          organization_id: profile?.organization_id,
          profile_id: profile?.id,
          type: "emergency_leave",
          latitude: lastCheckIn.latitude,
          longitude: lastCheckIn.longitude,
          distance_from_center: lastCheckIn.distance_from_center,
          is_within_geofence: lastCheckIn.is_within_geofence,
          metadata: {
            auto: true,
            reason: "emergency_leave",
            note: "Auto-checked out due to emergency leave",
            user_agent: navigator.userAgent,
          },
        });
      } else if (!lastCheckIn) {
        // No check-in today — log a standalone emergency_leave entry
        await supabase.from("hr_attendance_logs").insert({
          organization_id: profile?.organization_id,
          profile_id: profile?.id,
          type: "emergency_leave",
          latitude: null,
          longitude: null,
          distance_from_center: null,
          is_within_geofence: false,
          metadata: {
            reason: "emergency_leave",
            note: "Emergency leave raised — no prior check-in for today",
            user_agent: navigator.userAgent,
          },
        });
      }

      window.dispatchEvent(new Event("attendance_updated"));

      toast({
        title: "Emergency Alert Fired",
        description: "Admin has been notified immediately. Your attendance has been logged. Please stay safe.",
        variant: "destructive",
      });
      onOpenChange(false);
      setReason("");
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            Fire Emergency Alert
          </DialogTitle>
          <DialogDescription>
            This will immediately notify the Admin console. Use only for genuine emergencies that require immediate shift coverage.
          </DialogDescription>
        </DialogHeader>

        {existingEmergency ? (
          <div className="space-y-4 py-6 text-center">
             <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
             </div>
             <h3 className="font-black text-slate-800 text-xl">Emergency Already Raised</h3>
             <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You have already raised an emergency alert today at {format(new Date(existingEmergency.created_at), "hh:mm a")}. Our team is handling the situation.
             </p>
             <DialogFooter className="mt-8 sm:justify-center">
               <Button variant="outline" onClick={() => onOpenChange(false)}>Close Window</Button>
             </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reason for Emergency</label>
                <Textarea 
                  placeholder="Briefly describe the emergency..." 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px] border-destructive/20 focus-visible:ring-destructive"
                />
              </div>

              <div className="rounded-xl border border-destructive/10 bg-destructive/5 p-4">
                <h4 className="flex items-center gap-2 text-xs font-black text-destructive uppercase tracking-widest mb-3">
                  <Calendar className="w-3 h-3" />
                  Impact: Next 24 Hours
                </h4>
                
                <ScrollArea className="h-[150px]">
                  {fetchingSessions ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                    </div>
                  ) : affectedSessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No sessions scheduled for the next 24 hours.</p>
                  ) : (
                    <div className="space-y-3">
                      {affectedSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 border border-destructive/5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{session.client?.first_name} {session.client?.last_name}</span>
                              <VIPBadge isVIP={session.client?.is_vip} />
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">{session.service_type}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-destructive">{format(new Date(session.scheduled_start), "hh:mm a")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleSubmit} 
                disabled={loading}
                className="gap-2 shadow-lg shadow-destructive/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                Confirm Emergency
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
