import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, User, MessageSquare, MapPin, Share2, Clock } from "lucide-react";

interface LogEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogEnquiryModal({ isOpen, onClose }: LogEnquiryModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    looking_for: "",
    referral_source: "",
    preferred_call_time: "",
    work_place: "",
    notes: ""
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: enquiry, error } = await supabase
        .from("enquiries")
        .insert([{
          ...data,
          organization_id: profile?.organization_id,
          status: 'new'
        }])
        .select()
        .single();

      if (error) throw error;

      // Log initial interaction
      await supabase
        .from("enquiry_interactions")
        .insert([{
          enquiry_id: enquiry.id,
          interaction_type: 'call',
          response_text: `Initial manual entry logged by FOE. Notes: ${data.notes || 'None'}`,
          created_by: profile?.id
        }]);

      return enquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      toast({
        title: "Enquiry Logged",
        description: "The new lead has been successfully added to the dashboard.",
      });
      setFormData({
        name: "",
        contact: "",
        looking_for: "",
        referral_source: "",
        preferred_call_time: "",
        work_place: "",
        notes: ""
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log enquiry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.looking_for) {
      toast({
        title: "Missing Fields",
        description: "Please fill in Name, Contact, and Requirement.",
        variant: "destructive"
      });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Phone className="w-5 h-5 text-primary" />
            Log Manual Enquiry
          </DialogTitle>
          <DialogDescription>
            Record details of a new phone inquiry or walk-in lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Patient Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="Full Name" 
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact No *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="contact" 
                    placeholder="Phone or Email" 
                    className="pl-10"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="looking_for" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Requirement / Looking For *</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea 
                  id="looking_for" 
                  placeholder="e.g. Back pain, Sports injury assessment, Physiotherapy" 
                  className="pl-10 min-h-[80px]"
                  value={formData.looking_for}
                  onChange={(e) => setFormData({...formData, looking_for: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Lead Source</Label>
                <Select 
                  value={formData.referral_source} 
                  onValueChange={(v) => setFormData({...formData, referral_source: v})}
                >
                  <SelectTrigger id="source" className="w-full">
                    <SelectValue placeholder="Select Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direct">Direct / Walk-in</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Google">Google Search</SelectItem>
                    <SelectItem value="Referral">Patient Referral</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preferred Callback</Label>
                <Select 
                  value={formData.preferred_call_time} 
                  onValueChange={(v) => setFormData({...formData, preferred_call_time: v})}
                >
                  <SelectTrigger id="callback" className="w-full">
                    <SelectValue placeholder="Select Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning (9 AM - 12 PM)">Morning</SelectItem>
                    <SelectItem value="Afternoon (12 PM - 4 PM)">Afternoon</SelectItem>
                    <SelectItem value="Evening (4 PM - 8 PM)">Evening</SelectItem>
                    <SelectItem value="Anytime">Anytime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Work Place / Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="work" 
                  placeholder="Company or locality" 
                  className="pl-10"
                  value={formData.work_place}
                  onChange={(e) => setFormData({...formData, work_place: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Administrative Notes (Internal)</Label>
              <Textarea 
                id="notes" 
                placeholder="Any additional context from the phone call..." 
                className="min-h-[80px]"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2 bg-primary hover:bg-primary/90 shadow-md px-8" disabled={mutation.isPending}>
              {mutation.isPending ? "Logging..." : "Log Enquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
