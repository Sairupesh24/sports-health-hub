import React, { useState, useEffect, useCallback, useMemo } from "react";
import { plannerStore, getTodayString } from "@/services/plannerStore";
import { DailyTask, DailyTaskPriority } from "@/types/planner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Bell, 
  Clock, 
  ExternalLink, 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  User, 
  Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Helper to convert "HH:MM" string to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export default function TaskReminderNotifier() {
  const { profile, user } = useAuth();
  const [activeReminder, setActiveReminder] = useState<DailyTask | null>(null);
  const [dismissedTaskMap, setDismissedTaskMap] = useState<Record<string, number>>(() => {
    try {
      const saved = sessionStorage.getItem("orbit_dismissed_task_reminders");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const currentUserId = profile?.id || user?.id;
  const currentUserName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim().toLowerCase()
    : (user?.email || "").toLowerCase();

  // Check if task belongs/assigned to current user
  const isTaskForCurrentUser = useCallback(
    (task: DailyTask) => {
      if (!currentUserId && !currentUserName) return true; // If no user profile loaded yet, monitor all
      if (task.assignee_id && String(task.assignee_id) === String(currentUserId)) return true;
      if (task.assigner_id && String(task.assigner_id) === String(currentUserId)) return true;
      if (task.creator_id && String(task.creator_id) === String(currentUserId)) return true;
      if (task.assignee_name && currentUserName && task.assignee_name.toLowerCase().includes(currentUserName)) return true;
      // Group task
      if (task.task_type === "group") return true;
      return true; // Allow all task reminders for staff awareness across modules
    },
    [currentUserId, currentUserName]
  );

  const checkReminders = useCallback(() => {
    const settings = plannerStore.getSettings();
    if (settings.enableReminders === false) {
      return;
    }

    const todayStr = getTodayString();
    const tasks = plannerStore.getTasks(todayStr);
    const leadMinutes = parseInt(settings.reminderLeadTime || "15", 10);

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const task of tasks) {
      // Skip completed or approved tasks
      if (task.status === "completed" || task.status === "approved") continue;

      const timeSlotStr = task.start_time || task.deadline_time;
      if (!timeSlotStr) continue;

      const scheduledMinutes = timeToMinutes(timeSlotStr);
      const triggerMinute = Math.max(0, scheduledMinutes - leadMinutes);

      // Trigger condition:
      // Current time is between triggerMinute and scheduledMinutes + 60 (within 1 hour after start)
      if (nowMinutes >= triggerMinute && nowMinutes <= scheduledMinutes + 60) {
        const dismissKey = `${todayStr}_${task.id}_${triggerMinute}`;
        const lastDismissedAt = dismissedTaskMap[dismissKey];

        // If not dismissed or dismissed more than 30 minutes ago
        if (!lastDismissedAt || Date.now() - lastDismissedAt > 30 * 60 * 1000) {
          if (isTaskForCurrentUser(task)) {
            setActiveReminder(task);
            return; // Show one active reminder at a time
          }
        }
      }
    }
  }, [dismissedTaskMap, isTaskForCurrentUser]);

  // Check immediately and every 10 seconds
  useEffect(() => {
    checkReminders();
    const timer = setInterval(checkReminders, 10000);
    const unsubscribe = plannerStore.subscribe(checkReminders);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [checkReminders]);

  const handleDismiss = (snoozeMinutes: number = 0) => {
    if (!activeReminder) return;
    const settings = plannerStore.getSettings();
    const leadMinutes = parseInt(settings.reminderLeadTime || "15", 10);
    const scheduledMinutes = timeToMinutes(activeReminder.start_time || activeReminder.deadline_time || "00:00");
    const triggerMinute = Math.max(0, scheduledMinutes - leadMinutes);
    const dismissKey = `${getTodayString()}_${activeReminder.id}_${triggerMinute}`;

    const newMap = {
      ...dismissedTaskMap,
      // If snooze, set dismissed timestamp such that it expires in snoozeMinutes
      [dismissKey]: snoozeMinutes > 0 ? Date.now() - (30 - snoozeMinutes) * 60 * 1000 : Date.now(),
    };
    setDismissedTaskMap(newMap);
    try {
      sessionStorage.setItem("orbit_dismissed_task_reminders", JSON.stringify(newMap));
    } catch {}
    setActiveReminder(null);
  };

  const handleOpenPlanner = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleDismiss(0);
    window.open("/planner", "_blank");
  };

  if (!activeReminder) return null;

  // Priority-based Visual Styling
  const priority = activeReminder.priority || "medium";

  const getPriorityTheme = (prio: DailyTaskPriority) => {
    switch (prio) {
      case "critical":
        return {
          cardBg: "bg-slate-950/95 border-rose-500 shadow-2xl shadow-rose-950/60 ring-2 ring-rose-500/50",
          headerBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          badgeBg: "bg-rose-500 text-white font-black animate-pulse",
          iconColor: "text-rose-400 animate-bounce",
          badgeLabel: "🔴 CRITICAL PRIORITY",
          titleColor: "text-white",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40",
          timeBadge: "bg-rose-950/80 text-rose-200 border-rose-800/60",
        };
      case "high":
        return {
          cardBg: "bg-slate-950/95 border-amber-500 shadow-2xl shadow-amber-950/60 ring-2 ring-amber-500/50",
          headerBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          badgeBg: "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black",
          iconColor: "text-amber-400",
          badgeLabel: "🟠 HIGH PRIORITY",
          titleColor: "text-white",
          btnColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/40",
          timeBadge: "bg-amber-950/80 text-amber-200 border-amber-800/60",
        };
      case "low":
        return {
          cardBg: "bg-slate-950/95 border-blue-500 shadow-2xl shadow-blue-950/50 ring-2 ring-blue-500/40",
          headerBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
          badgeBg: "bg-blue-500 text-white font-black",
          iconColor: "text-blue-400",
          badgeLabel: "🔵 LOW PRIORITY",
          titleColor: "text-white",
          btnColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/40",
          timeBadge: "bg-blue-950/80 text-blue-200 border-blue-800/60",
        };
      case "medium":
      default:
        return {
          cardBg: "bg-slate-950/95 border-yellow-500 shadow-2xl shadow-yellow-950/50 ring-2 ring-yellow-500/40",
          headerBg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
          badgeBg: "bg-yellow-500 text-slate-950 font-black",
          iconColor: "text-yellow-400",
          badgeLabel: "🟡 MEDIUM PRIORITY",
          titleColor: "text-white",
          btnColor: "bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-900/40",
          timeBadge: "bg-yellow-950/80 text-yellow-200 border-yellow-800/60",
        };
    }
  };

  const theme = getPriorityTheme(priority);

  return (
    <aside
      aria-label="Upcoming Task Reminder"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] max-w-md w-[calc(100vw-32px)] sm:w-[420px] transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-5"
    >
      <div 
        onClick={handleOpenPlanner}
        className={`rounded-3xl border p-4 sm:p-5 backdrop-blur-2xl text-left cursor-pointer relative overflow-hidden transition-transform hover:scale-[1.01] ${theme.cardBg}`}
      >
        {/* Accent Glow Top Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-rose-500" />

        {/* Header: Label, Priority Badge & Dismiss */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${theme.headerBg}`}>
              <Bell className={`w-4 h-4 ${theme.iconColor}`} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
                Task Reminder
              </span>
              <p className="text-[10px] text-slate-400 font-medium">OrbitFlow Scheduler</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider border-none ${theme.badgeBg}`}>
              {theme.badgeLabel}
            </Badge>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(0);
              }}
              className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Dismiss Reminder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Title */}
        <h3 className={`text-base sm:text-lg font-black tracking-tight leading-snug mb-1.5 uppercase italic ${theme.titleColor}`}>
          {activeReminder.title}
        </h3>

        {/* Task Description */}
        {activeReminder.description && (
          <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed mb-3">
            {activeReminder.description}
          </p>
        )}

        {/* Timing Slot & Assignment Info */}
        <div className="space-y-1.5 mb-3.5">
          <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border ${theme.timeBadge}`}>
            <Clock className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
            <span>
              {activeReminder.time_mode === "set_time" || (activeReminder.start_time && !activeReminder.end_time)
                ? `Today at ${activeReminder.start_time} (Set Time)`
                : activeReminder.start_time && activeReminder.end_time
                ? `Today: ${activeReminder.start_time} - ${activeReminder.end_time}`
                : `Deadline: ${activeReminder.deadline || activeReminder.date}`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-300 font-medium flex-wrap pt-0.5">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="text-slate-400">Assigned To:</span>
              <strong className="text-white font-bold">
                {activeReminder.assignee_name || "Myself"}
              </strong>
            </span>
            {activeReminder.assigner_name && (
              <span className="flex items-center gap-1 text-slate-400">
                <span>By:</span>
                <strong className="text-slate-200">{activeReminder.assigner_name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(5); // Snooze 5 mins
            }}
            className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            Snooze 5m
          </button>

          <Button
            size="sm"
            onClick={handleOpenPlanner}
            className={`font-black text-xs h-8 px-3.5 rounded-xl gap-1.5 ${theme.btnColor}`}
          >
            <span>Open in Planner</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
