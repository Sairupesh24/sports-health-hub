import React, { useState, useEffect, useMemo } from "react";
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
import { cn, formatClientName } from "@/lib/utils";
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
  }, [isOpen, initialSelectedAthleteId, initialSelectedBatchId, initialStartDate]);

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

      const targetAthleteIds = selectedAthleteIds.length > 0 
        ? selectedAthleteIds 
        : (initialSelectedAthleteId ? [initialSelectedAthleteId] : []);

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
            athleteIds: targetAthleteIds,
            batchId: initialSelectedBatchId
        }
      });

      toast({
        title: "Workout Assigned!",
        description: initialSelectedBatchId 
          ? "Custom plan sent to the batch." 
          : `Custom plan sent to ${targetAthleteIds.length} athletes.`,
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

  // Derive recipient display name for the builder
  const effectiveRecipientName = recipientName || (
    selectedAthleteIds.length === 1
      ? (() => {
          const a = athletes.find(ath => String(ath.id) === String(selectedAthleteIds[0]));
          return a ? formatClientName(a) : "Selected Athlete";
        })()
      : selectedAthleteIds.length > 1
        ? `${selectedAthleteIds.length} Athletes Selected`
        : undefined
  );

  // Optimized windowed list for performance with thousands of athletes
  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) {
      const selected = athletes.filter(a => selectedAthleteIds.includes(a.id));
      const unselected = athletes.filter(a => !selectedAthleteIds.includes(a.id)).slice(0, 80);
      return [...selected, ...unselected];
    }
    const q = searchQuery.toLowerCase().trim();
    return athletes.filter(a => {
      const name = formatClientName(a).toLowerCase();
      const uhid = (a.uhid || '').toLowerCase();
      return name.includes(q) || uhid.includes(q);
    }).slice(0, 100);
  }, [athletes, searchQuery, selectedAthleteIds]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined} className={cn(
        "bg-[#1A1F26] border-white/10 text-white rounded-2xl overflow-hidden shadow-2xl p-0 transition-all duration-300 flex flex-col",
        step === 'selection' ? "max-w-md max-h-[85vh]" : "max-w-4xl h-[85vh] max-h-[85vh]"
      )}>
        {/* Pinned Header */}
        <DialogHeader className="px-6 py-4 bg-white/[0.02] border-b border-white/5 shrink-0">
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

        {step === 'selection' ? (
          <>
            {/* Scrollable Selection Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-80">Start Date</Label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 bg-white/[0.04] border-white/10 rounded-xl pl-12 font-bold focus:ring-primary/40 text-white"
                  />
                </div>
              </div>

              {/* Athlete Search & List */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-primary opacity-80">
                    Athletes {selectedAthleteIds.length > 0 ? `(${selectedAthleteIds.length} selected)` : `(${athletes.length})`}
                  </Label>
                  {selectedAthleteIds.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setSelectedAthleteIds([])}
                      className="text-[9px] font-bold uppercase text-white/40 hover:text-primary transition-colors"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:text-primary transition-all" />
                  <Input 
                    placeholder="Search athletes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 bg-white/[0.04] border-white/10 rounded-xl pl-11 text-xs font-medium text-white placeholder:opacity-30 focus:ring-primary/40 transition-all"
                  />
                </div>

                <div className="h-64 sm:h-72 overflow-y-auto space-y-2 pr-1 border border-white/5 rounded-xl p-2 bg-white/[0.01]">
                  {fetching ? (
                    [1, 2, 3].map(i => <div key={i} className="h-14 bg-white/[0.05] rounded-xl animate-pulse" />)
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
                              ? "bg-primary/10 border-primary/40 shadow-sm shadow-primary/10" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] transition-all uppercase",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-white/70"
                            )}>
                              {athlete.first_name?.[0] || 'A'}{athlete.last_name?.[0] || ''}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-slate-100 uppercase tracking-tight">{formatClientName(athlete)}</div>
                              <div className="text-[9px] opacity-40 font-bold uppercase tracking-widest">{athlete.uhid || "CLIENT"}</div>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-white/20"
                          )}>
                             {isSelected && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                       <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No athletes found matching search.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Footer with Cancel & Next Buttons */}
            <DialogFooter className="px-6 py-4 bg-white/[0.03] border-t border-white/10 flex items-center justify-between gap-3 shrink-0 sm:justify-between">
              <Button 
                variant="ghost" 
                onClick={onClose} 
                className="h-10 px-4 font-bold uppercase tracking-widest text-[10px] text-white/60 hover:text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                onClick={program ? handleAssign : () => setStep('builder')} 
                disabled={selectedAthleteIds.length === 0 || loading}
                className="h-10 px-6 font-bold uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-40"
              >
                {loading ? "Assigning..." : program ? "Assign Program" : (
                  <>
                    Next <MoveRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Step 2: Builder with scrollable plan */
          <div className="p-6 flex-1 min-h-0 overflow-hidden flex flex-col">
            <AmsQuickBuilder 
              startDate={startDate}
              onCancel={() => {
                if (initialSelectedAthleteId || initialSelectedBatchId) {
                  onClose();
                } else {
                  setStep('selection');
                }
              }}
              onSave={handleQuickSave}
              loading={loading}
              initialDays={initialDays}
              recipientName={effectiveRecipientName}
              hideTitle={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
