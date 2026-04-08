import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  PhoneCall, 
  MessageSquare, 
  Calendar, 
  UserPlus, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

interface Interaction {
  id: string;
  interaction_type: string;
  response_text: string;
  follow_up_required: boolean;
  follow_up_at: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface EnquiryHistoryProps {
  enquiryId: string;
}

export function EnquiryHistory({ enquiryId }: EnquiryHistoryProps) {
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["enquiry_interactions", enquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiry_interactions")
        .select(`
          *,
          profiles:created_by (first_name, last_name)
        `)
        .eq("enquiry_id", enquiryId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Interaction[];
    },
    enabled: !!enquiryId,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-4 h-4" />;
      case 'booking': return <Calendar className="w-4 h-4" />;
      case 'converted': return <UserPlus className="w-4 h-4" />;
      case 'status_change': return <Clock className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'call': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'booking': return "bg-orange-50 text-orange-600 border-orange-100";
      case 'converted': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50/50 rounded-xl border border-dashed">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No interaction history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
      {interactions.map((item) => (
        <div key={item.id} className="relative pl-12">
          <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border flex items-center justify-center z-10 ${getInteractionColor(item.interaction_type)}`}>
            {getIcon(item.interaction_type)}
          </div>
          <div className="space-y-1 sm:space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold uppercase tracking-tighter text-slate-900">
                {item.interaction_type === 'call' ? 'Call Recorded' : 
                 item.interaction_type === 'booking' ? 'Guest Booking' : 
                 item.interaction_type === 'converted' ? 'Converted to Client' : 'Update'}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {format(new Date(item.created_at), "MMM d, yyyy • h:mm a")}
              </span>
            </div>
            
            <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-600 leading-relaxed italic">
                "{item.response_text || 'No comments recorded.'}"
              </p>
              
              {item.follow_up_at && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-[10px] font-bold uppercase text-orange-600">
                  <Clock className="w-3 h-3" />
                  Follow-up scheduled for {format(new Date(item.follow_up_at), "MMM d, yyyy")}
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-400 font-medium">
              Recorded by: <span className="text-slate-600">{item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : 'Unknown'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
