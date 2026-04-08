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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addDays } from "date-fns";

interface InteractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId: string;
  enquiryName: string;
  onSuccess: () => void;
  onScheduleGuest: () => void;
}

export function InteractionModal({ 
  open, 
  onOpenChange, 
  enquiryId, 
  enquiryName,
  onSuccess,
  onScheduleGuest
}: InteractionModalProps) {
  const { profile } = useAuth();
  const [response, setResponse] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDays, setFollowUpDays] = useState("3");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) {
      toast({ title: "Validation Error", description: "Please enter the client's response.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const followUpDate = followUpRequired 
        ? addDays(new Date(), parseInt(followUpDays)).toISOString() 
        : null;

      // 1. Insert Interaction Record
      const { error: interactError } = await supabase.from("enquiry_interactions").insert({
        enquiry_id: enquiryId,
        interaction_type: 'call',
        response_text: response,
        follow_up_required: followUpRequired,
        follow_up_at: followUpDate,
        created_by: profile?.id
      });

      if (interactError) throw interactError;

      // 2. Update Enquiry Status and Follow-up Info
      const { error: enqError } = await supabase.from("enquiries").update({
        status: 'contacted',
        next_follow_up_at: followUpDate,
        last_interaction_at: new Date().toISOString()
      }).eq("id", enquiryId);

      if (enqError) throw enqError;

      toast({ title: "Interaction Logged", description: "Call response has been saved successfully." });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResponse("");
    setFollowUpRequired(false);
    setFollowUpDays("3");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Call Interaction: {enquiryName}</DialogTitle>
          <DialogDescription>
            Record the outcome of your call with the client for auditing and follow-ups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="response" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              What was their response?
            </Label>
            <Textarea 
              id="response"
              placeholder="e.g. Interested in S&C, will discuss with family and get back. Needs more info on pricing."
              className="min-h-[100px] resize-none"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>

          <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <Checkbox 
              id="follow-up" 
              checked={followUpRequired} 
              onCheckedChange={(checked) => setFollowUpRequired(checked as boolean)} 
            />
            <div className="space-y-2 flex-1 -mt-1">
              <Label htmlFor="follow-up" className="text-sm font-semibold cursor-pointer">
                Schedule a follow-up call?
              </Label>
              {followUpRequired && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <Select value={followUpDays} onValueChange={setFollowUpDays}>
                    <SelectTrigger className="w-full mt-2 h-9 bg-white">
                      <SelectValue placeholder="In how many days?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">After 1 Day</SelectItem>
                      <SelectItem value="2">After 2 Days</SelectItem>
                      <SelectItem value="3">After 3 Days</SelectItem>
                      <SelectItem value="7">After 1 Week</SelectItem>
                      <SelectItem value="14">After 2 Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="flex-1 font-bold uppercase tracking-widest text-[10px]"
            onClick={() => {
              onOpenChange(false);
              onScheduleGuest();
            }}
          >
            Schedule Session Instead
          </Button>
          <Button 
            className="flex-1 font-bold uppercase tracking-widest text-[10px]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Log Call Response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
