import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  History, 
  PhoneCall, 
  MessageSquare, 
  Calendar, 
  UserPlus, 
  Clock,
  Briefcase,
  Share2,
  Loader2,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EnquiryContextWindowProps {
  clientId: string;
  isMobile?: boolean;
}

export function EnquiryContextWindow({ clientId, isMobile = false }: EnquiryContextWindowProps) {
  const { data: enquiry, isLoading: enquiryLoading } = useQuery({
    queryKey: ["enquiry-context", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select(`
          *,
          organization:organizations(name, logo_url)
        `)
        .eq("linked_client_id", clientId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: interactions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ["enquiry-interactions-context", enquiry?.id],
    queryFn: async () => {
      if (!enquiry?.id) return [];
      const { data, error } = await supabase
        .from("enquiry_interactions")
        .select(`
          *,
          profiles:created_by (first_name, last_name)
        `)
        .eq("enquiry_id", enquiry.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!enquiry?.id,
  });

  if (enquiryLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fetching Enquiry Context...</p>
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Historical Enquiry Data</p>
        <p className="text-[10px] text-slate-400 mt-1">This patient may have been registered directly without an enquiry.</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-3 h-3" />;
      case 'booking': return <Calendar className="w-3 h-3" />;
      case 'converted': return <UserPlus className="w-3 h-3" />;
      case 'status_change': return <Clock className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#fcfaf2] rounded-2xl border border-[#e3dac9] shadow-sm overflow-hidden",
      isMobile ? "max-h-[80vh]" : ""
    )}>
      {/* Header - Clinic Branding */}
      <div className="p-4 border-b border-[#e3dac9] bg-[#f5efe0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/80 p-1 flex items-center justify-center border border-[#d6cbb3]">
            {enquiry.organization?.logo_url ? (
              <img src={enquiry.organization.logo_url} alt="Clinic Logo" className="w-full h-full object-contain grayscale opacity-60" />
            ) : (
              <History className="w-4 h-4 text-[#7d7461]" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-serif font-bold text-[#4a4439] italic tracking-tight">Lead History Archive</h3>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#948b76]">Immutable Context Window</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-[#fcfaf2] border-[#d6cbb3] text-[#7d7461] text-[9px] font-bold uppercase tracking-tighter">
          {enquiry.referral_source || 'Direct Entry'}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-8 font-serif text-[#4a4439]">
          {/* Initial Lead Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-bold text-[#948b76] block opacity-70">Primary Interest</label>
              <p className="text-sm font-medium leading-tight">{enquiry.looking_for}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest font-bold text-[#948b76] block opacity-70">Callback Preference</label>
              <p className="text-sm font-medium leading-tight">{enquiry.preferred_call_time || 'No preference'}</p>
            </div>
            <div className="space-y-1 col-span-2 pt-4 border-t border-[#e3dac9]/50">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-3 h-3 text-[#948b76]" />
                <span className="text-[9px] text-[#948b76] font-bold uppercase tracking-widest">Pre-Registration Context</span>
              </div>
              <p className="text-xs leading-relaxed italic opacity-75">
                The lead originated while the patient was associated with <span className="font-bold border-b border-[#d6cbb3]">{enquiry.work_place || 'an unspecified organization'}</span>. 
                {enquiry.referral_details && ` Additional context: ${enquiry.referral_details}.`}
              </p>
            </div>
          </div>

          {/* Timeline of Interactions */}
          <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-[#e3dac9]/60">
            {/* Original Form Submission */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-0.5 w-[22px] h-[22px] rounded-full bg-[#f5efe0] border border-[#d6cbb3] flex items-center justify-center z-10">
                <History className="w-3 h-3 text-[#7d7461]" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#948b76]">Initial Web Enquiry</span>
                  <span className="text-[9px] font-medium text-[#948b76]/60">
                    {format(new Date(enquiry.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="p-4 bg-white/40 rounded-xl border border-[#e3dac9] shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#d6cbb3]/30" />
                  <p className="text-xs leading-relaxed italic opacity-80">
                    "{enquiry.notes || 'Patient submitted enquiry form without additional comments.'}"
                  </p>
                </div>
              </div>
            </div>

            {interactions.map((item: any) => (
              <div key={item.id} className="relative pl-8">
                <div className="absolute left-0 top-0.5 w-[22px] h-[22px] rounded-full bg-[#f5efe0] border border-[#d6cbb3] flex items-center justify-center z-10">
                  {getIcon(item.interaction_type)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#948b76]">
                      {item.interaction_type === 'call' ? 'Phone Conversation' : 
                       item.interaction_type === 'booking' ? 'Guest Appointment' : 
                       item.interaction_type === 'converted' ? 'Status: Converted' : 'Staff Interaction'}
                    </span>
                    <span className="text-[9px] font-medium text-[#948b76]/60">
                      {format(new Date(item.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="p-4 bg-white/40 rounded-xl border border-[#e3dac9] shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#d6cbb3]/30" />
                    <p className="text-xs leading-relaxed opacity-90">
                      {item.response_text || 'Action recorded in CRM.'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3 text-[8px] uppercase tracking-[0.15em] text-[#948b76] font-bold">
                      <span className="opacity-50 italic">Logged by</span>
                      <span>{item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : 'Front Office'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-4 bg-[#f5efe0] border-t border-[#e3dac9] text-center">
        <p className="text-[8px] uppercase tracking-[0.3em] font-black text-[#7d7461]/40">
          Integrated Sports Health & Physio Operating System Archive
        </p>
      </div>
    </div>
  );
}
