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
  Sparkles,
  Loader2,
  Filter,
  Crown,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface BulkAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  form: any;
}

export default function BulkAssignmentModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  form
}: BulkAssignmentModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Filters
  const [sportFilter, setSportFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  
  // Filter Options
  const [sports, setSports] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchFilterOptions();
    }
  }, [isOpen]);

  const fetchFilterOptions = async () => {
    try {
      const orgId = profile?.organization_id;
      if (!orgId) return;

      // Fetch Sports & Teams
      const { data: clientData } = await supabase
        .from('clients')
        .select('sport, org_name')
        .eq('organization_id', orgId)
        .is('deleted_at', null);
      
      if (clientData) {
        setSports(Array.from(new Set(clientData.map(c => c.sport).filter(Boolean))) as string[]);
        setTeams(Array.from(new Set(clientData.map(c => c.org_name).filter(Boolean))) as string[]);
      }

    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  const fetchClients = async () => {
    try {
      setFetching(true);
      const { data: userAuth } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userAuth.user?.id)
        .single();

      if (!profile) throw new Error("No organization found");

      const { data, error } = await supabase
        .from('clients')
        .select(`
          id, 
          first_name, 
          last_name, 
          uhid, 
          is_vip, 
          sport, 
          org_name, 
          primary_scientist_id
        `)
        .eq('organization_id', profile.organization_id)
        .is('deleted_at', null);

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching clients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = `${c.first_name} ${c.last_name} ${c.uhid}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = sportFilter === "all" || c.sport === sportFilter;
    const matchesTeam = teamFilter === "all" || c.org_name === teamFilter;
    return matchesSearch && matchesSport && matchesTeam;
  });

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredClients.map(c => c.id);
    const allSelected = allFilteredIds.every(id => selectedClientIds.includes(id));
    
    if (allSelected) {
      setSelectedClientIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedClientIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedClientIds.length === 0) return;

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

      // 1. Create Bulk Assignment Record
      const { data: bulkData, error: bulkError } = await (supabase
        .from('bulk_assignments' as any)
        .insert({
          org_id: orgId,
          questionnaire_id: form.id,
          specialist_id: user.id,
          total_clients: selectedClientIds.length,
          responded_count: 0,
          status: 'active'
        } as any) as any)
        .select()
        .single();

      if (bulkError) throw bulkError;

      // 2. Create individual form_responses
      const responses = selectedClientIds.map(clientId => ({
        org_id: orgId,
        form_id: form.id,
        client_id: clientId,
        specialist_id: user.id,
        bulk_assignment_id: bulkData.id,
        status: 'pending'
      }));

      const { error: respError } = await supabase
        .from('form_responses' as any)
        .insert(responses as any);

      if (respError) throw respError;

      // 3. Create notifications for each client (Simplified for now)
      const notifications = selectedClientIds.map(clientId => ({
        user_id: clientId,
        org_id: orgId,
        title: "New Questionnaire Assigned",
        message: `Please complete the ${form.name} assessment.`,
        type: 'questionnaire'
      }));

      await supabase.from('notifications' as any).insert(notifications as any);

      toast({
        title: "Bulk Assignment Successful",
        description: `Successfully assigned ${form.name} to ${selectedClientIds.length} clients.`
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

  const vipCount = clients.filter(c => selectedClientIds.includes(c.id) && c.is_vip).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0F172A] border-white/10 text-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl p-0 sm:max-w-4xl max-w-[95vw] ring-1 ring-white/5 h-[90vh] sm:h-[80vh] flex flex-col">
        <DialogHeader className="p-2 sm:p-4 bg-white/[0.02] border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="max-w-[70%]">
              <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2 sm:gap-3 italic leading-tight">
                 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20 shrink-0">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                 </div>
                 <div className="truncate">
                    <span className="text-primary">Assign</span> Questionnaire
                 </div>
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1 ml-1 truncate">
                 Distributing: {form.name}
              </p>
            </div>
            
            <div className="text-right hidden md:block pr-8">
               <div className="text-2xl font-black italic text-primary">{selectedClientIds.length}</div>
               <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Target Recipients</div>
            </div>
          </div>
        </DialogHeader>

        {/* Filters Area */}
        <div className="px-4 sm:px-8 py-2 sm:py-3 bg-white/[0.01] border-b border-white/5 flex flex-wrap gap-2 sm:gap-4 items-end flex-shrink-0">
            <div className="space-y-1.5 flex-1 sm:flex-none sm:shrink-0">
              <Label className="text-[8px] uppercase font-black tracking-widest text-white/40 pl-1">Sport</Label>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-12 sm:h-10 bg-white/[0.05] border-white/10 rounded-xl text-[12px] sm:text-[10px] font-black uppercase text-white hover:bg-white/[0.08] transition-all">
                  <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border border-white/20 text-white shadow-2xl z-[100] max-w-[90vw]">
                  <SelectItem value="all" className="font-black uppercase text-[10px] tracking-widest !text-white focus:bg-primary focus:!text-white">All Sports</SelectItem>
                  {sports.map(s => <SelectItem key={s} value={s} className="font-black uppercase text-[10px] tracking-widest !text-white focus:bg-primary focus:!text-white truncate">{s}</SelectItem>)}
                </SelectContent>
             </Select>
            </div>

            <div className="space-y-1.5 flex-1 sm:flex-none sm:shrink-0">
              <Label className="text-[8px] uppercase font-black tracking-widest text-white/40 pl-1">Squad / Team</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-12 sm:h-10 bg-white/[0.05] border-white/10 rounded-xl text-[12px] sm:text-[10px] font-black uppercase text-white hover:bg-white/[0.08] transition-all">
                  <SelectValue placeholder="All Squads" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F172A] border border-white/20 text-white shadow-2xl z-[100] max-w-[90vw]">
                  <SelectItem value="all" className="font-black uppercase text-[10px] tracking-widest !text-white focus:bg-primary focus:!text-white">All Squads</SelectItem>
                  {teams.map(t => <SelectItem key={t} value={t} className="font-black uppercase text-[10px] tracking-widest !text-white focus:bg-primary focus:!text-white truncate">{t}</SelectItem>)}
                </SelectContent>
             </Select>
            </div>


            <div className="w-full sm:flex-1 sm:min-w-[150px] space-y-1 mt-1 sm:mt-0">
              <Label className="text-[10px] sm:text-[8px] uppercase font-black tracking-widest text-white/40 pl-1 leading-none">Search Clients</Label>
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Name or UHID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 sm:h-10 bg-white/[0.05] border-white/10 rounded-xl pl-10 text-[13px] sm:text-[11px] font-bold placeholder:text-white/20 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
        </div>

        {/* Selection Area */}
        <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-8 pb-2 pt-1">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-3">
               <h4 className="text-[10px] uppercase font-black tracking-widest text-white/60">Matching Clients ({filteredClients.length})</h4>
               {vipCount > 0 && (
                 <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/20 px-2 py-0 text-[8px] font-black uppercase">
                   {vipCount} VIP{vipCount > 1 ? 's' : ''} Selected
                 </Badge>
               )}
            </div>
            <button 
              onClick={handleSelectAll}
              className="text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors"
            >
              {filteredClients.length > 0 && filteredClients.every(c => selectedClientIds.includes(c.id)) ? "Deselect Filtered" : "Select All Filtered"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {fetching ? (
              [1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-white/[0.02] rounded-2xl animate-pulse" />)
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const isSelected = selectedClientIds.includes(client.id);
                return (
                  <div 
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer group",
                      isSelected 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-black text-[9px] transition-all uppercase",
                        isSelected ? "bg-primary text-white" : "bg-white/5 text-white/40"
                      )}>
                        {client.first_name?.[0]}{client.last_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[12px] uppercase tracking-tight">{client.first_name} {client.last_name}</span>
                          {client.is_vip && <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0">
                           <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{client.uhid}</span>
                           <span className="text-[8px] font-black text-primary/60 uppercase">{client.sport || "General"}</span>
                           <span className="text-[8px] font-bold text-white/20 uppercase">/</span>
                           <span className="text-[8px] font-bold text-white/20 uppercase truncate max-w-[150px] sm:max-w-[250px]">{client.org_name || "Unassigned Squad"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/20"
                    )}>
                       {isSelected && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 opacity-30">
                 <Users className="w-12 h-12 mb-4" />
                 <p className="text-[11px] font-black uppercase tracking-widest">No matching athletes found</p>
              </div>
            )}
          </div>
        </div>

        {/* Static Bottom Action Bar */}
        <DialogFooter className="px-4 sm:px-8 py-2 sm:py-3 bg-white/[0.02] border-t border-white/10 flex-shrink-0 flex-row gap-2 sm:gap-4">
          <div className="flex-1 flex items-center gap-4 text-white/40 hidden md:flex">
             <div className="flex items-center gap-2">
               <Info className="w-4 h-4" />
               <span className="text-[9px] font-bold uppercase tracking-widest italic">Attributed to: {user?.email?.split('@')[0] || 'Specialist'}</span>
             </div>
          </div>
          
          <Button variant="ghost" onClick={onClose} className="h-10 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-white/40 hover:bg-white/5 hover:text-white transition-all shrink-0">
            Cancel
          </Button>
          
          <Button 
            disabled={loading || selectedClientIds.length === 0}
            onClick={handleBulkAssign}
            className="flex-1 h-10 px-4 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest sm:tracking-[0.2em] shadow-2xl shadow-primary/20 gap-2 sm:gap-3"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                Confirm Assignment
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
