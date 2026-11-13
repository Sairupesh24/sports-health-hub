import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { addDays, addHours, format, setHours, setMinutes, startOfToday } from "date-fns";
import { 
  PhoneCall, 
  MessageCircle, 
  UserCheck, 
  Mail, 
  FileText, 
  Clock, 
  Calendar, 
  Flame, 
  Sun, 
  Snowflake,
  CheckCircle2,
  Loader2
} from "lucide-react";

interface InteractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId: string;
  enquiryName: string;
  enquiryContact?: string;
  initialChannel?: "call" | "whatsapp" | "visit" | "email" | "note";
  onSuccess: () => void;
  onScheduleGuest?: () => void;
}

const DISPOSITIONS = [
  { id: "spoke_interested", label: "Spoke • Highly Interested", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "evaluating_pricing", label: "Spoke • Evaluating Prices/Slots", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "consult_family", label: "Spoke • Discussing with Doctor/Family", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "busy_callback", label: "Busy • Requested Callback", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "no_answer", label: "No Answer / Ringing / Switched Off", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "not_interested", label: "Not Interested / Out of Range", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

export function InteractionModal({ 
  open, 
  onOpenChange, 
  enquiryId, 
  enquiryName,
  enquiryContact,
  initialChannel = "call",
  onSuccess,
  onScheduleGuest
}: InteractionModalProps) {
  const [channel, setChannel] = useState<"call" | "whatsapp" | "visit" | "email" | "note">(initialChannel);
  const [disposition, setDisposition] = useState<string>("");
  const [sentiment, setSentiment] = useState<"hot" | "warm" | "cold">("warm");
  const [response, setResponse] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  
  // Custom date/time or preset
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpTime, setFollowUpTime] = useState<string>("16:00");
  const [followUpNote, setFollowUpNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Apply quick preset for callback
  const applyPreset = (daysOffset: number, hour: number, minute: number, label: string) => {
    setFollowUpRequired(true);
    const targetDate = addDays(startOfToday(), daysOffset);
    setFollowUpDate(format(targetDate, "yyyy-MM-dd"));
    setFollowUpTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    if (!followUpNote) {
      setFollowUpNote(`Follow-up callback: ${label}`);
    }
  };

  const handleSubmit = async () => {
    if (!response.trim() && !disposition) {
      toast({ 
        title: "Missing Details", 
        description: "Please select an outcome or enter conversation notes.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      let combinedFollowUpIso: string | null = null;
      if (followUpRequired && followUpDate) {
        const [h, m] = (followUpTime || "12:00").split(':').map(Number);
        const [year, month, day] = followUpDate.split('-').map(Number);
        const dt = new Date(year, month - 1, day, h || 12, m || 0);
        combinedFollowUpIso = dt.toISOString();
      }

      const activeDispositionLabel = DISPOSITIONS.find(d => d.id === disposition)?.label || disposition;

      // 1. Post interaction record
      await apiFetch(`/clients/enquiries/${enquiryId}/interactions`, {
        method: 'POST',
        data: {
          interaction_type: channel,
          response_text: response.trim() || activeDispositionLabel,
          disposition: activeDispositionLabel,
          sentiment,
          follow_up_required: followUpRequired,
          follow_up_at: combinedFollowUpIso,
          follow_up_note: followUpNote.trim() || null,
          metadata: {
            channel,
            disposition_id: disposition,
            sentiment,
            contact_used: enquiryContact
          }
        }
      });

      // 2. Update enquiry status
      const newStatus = disposition === 'not_interested' ? 'not_interested' : 'contacted';
      await apiFetch(`/clients/enquiries/${enquiryId}`, {
        method: 'PATCH',
        data: {
          status: newStatus,
          last_interaction_at: new Date().toISOString(),
          ...(combinedFollowUpIso ? { next_follow_up_at: combinedFollowUpIso } : {})
        }
      });

      toast({ 
        title: "Interaction Logged", 
        description: `Lead touchpoint & ${followUpRequired ? 'callback schedule' : 'notes'} recorded successfully.` 
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to record interaction", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setChannel(initialChannel);
    setDisposition("");
    setSentiment("warm");
    setResponse("");
    setFollowUpRequired(false);
    setFollowUpDate("");
    setFollowUpTime("16:00");
    setFollowUpNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-slate-900">
                Log Interaction: {enquiryName}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Track when you reached out, what was discussed, and if a callback is needed.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Channel Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Communication Channel
            </Label>
            <div className="grid grid-cols-5 gap-2">
              <Button
                type="button"
                variant={channel === "call" ? "default" : "outline"}
                size="sm"
                onClick={() => setChannel("call")}
                className="h-10 text-xs font-semibold gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call
              </Button>
              <Button
                type="button"
                variant={channel === "whatsapp" ? "default" : "outline"}
                size="sm"
                onClick={() => setChannel("whatsapp")}
                className="h-10 text-xs font-semibold gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
              </Button>
              <Button
                type="button"
                variant={channel === "visit" ? "default" : "outline"}
                size="sm"
                onClick={() => setChannel("visit")}
                className="h-10 text-xs font-semibold gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" /> Walk-in
              </Button>
              <Button
                type="button"
                variant={channel === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setChannel("email")}
                className="h-10 text-xs font-semibold gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
              <Button
                type="button"
                variant={channel === "note" ? "default" : "outline"}
                size="sm"
                onClick={() => setChannel("note")}
                className="h-10 text-xs font-semibold gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Note
              </Button>
            </div>
          </div>

          {/* Outcome / Disposition Pills */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Call Outcome / Disposition
            </Label>
            <div className="flex flex-wrap gap-2">
              {DISPOSITIONS.map((disp) => {
                const isSelected = disposition === disp.id;
                return (
                  <button
                    key={disp.id}
                    type="button"
                    onClick={() => {
                      setDisposition(disp.id);
                      if (disp.id === 'busy_callback' && !followUpRequired) {
                        applyPreset(1, 16, 0, "Requested callback");
                      }
                    }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                      isSelected 
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                        : `${disp.color} hover:opacity-80`
                    }`}
                  >
                    {disp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lead Temperature / Sentiment */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lead Interest Temperature
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={sentiment === "hot" ? "default" : "outline"}
                onClick={() => setSentiment("hot")}
                className={`h-9 text-xs font-semibold gap-1.5 ${sentiment === "hot" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
              >
                <Flame className="w-4 h-4 text-orange-400" /> Hot (Ready to book)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sentiment === "warm" ? "default" : "outline"}
                onClick={() => setSentiment("warm")}
                className={`h-9 text-xs font-semibold gap-1.5 ${sentiment === "warm" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
              >
                <Sun className="w-4 h-4 text-amber-300" /> Warm (Interested / Evaluating)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sentiment === "cold" ? "default" : "outline"}
                onClick={() => setSentiment("cold")}
                className={`h-9 text-xs font-semibold gap-1.5 ${sentiment === "cold" ? "bg-slate-600 hover:bg-slate-700 text-white" : ""}`}
              >
                <Snowflake className="w-4 h-4 text-blue-300" /> Cold (Low intent)
              </Button>
            </div>
          </div>

          {/* Conversation Notes */}
          <div className="space-y-2">
            <Label htmlFor="response" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              What was discussed? (Conversation Notes)
            </Label>
            <Textarea 
              id="response"
              placeholder="e.g. Inquired about lower back pain rehabilitation. Prefers evening slots after 5 PM. Shared pricing for initial evaluation package."
              className="min-h-[90px] text-xs resize-none bg-slate-50 border-slate-200"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>

          {/* Smart Callback Engine */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Schedule a Follow-Up Callback?
                  </h4>
                  <p className="text-[11px] text-slate-400">Sets an alert on the dashboard and SLA tracking timeline.</p>
                </div>
              </div>
              <Switch 
                checked={followUpRequired} 
                onCheckedChange={(checked) => {
                  setFollowUpRequired(checked);
                  if (checked && !followUpDate) {
                    applyPreset(1, 16, 0, "Callback tomorrow");
                  }
                }} 
              />
            </div>

            {followUpRequired && (
              <div className="space-y-4 pt-3 border-t border-slate-200/70 animate-in fade-in duration-300">
                {/* Fast Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold bg-white"
                      onClick={() => applyPreset(0, 17, 30, "Today evening")}
                    >
                      ⚡ Today Evening (5:30 PM)
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold bg-white"
                      onClick={() => applyPreset(1, 10, 30, "Tomorrow morning")}
                    >
                      ⚡ Tomorrow Morning (10:30 AM)
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold bg-white"
                      onClick={() => applyPreset(1, 16, 0, "Tomorrow afternoon")}
                    >
                      ⚡ Tomorrow Afternoon (4:00 PM)
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold bg-white"
                      onClick={() => applyPreset(2, 11, 0, "In 2 days")}
                    >
                      ⚡ In 2 Days (11:00 AM)
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold bg-white"
                      onClick={() => applyPreset(7, 10, 30, "Next week")}
                    >
                      ⚡ Next Week
                    </Button>
                  </div>
                </div>

                {/* Exact Date & Time Picker */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Callback Date</Label>
                    <Input 
                      type="date" 
                      value={followUpDate} 
                      onChange={(e) => setFollowUpDate(e.target.value)} 
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Callback Time</Label>
                    <Input 
                      type="time" 
                      value={followUpTime} 
                      onChange={(e) => setFollowUpTime(e.target.value)} 
                      className="h-9 bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Callback Purpose / Memo */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Callback Purpose / Note for Front Desk</Label>
                  <Input 
                    placeholder="e.g. Call after office hours to confirm slot availability"
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    className="h-9 bg-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          {onScheduleGuest && (
            <Button 
              type="button"
              variant="outline" 
              className="font-bold text-xs"
              onClick={() => {
                onOpenChange(false);
                onScheduleGuest();
              }}
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-primary" /> Book Consultation Session
            </Button>
          )}
          <Button 
            type="button"
            className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white px-6"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
            Save Interaction & Timeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
