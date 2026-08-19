import React from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, Bot, ClipboardList, Calendar, UserCheck, Stethoscope, Apple, CreditCard, BarChart3 } from "lucide-react";
import type { ChatMessage } from "@/hooks/useMessenger";

interface Props {
  message: ChatMessage;
}

const MODULE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string; label: string; btn: string }
> = {
  planner: {
    icon: <ClipboardList className="h-4 w-4" />,
    color: "text-fuchsia-700",
    bg: "bg-fuchsia-50/80",
    border: "border-fuchsia-200",
    label: "OrbitFlow Planner",
    btn: "bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-800 border-fuchsia-300",
  },
  appointments: {
    icon: <Calendar className="h-4 w-4" />,
    color: "text-blue-700",
    bg: "bg-blue-50/80",
    border: "border-blue-200",
    label: "Appointments",
    btn: "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300",
  },
  hr: {
    icon: <UserCheck className="h-4 w-4" />,
    color: "text-sky-700",
    bg: "bg-sky-50/80",
    border: "border-sky-200",
    label: "HR & Workforce",
    btn: "bg-sky-100 hover:bg-sky-200 text-sky-800 border-sky-300",
  },
  clinical: {
    icon: <Stethoscope className="h-4 w-4" />,
    color: "text-teal-700",
    bg: "bg-teal-50/80",
    border: "border-teal-200",
    label: "Clinical",
    btn: "bg-teal-100 hover:bg-teal-200 text-teal-800 border-teal-300",
  },
  nutrition: {
    icon: <Apple className="h-4 w-4" />,
    color: "text-amber-700",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    label: "Nutritionist",
    btn: "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300",
  },
  billing: {
    icon: <CreditCard className="h-4 w-4" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    label: "Billing",
    btn: "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300",
  },
  reports: {
    icon: <BarChart3 className="h-4 w-4" />,
    color: "text-rose-700",
    bg: "bg-rose-50/80",
    border: "border-rose-200",
    label: "Reports",
    btn: "bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300",
  },
};

function parseMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

const AutomatedMessageCard: React.FC<Props> = ({ message }) => {
  const meta = message.metadata as Record<string, string> | null;
  const module = meta?.module || "reports";
  const config = MODULE_CONFIG[module] || MODULE_CONFIG.reports;
  const actionUrl = meta?.action_url;
  const actionLabel = meta?.action_label || "View Details";
  const isReport = message.message_type === "automated_report";

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-2xl border px-4 py-3 my-1 max-w-2xl shadow-xs transition-all",
        config.bg,
        config.border
      )}
    >
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center justify-center h-6 w-6 rounded-lg bg-white shadow-2xs", config.color)}>
            {config.icon}
          </div>
          <div className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-700">HubBot · {config.label}</span>
          </div>
          <span className="text-[10px] text-slate-400 ml-auto font-medium">
            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Content */}
        {isReport ? (
          <div className="text-xs text-slate-800 leading-relaxed space-y-0.5">
            {message.content?.split("\n").map((line, i) => (
              <p
                key={i}
                className={cn(
                  line.startsWith("📊") ||
                    line.startsWith("📅") ||
                    line.startsWith("💰") ||
                    line.startsWith("⏰") ||
                    line.startsWith("🏥")
                    ? "font-bold text-slate-900 mb-1"
                    : "text-slate-700 text-xs"
                )}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }}
              />
            ))}
          </div>
        ) : (
          <p
            className="text-xs text-slate-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content || "") }}
          />
        )}

        {/* Action button */}
        {actionUrl && !isReport && (
          <a
            href={actionUrl}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border transition-all w-fit mt-1 shadow-2xs",
              config.btn
            )}
          >
            {actionLabel}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
};

export default AutomatedMessageCard;
