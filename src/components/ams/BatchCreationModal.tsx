import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Search, 
  Check, 
  Plus,
  X,
  Sparkles,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface BatchCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchToEdit?: any;
}

export default function BatchCreationModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  batchToEdit
}: BatchCreationModalProps) {
  const [batchName, setBatchName] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAthletes();
      if (batchToEdit) {
        setBatchName(batchToEdit.name);
        fetchBatchMembers(batchToEdit.id);
      } else {
        setBatchName("");
        setSelectedAthleteIds([]);
      }
    }
  }, [isOpen, batchToEdit]);

  const fetchAthletes = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('ams_role', 'is', null)
        .neq('ams_role', 'coach')
        .order('last_name', { ascending: true });

      if (error) throw error;
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

  const fetchBatchMembers = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('batch_members' as any)
        .select('athlete_id')
        .eq('batch_id', batchId);
      
      if (error) throw error;
      setSelectedAthleteIds(data.map((m: any) => m.athlete_id));
    } catch (error: any) {
      console.error("Error fetching batch members:", error);
    }
  };

  const toggleAthlete = (id: string) => {
    setSelectedAthleteIds(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!batchName.trim()) {
      toast({
        title: "Batch Name Required",
        description: "Please enter a name for the batch.",
        variant: "destructive"
      });
      return;
    }

    if (selectedAthleteIds.length === 0) {
      toast({
        title: "No Athletes Selected",
        description: "Please select at least one athlete for the batch.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      const orgId = profile?.organization_id;
      if (!orgId) throw new Error("Organization not found");

      let batchId = batchToEdit?.id;

      if (batchToEdit) {
        // Update batch name
        const { error: uError } = await supabase
          .from('batches' as any)
          .update({ name: batchName })
          .eq('id', batchId);
        
        if (uError) throw uError;
      } else {
        // Create new batch
        const { data: bData, error: bError } = await (supabase
          .from('batches' as any)
          .insert({
            name: batchName,
            org_id: orgId,
            created_by: user.id
          } as any) as any)
          .select()
          .single();
        
        if (bError) throw bError;
        batchId = bData.id;
      }

      // Update members using RPC
      const { error: mError } = await supabase.rpc('update_batch_members', {
        p_batch_id: batchId,
        p_athlete_ids: selectedAthleteIds
      });

      if (mError) throw mError;

      toast({
        title: batchToEdit ? "Batch Updated" : "Batch Created",
        description: `Successfully ${batchToEdit ? "updated" : "created"} ${batchName}.`
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Save Failed",
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
      <DialogContent className="bg-[#1A1F26] border-white/20 text-white rounded-[3rem] overflow-hidden shadow-2xl p-0 max-w-xl ring-1 ring-white/10">
        <DialogHeader className="p-8 bg-white/[0.04] border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                  <Sparkles className="w-5 h-5" />
               </div>
               {batchToEdit ? "Edit Batch" : "Create New Batch"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-[#FF6B35] opacity-80 pl-1">Batch Name</Label>
            <Input 
              placeholder="e.g. SQUAD A, REHAB GROUP..." 
              value={batchName} 
              onChange={(e) => setBatchName(e.target.value)}
              className="h-16 bg-white/[0.08] border-white/20 rounded-[1.5rem] px-6 font-black italic text-lg focus:ring-primary/60 ring-1 ring-transparent transition-all text-white placeholder:text-white/10"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1 px-1">
              <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-[#FF6B35] opacity-80">Add Members ({selectedAthleteIds.length})</Label>
              <button 
                onClick={() => setSelectedAthleteIds(selectedAthleteIds.length === athletes.length ? [] : athletes.map(a => a.id))}
                className="text-[9px] font-black uppercase text-slate-300 hover:text-primary transition-colors"
              >
                {selectedAthleteIds.length === athletes.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            
            <div className="relative mb-3 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
              <Input 
                placeholder="Search athletes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 bg-white/[0.08] border-white/20 rounded-2xl pl-14 text-sm font-bold text-white placeholder:opacity-30 focus:ring-primary/40 focus:border-primary/40 transition-all ring-1 ring-transparent"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
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
                        "flex items-center justify-between p-4 rounded-[1.5rem] border transition-all cursor-pointer group shadow-sm",
                        isSelected 
                          ? "bg-primary/20 border-primary/40" 
                          : "bg-white/[0.05] border-white/10 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[10px] transition-all uppercase",
                          isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-white/5 border border-white/10 group-hover:border-primary/20"
                        )}>
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                        </div>
                        <div>
                          <div className="font-black text-slate-100 uppercase tracking-tight">{athlete.last_name}, {athlete.first_name}</div>
                          <div className="text-[9px] opacity-40 font-black uppercase tracking-widest">{athlete.uhid || "CLIENT RECORD"}</div>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary shadow-lg shadow-primary/40" : "border-white/10 group-hover:border-primary/40"
                      )}>
                         {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[4px]" />}
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
        </div>

        <DialogFooter className="p-8 bg-white/[0.04] border-t border-white/10 gap-3">
           <Button variant="ghost" onClick={onClose} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] opacity-40 hover:opacity-100 bg-transparent hover:bg-white/5 border-none">Cancel</Button>
           <Button 
             onClick={handleSave} 
             disabled={loading || !batchName.trim() || selectedAthleteIds.length === 0}
             className="rounded-2xl h-14 px-12 font-black uppercase tracking-[0.2em] text-[11px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-3 min-w-[180px]"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (batchToEdit ? "Update Batch" : "Create Batch")}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
