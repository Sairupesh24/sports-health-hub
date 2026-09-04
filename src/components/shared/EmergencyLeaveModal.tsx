import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, Calendar, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { format, addHours } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIPBadge } from "@/components/ui/VIPBadge";
import { formatClientName } from "@/lib/utils";

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
      const data = await apiFetch<any[]>('/hr/emergency-alerts/today');
      if (data && data.length > 0) {
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

      const isScientist = profile?.ams_role === 'sports_scientist' || profile?.profession === 'Sports Scientist';
      const roleFilter = isScientist ? 'scientist_id' : 'therapist_id';
      const data = await apiFetch<any[]>(`/api/appointments?${roleFilter}=${profile?.id}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      
      const mappedData = (data || []).map((session: any) => ({
        ...session,
        client: session.client || {
          first_name: session.client_first_name,
          middle_name: session.client_middle_name,
          last_name: session.client_last_name,
          uhid: session.client_uhid,
          is_vip: session.client_is_vip
        }
      }));
      setAffectedSessions(mappedData);
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
      // Create emergency alert which also handles auto-checkout on the backend
      await apiFetch('/hr/emergency-alerts', {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

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
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] flex flex-col p-0 gap-0">
        {/* Pinned Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            Fire Emergency Alert
          </DialogTitle>
          <DialogDescription>
            This will immediately notify the Admin console. Use only for genuine emergencies that require immediate shift coverage.
          </DialogDescription>
        </DialogHeader>

        {existingEmergency ? (
          <>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-800 text-xl">Emergency Already Raised</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You have already raised an emergency alert today at{" "}
                {format(new Date(existingEmergency.created_at), "hh:mm a")}. Our team is handling the situation.
              </p>
            </div>
            {/* Pinned footer */}
            <div className="px-6 py-4 border-t bg-background shrink-0 flex justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close Window</Button>
            </div>
          </>
        ) : (
          <>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
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
                              <span className="text-xs font-bold">{formatClientName(session.client)}</span>
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

            {/* Pinned footer */}
            <div className="px-6 py-4 border-t bg-background shrink-0 flex flex-col gap-2">
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full gap-2 shadow-lg shadow-destructive/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                Confirm Emergency
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="w-full">
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
