import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Search, 
  Calendar as CalendarIcon, 
  Check, 
  UserPlus 
} from "lucide-react";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import AmsQuickBuilder from "./AmsQuickBuilder";
import { MoveRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProgramAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: any;
  onSuccess: () => void;
  initialSelectedAthleteId?: string | null;
  initialSelectedBatchId?: string | null;
  initialStartDate?: string;
  initialDays?: any[];
  recipientName?: string;
}

export default function ProgramAssignmentModal({ 
  isOpen, 
  onClose, 
  program, 
  onSuccess,
  initialSelectedAthleteId,
  initialSelectedBatchId,
  initialStartDate,
  initialDays,
  recipientName
}: ProgramAssignmentModalProps) {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [fetching, setFetching] = useState(true);
  const [step, setStep] = useState<'selection' | 'builder'>('selection');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAthletes();
      if (!program) {
        fetchPrograms();
      }
      
      // Auto-preselect and skip to builder if an athlete or batch is provided
      if (initialSelectedAthleteId) {
        setSelectedAthleteIds([initialSelectedAthleteId]);
        setStep('builder'); // ALWAYS SKIP if we have an athlete
      } else if (initialSelectedBatchId) {
        setStep('builder'); // ALWAYS SKIP if we have a batch
      } else {
        // Reset if coming from a different state
        setSelectedAthleteIds([]);
        setStep('selection');
      }

      if (initialStartDate) {
        setStartDate(initialStartDate);
      } else {
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, initialSelectedAthleteId, initialStartDate]);

  const fetchPrograms = async () => {
    try {
      const data = await apiFetch<any[]>('/ams/programs', {
        params: { status: 'active' }
      });
      setPrograms(data || []);
      if (data && data.length > 0) {
        setSelectedProgramId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchAthletes = async () => {
    try {
      setFetching(true);
      const data = await apiFetch<any[]>('/ams/athletes');
      setAthletes(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching athletes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const toggleAthlete = (id: string) => {
    setSelectedAthleteIds(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedAthleteIds.length === 0) {
      toast({
        title: "No athletes selected",
        description: "Please select at least one athlete to assign.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const targetProgramId = program?.id || selectedProgramId;
      const targetOrgId = program?.org_id || (programs.find(p => p.id === selectedProgramId)?.org_id);

      if (!targetProgramId) {
        toast({ title: "No program selected", variant: "destructive" });
        return;
      }

      const assignments = initialSelectedBatchId 
        ? [{
            program_id: targetProgramId,
            batch_id: initialSelectedBatchId,
            start_date: startDate,
            org_id: targetOrgId,
            status: 'active'
          }]
        : selectedAthleteIds.map(athleteId => ({
            program_id: targetProgramId,
            athlete_id: athleteId,
            start_date: startDate,
            org_id: targetOrgId,
            status: 'active'
          }));

      await apiFetch('/ams/program-assignments/bulk', {
        method: 'POST',
        body: { assignments }
      });

      toast({
        title: "Program Assigned",
        description: initialSelectedBatchId 
          ? `Successfully assigned to the batch.` 
          : `Successfully assigned to ${selectedAthleteIds.length} athletes.`
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async (daysData: any[]) => {
    try {
      setLoading(true);
      if (!user) return;

      // Handle EDITING existing items
      if (initialDays && initialDays.length > 0) {
        const day = daysData[0];
        const dayId = day.id;

        // Sync items via backend
        await apiFetch(`/ams/workout-days/${dayId}/sync-items`, {
            method: 'POST',
            body: { items: day.items }
        });

        toast({ title: "Workout Updated!" });
        onSuccess();
        onClose();
        return;
      }

      // Create new transient program and assign
      await apiFetch('/ams/quick-assign', {
        method: 'POST',
        body: {
            title: `Quick Assign - ${format(new Date(), 'MMM d, HH:mm')}`,
            days: daysData,
            startDate,
            athleteIds: selectedAthleteIds,
            batchId: initialSelectedBatchId
        }
      });

      toast({
        title: "Workout Assigned!",
        description: initialSelectedBatchId 
          ? "Custom plan sent to the batch." 
          : `Custom plan sent to ${selectedAthleteIds.length} athletes.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(a => 
    `${a.first_name} ${a.last_name} ${a.uhid}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className={cn(
        "bg-[#1A1F26] border-white/10 text-white rounded-2xl overflow-hidden shadow-2xl p-0 transition-all duration-300",
        step === 'selection' ? "max-w-md" : "max-w-4xl"
      )}>
        <DialogHeader className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold uppercase tracking-tight flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
               </div>
               {step === 'selection' ? "Recipients" : "Build Plan"}
            </DialogTitle>
            <div className="flex items-center gap-1.5">
               <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 'selection' ? "bg-primary" : "bg-white/10")} />
               <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 'builder' ? "bg-primary" : "bg-white/10")} />
            </div>
          </div>
        </DialogHeader>

        <div className={cn(
          "p-6 space-y-6 no-scrollbar",
          step === 'selection' ? "max-h-[60vh] overflow-y-auto" : "max-h-[85vh] overflow-y-auto"
        )}>
          {step === 'selection' ? (
            <>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-80">Start Date</Label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 bg-white/[0.04] border-white/10 rounded-xl pl-12 font-bold focus:ring-primary/40 text-white"
                  />
                </div>
              </div>

              {/* Athlete Search & List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-80">Athletes ({selectedAthleteIds.length})</Label>
                  <button 
                    onClick={() => setSelectedAthleteIds(selectedAthleteIds.length === athletes.length ? [] : athletes.map(a => a.id))}
                    className="text-[9px] font-bold uppercase text-white/40 hover:text-primary transition-colors"
                  >
                    {selectedAthleteIds.length === athletes.length ? "Clear" : "Select All"}
                  </button>
                </div>
                
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:text-primary transition-all" />
                  <Input 
                    placeholder="Search athletes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 bg-white/[0.04] border-white/10 rounded-xl pl-11 text-xs font-medium text-white placeholder:opacity-20 focus:ring-primary/40 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 pr-2">
                  {fetching ? (
                    [1, 2, 3].map(i => <div key={i} className="h-20 bg-white/[0.05] rounded-3xl animate-pulse" />)
                  ) : filteredAthletes.length > 0 ? (
                    filteredAthletes.map((athlete) => {
                      const isSelected = selectedAthleteIds.includes(athlete.id);
                      return (
                        <div 
                          key={athlete.id}
                          onClick={() => toggleAthlete(athlete.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                            isSelected 
                              ? "bg-primary/10 border-primary/30" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[10px] transition-all uppercase",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10"
                            )}>
                              {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-100 uppercase tracking-tight">{athlete.last_name}, {athlete.first_name}</div>
                              <div className="text-[9px] opacity-20 font-bold uppercase tracking-widest">{athlete.uhid || "CLIENT"}</div>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-white/10"
                          )}>
                             {isSelected && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                       <Users className="w-10 h-10 text-white/5 mx-auto mb-3" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No athletes found matching search.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4 gap-2 bg-transparent border-none">
                 <Button variant="ghost" onClick={onClose} className="h-11 px-6 font-bold uppercase tracking-widest text-[10px] opacity-40">Cancel</Button>
                 <Button 
                   onClick={() => setStep('builder')} 
                   disabled={selectedAthleteIds.length === 0}
                   className="h-11 flex-1 font-bold uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 gap-2"
                 >
                   Continue <MoveRight className="w-3.5 h-3.5" />
                 </Button>
              </DialogFooter>
            </>
          ) : (
            <AmsQuickBuilder 
              startDate={startDate}
              onCancel={() => {
                // If it was a pre-selection from timeline, cancel should close modal
                if (initialSelectedAthleteId || initialSelectedBatchId) {
                  onClose();
                } else {
                  setStep('selection');
                }
              }}
              onSave={handleQuickSave}
              loading={loading}
              initialDays={initialDays}
              recipientName={recipientName}
              hideTitle={true}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
