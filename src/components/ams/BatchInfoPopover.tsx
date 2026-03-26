import React, { useState, useEffect } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Info, 
  X, 
  UserPlus, 
  Search,
  Loader2,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";

interface BatchInfoPopoverProps {
  batch: any;
  onUpdate?: () => void;
  onManage?: () => void;
}

export default function BatchInfoPopover({ batch, onUpdate, onManage }: BatchInfoPopoverProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (batch?.id) {
      fetchMembers();
    }
  }, [batch?.id]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('batch_members' as any)
        .select(`
          athlete_id,
          athlete:profiles!batch_members_athlete_id_fkey(id, first_name, last_name, uhid)
        `)
        .eq('batch_id', batch.id);
      
      if (error) throw error;
      setMembers(data.map((m: any) => m.athlete) || []);
    } catch (error: any) {
      console.error("Error fetching members:", error);
    }
  };


  const removeMember = async (athleteId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('batch_members' as any)
        .delete()
        .eq('batch_id', batch.id)
        .eq('athlete_id', athleteId);
      
      if (error) throw error;
      
      toast({
        title: "Member Removed",
        description: "Athlete has been removed from the batch."
      });
      
      fetchMembers();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="p-1 px-2 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1 group/info"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-4 h-4 text-white/40 group-hover/info:text-primary transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-white/20 bg-[#1A1F26] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 z-50" align="start">
         <div className="p-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-1">
               <h3 className="font-black uppercase tracking-tight text-white/90 text-sm">{batch.name} Members</h3>
               <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{members.length}</span>
            </div>
            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Manage batch participants</p>
         </div>

         <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 no-scrollbar">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group/member">
                 <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-white/10 ring-1 ring-white/5">
                       <AvatarFallback className="bg-white/5 text-[9px] font-black text-white/60">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                       </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                       <span className="text-xs font-bold text-white uppercase tracking-tight truncate">{member.last_name}, {member.first_name}</span>
                       <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">{member.uhid || "CLIENT"}</span>
                    </div>
                 </div>
                 <button 
                  onClick={() => removeMember(member.id)}
                  className="p-1.5 hover:bg-red-500/20 text-white/20 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover/member:opacity-100"
                  disabled={loading}
                 >
                    <X className="w-3.5 h-3.5" />
                 </button>
              </div>
            ))}

            {members.length === 0 && !loading && (
              <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/5 m-2">
                 <Users className="w-8 h-8 text-white/5 mx-auto mb-2" />
                 <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Empty Batch</p>
              </div>
            )}
         </div>

         <div className="p-4 border-t border-white/10 bg-black/20">
            <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onManage?.();
                }}
                className="w-full h-11 border-primary/20 bg-primary/10 hover:bg-primary text-primary hover:text-white font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl transition-all border shadow-lg shadow-primary/5"
            >
                <UserPlus className="w-4 h-4" /> Manage Members
            </Button>
         </div>
      </PopoverContent>
    </Popover>
  );
}
