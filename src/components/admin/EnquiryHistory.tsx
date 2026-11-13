import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { 
  PhoneCall, 
  MessageCircle, 
  UserCheck, 
  Calendar, 
  UserPlus, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Mail,
  Flame,
  Sun,
  Snowflake,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Interaction {
  id: string;
  interaction_type: string;
  response_text: string;
  disposition?: string | null;
  follow_up_required: boolean;
  follow_up_at: string | null;
  follow_up_note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  profession?: string;
  user_role?: string;
}

interface EnquiryHistoryProps {
  enquiryId: string;
}

export function EnquiryHistory({ enquiryId }: EnquiryHistoryProps) {
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["enquiry_interactions", enquiryId],
    queryFn: async () => {
      const data = await apiFetch<{ data: Interaction[] }>(`/clients/enquiries/${enquiryId}/interactions`);
      return data?.data || [];
    },
    enabled: !!enquiryId,
  });

  const getChannelBadge = (type: string) => {
    switch (type) {
      case 'call':
        return {
          icon: <PhoneCall className="w-3.5 h-3.5 text-blue-600" />,
          label: "Phone Call",
          bg: "bg-blue-50 text-blue-700 border-blue-200"
        };
      case 'whatsapp':
        return {
          icon: <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />,
          label: "WhatsApp Chat",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200"
        };
      case 'visit':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-indigo-600" />,
          label: "Clinic Walk-in",
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200"
        };
      case 'email':
        return {
          icon: <Mail className="w-3.5 h-3.5 text-purple-600" />,
          label: "Email",
          bg: "bg-purple-50 text-purple-700 border-purple-200"
        };
      case 'booking':
        return {
          icon: <Calendar className="w-3.5 h-3.5 text-orange-600" />,
          label: "Session Booked",
          bg: "bg-orange-50 text-orange-700 border-orange-200"
        };
      case 'converted':
        return {
          icon: <UserPlus className="w-3.5 h-3.5 text-emerald-600" />,
          label: "Converted to Patient",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300"
        };
      case 'callback_scheduled':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          label: "Callback Scheduled",
          bg: "bg-amber-50 text-amber-700 border-amber-200"
        };
      case 'form_submission':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-teal-600" />,
          label: "Form Submitted",
          bg: "bg-teal-50 text-teal-700 border-teal-200"
        };
      default:
        return {
          icon: <FileText className="w-3.5 h-3.5 text-slate-600" />,
          label: "Note / Update",
          bg: "bg-slate-50 text-slate-700 border-slate-200"
        };
    }
  };

  const getSentimentPill = (sentiment?: string) => {
    switch (sentiment) {
      case 'hot':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[10px] font-bold">
            <Flame className="w-3 h-3 text-rose-500" /> Hot Lead
          </Badge>
        );
      case 'cold':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1 text-[10px] font-bold">
            <Snowflake className="w-3 h-3 text-slate-400" /> Cold
          </Badge>
        );
      case 'warm':
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Loading History...</p>
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No interaction history yet</p>
        <p className="text-[11px] text-slate-400 mt-1">Click "Add Interaction" or "Called" to log the first outreach.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-px before:bg-slate-200">
      {interactions.map((item) => {
        const channelMeta = getChannelBadge(item.interaction_type);
        const meta = item.metadata || {};
        const sentiment = meta.sentiment;
        const callbackDate = item.follow_up_at ? new Date(item.follow_up_at) : null;
        const isCallbackOverdue = callbackDate && isPast(callbackDate);

        return (
          <div key={item.id} className="relative pl-12">
            {/* Timeline icon */}
            <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border flex items-center justify-center z-10 bg-white shadow-xs ${channelMeta.bg}`}>
              {channelMeta.icon}
            </div>

            <div className="space-y-2">
              {/* Header: Channel, When Contacted, Relative Time */}
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider py-0 px-2 ${channelMeta.bg}`}>
                    {channelMeta.label}
                  </Badge>
                  {getSentimentPill(sentiment)}
                  {item.disposition && (
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      {item.disposition}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {format(new Date(item.created_at), "MMM d, yyyy • h:mm a")}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Conversation Box */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  {item.response_text || 'No conversation details provided.'}
                </p>

                {/* Callback Alert if scheduled */}
                {callbackDate && (
                  <div className={`pt-2 mt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-semibold ${
                    isCallbackOverdue 
                      ? "text-rose-700 border-rose-100 bg-rose-50/50 p-2 rounded-lg" 
                      : "text-amber-800 border-amber-100 bg-amber-50/50 p-2 rounded-lg"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isCallbackOverdue ? "⚠️ Overdue Callback: " : "Callback Scheduled: "}
                        {format(callbackDate, "EEE, MMM d • h:mm a")}
                      </span>
                    </div>

                    {item.follow_up_note && (
                      <span className="text-[10px] font-normal italic text-slate-600 sm:text-right">
                        "{item.follow_up_note}"
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Staff Attribution */}
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium pl-1">
                <span>Logged by:</span>
                <span className="text-slate-700 font-semibold">
                  {item.first_name ? `${item.first_name} ${item.last_name || ''}` : 'System'}
                </span>
                {item.user_role && (
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider">
                    ({item.user_role})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
