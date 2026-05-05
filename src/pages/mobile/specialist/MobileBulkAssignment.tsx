import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  Users, 
  Search, 
  Check, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MobileBulkAssignment() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1: Select Form, 2: Select Athletes

  // 1. Fetch Questionnaires
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ["mobile-questionnaires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questionnaire_templates")
        .select("*")
        .eq("organization_id", profile?.organization_id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id
  });

  // 2. Fetch Athletes
  const { data: athletes, isLoading: athletesLoading } = useQuery({
    queryKey: ["mobile-bulk-athletes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, uhid, is_vip, sport, org_name")
        .eq("organization_id", profile?.organization_id)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedForm) throw new Error("Missing data");

      const orgId = profile?.organization_id;
      
      // Create Bulk Assignment Record
      const { data: bulkData, error: bulkError } = await (supabase
        .from('bulk_assignments' as any)
        .insert({
          org_id: orgId,
          questionnaire_id: selectedForm.id,
          specialist_id: user.id,
          total_clients: selectedClientIds.length,
          responded_count: 0,
          status: 'active'
        } as any) as any)
        .select()
        .single();

      if (bulkError) throw bulkError;

      // Create individual form_responses
      const responses = selectedClientIds.map(clientId => ({
        org_id: orgId,
        form_id: selectedForm.id,
        client_id: clientId,
        specialist_id: user.id,
        bulk_assignment_id: bulkData.id,
        status: 'pending'
      }));

      const { error: respError } = await supabase
        .from('form_responses' as any)
        .insert(responses as any);

      if (respError) throw respError;

      return selectedClientIds.length;
    },
    onSuccess: (count) => {
      haptic.success();
      toast({
        title: "Assignment Successful",
        description: `Form pushed to ${count} athletes.`,
        className: "bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest border-none"
      });
      navigate("/mobile/specialist");
    }
  });

  const toggleClient = (id: string) => {
    haptic.light();
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredAthletes = athletes?.filter(a => 
    `${a.first_name} ${a.last_name} ${a.uhid}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MobileSpecialistLayout title="Bulk Assignment">
      <div className="space-y-6">
        
        {/* Progress Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-border/50 shadow-sm">
           <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                step === 1 ? "bg-primary text-white" : "bg-emerald-500 text-white"
              )}>
                 {step === 1 ? "1" : <Check className="w-4 h-4" />}
              </div>
              <div className="h-0.5 w-8 bg-slate-100 dark:bg-slate-800" />
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                step === 2 ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}>
                 2
              </div>
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
             {step === 1 ? "Select Template" : "Select Recipients"}
           </span>
        </div>

        {step === 1 ? (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Available Forms</h3>
                <Sparkles className="w-4 h-4 text-primary" />
             </div>
             
             <div className="space-y-3">
                {formsLoading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-20 bg-white dark:bg-slate-900 rounded-3xl animate-pulse" />)
                ) : forms?.map(form => (
                  <div 
                    key={form.id}
                    onClick={() => {
                      haptic.light();
                      setSelectedForm(form);
                      setStep(2);
                    }}
                    className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-border/50 shadow-sm flex items-center justify-between active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                       </div>
                       <div>
                          <h4 className="font-black text-slate-900 dark:text-white leading-tight">{form.name}</h4>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
                             {form.category || "Wellness"}
                          </p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between px-2">
                <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                   <ChevronLeft className="w-3 h-3" /> Back to Forms
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                   {selectedClientIds.length} Selected
                </span>
             </div>

             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search athletes or squad..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 bg-white dark:bg-slate-900 border-border/50 rounded-2xl pl-12"
                />
             </div>

             <div className="space-y-2 pb-24">
                {athletesLoading ? (
                  [1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-900 rounded-2xl animate-pulse" />)
                ) : filteredAthletes?.map(athlete => {
                  const isSelected = selectedClientIds.includes(athlete.id);
                  return (
                    <div 
                      key={athlete.id}
                      onClick={() => toggleClient(athlete.id)}
                      className={cn(
                        "p-4 rounded-[2rem] border transition-all flex items-center justify-between",
                        isSelected 
                          ? "bg-primary/5 border-primary/30 shadow-md ring-1 ring-primary/10" 
                          : "bg-white dark:bg-slate-900 border-border/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors",
                          isSelected ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                             {athlete.first_name} {athlete.last_name}
                           </h4>
                           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                             {athlete.org_name || "General"}
                           </p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary" : "border-slate-200 dark:border-slate-800"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {/* Floating Action Bar */}
        {step === 2 && selectedClientIds.length > 0 && (
          <div className="fixed bottom-24 left-5 right-5 z-40 animate-in slide-in-from-bottom-10 duration-500">
             <Button 
               disabled={assignMutation.isPending}
               onClick={() => assignMutation.mutate()}
               className="w-full h-16 rounded-[2rem] bg-primary text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 gap-3"
             >
                {assignMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Push to {selectedClientIds.length} Athletes
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
             </Button>
          </div>
        )}
      </div>
    </MobileSpecialistLayout>
  );
}
