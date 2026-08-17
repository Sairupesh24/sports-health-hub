import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarClock,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  UserCheck,
  Calendar as CalendarIcon,
  Filter,
  CheckCircle,
  XCircle,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  Star,
  MapPin,
  MoreVertical,
  RotateCw,
  Edit,
  Info,
  Settings,
  UserPlus,
  LayoutGrid,
  UserCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { plannerStore, getTodayString } from "@/services/plannerStore";
import { DailyTask, DailyTaskStatus, DailyTaskPriority, TaskType } from "@/types/planner";
import NewTaskDialog from "@/components/planner/NewTaskDialog";
import NewTeamDialog from "@/components/planner/NewTeamDialog";
import ApprovalActionModal from "@/components/planner/ApprovalActionModal";
import { toast } from "@/hooks/use-toast";

const categoryConfig: Record<string, { label: string; color: string }> = {
  clinical_care: { label: "Clinical Care", color: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200" },
  rehab_evaluation: { label: "Rehab Evaluation", color: "text-blue-700 bg-blue-50 border-blue-200" },
  staff_briefing: { label: "Staff Briefing", color: "text-amber-700 bg-amber-50 border-amber-200" },
  equipment_check: { label: "Equipment Check", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  administrative: { label: "Administrative", color: "text-purple-700 bg-purple-50 border-purple-200" },
  training: { label: "Training", color: "text-sky-700 bg-sky-50 border-sky-200" },
  other: { label: "Other", color: "text-slate-700 bg-slate-50 border-slate-200" },
};

const priorityConfig: Record<DailyTaskPriority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-rose-500 text-white" },
  high: { label: "High", color: "bg-amber-500 text-white" },
  medium: { label: "Medium", color: "bg-blue-500 text-white" },
  low: { label: "Low", color: "bg-slate-500 text-white" },
};

const getDeadlineStatus = (deadlineDate?: string, isCompleted?: boolean) => {
  if (!deadlineDate) return null;
  const today = getTodayString();
  const dToday = new Date(today + "T00:00:00");
  const dDead = new Date(deadlineDate + "T00:00:00");
  const diffDays = Math.round((dDead.getTime() - dToday.getTime()) / (1000 * 60 * 60 * 24));

  if (isCompleted) {
    return {
      label: `Deadline: ${deadlineDate}`,
      color: "bg-slate-100 text-slate-600 border-slate-200",
      isOverdue: false,
    };
  }

  if (diffDays < 0) {
    return {
      label: `⚠️ Overdue (${Math.abs(diffDays)}d ago)`,
      color: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
      isOverdue: true,
    };
  }
  if (diffDays === 0) {
    return {
      label: `🔥 Due Today`,
      color: "bg-amber-100 text-amber-900 border-amber-300 font-black",
      isOverdue: false,
    };
  }
  if (diffDays === 1) {
    return {
      label: `⏳ Due Tomorrow`,
      color: "bg-orange-50 text-orange-800 border-orange-200 font-bold",
      isOverdue: false,
    };
  }
  return {
    label: `🎯 Due ${deadlineDate} (${diffDays}d left)`,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold",
    isOverdue: false,
  };
};

export default function MobilePlannerDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [tasks, setTasks] = useState<DailyTask[]>(plannerStore.getTasks(selectedDate));
  
  // Filter active metric shortcut selection: "all" | "today" | "scheduled" | "approvals" | "individual" | "group" | "completed"
  const [activeMetricFilter, setActiveMetricFilter] = useState<string>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Horizontal Team Chips Carousel Ref & Scroll Handler
  const teamChipsRef = React.useRef<HTMLDivElement>(null);
  const scrollTeamChips = (direction: "left" | "right") => {
    if (teamChipsRef.current) {
      const scrollAmount = 240;
      teamChipsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Task Details Modal state
  const [detailedTask, setDetailedTask] = useState<DailyTask | null>(null);

  // Dialogs state
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [approvalModalTask, setApprovalModalTask] = useState<DailyTask | null>(null);
  const [approvalMode, setApprovalMode] = useState<"approve" | "reject">("approve");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const teams = plannerStore.getTeams();
  const members = plannerStore.getMembers();

  const refreshData = () => {
    setTasks(plannerStore.getTasks(selectedDate));
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = plannerStore.subscribe(refreshData);
    return unsubscribe;
  }, [selectedDate]);

  // Check if logged in user is the designated approver for a task
  const userFullName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "";
  const userFirstName = profile?.first_name ? profile.first_name.trim() : "";
  const userLastName = profile?.last_name ? profile.last_name.trim() : "";

  const isCurrentUserApprover = (task: DailyTask): boolean => {
    if (!profile) return false;
    // Match by ID
    if (task.approver_id && profile.id && String(task.approver_id) === String(profile.id)) {
      return true;
    }
    // Match by Name
    if (task.approver_name && userFullName) {
      const taskApp = task.approver_name.toLowerCase().trim().replace(/^dr\.\s*/, "");
      const userFull = userFullName.toLowerCase().trim().replace(/^dr\.\s*/, "");
      if (taskApp === userFull) return true;
      if (userLastName && userFirstName) {
        const uFirst = userFirstName.toLowerCase();
        const uLast = userLastName.toLowerCase();
        if (taskApp.includes(uFirst) && taskApp.includes(uLast)) return true;
      }
      if (taskApp.includes(userFull) || userFull.includes(taskApp)) return true;
    }
    return false;
  };

  // Date Shift Helper
  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const isToday = selectedDate === getTodayString();

  // Handle Circular Checkbox Toggle
  const handleToggleTaskCompletion = (task: DailyTask, e: React.MouseEvent) => {
    e.stopPropagation();

    if (task.status === "completed" || task.status === "approved") {
      // Re-open task
      plannerStore.updateTaskStatus(task.id, "scheduled");
      toast({
        title: "Task Re-opened",
        description: `Task "${task.title}" status reset to scheduled.`,
      });
      return;
    }

    if (task.requires_approval) {
      plannerStore.updateTaskStatus(task.id, "under_review");
      toast({
        title: "Submitted for Approval",
        description: `Task "${task.title}" completed and submitted for manager approval.`,
      });
    } else {
      plannerStore.updateTaskStatus(task.id, "completed");
      toast({
        title: "Task Completed",
        description: `Task "${task.title}" marked as completed.`,
      });
    }
  };

  // Filter Tasks List
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignee_name && t.assignee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assigner_name && t.assigner_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.team_name && t.team_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const isIndividual = t.task_type === "individual" || Boolean(t.assignee_id);
    const isCompleted = t.status === "completed" || t.status === "approved";
    const isPendingApproval = t.requires_approval && (t.approval_status === "pending" || t.status === "under_review");

    let matchesMetric = true;
    if (activeMetricFilter === "today") matchesMetric = t.date === getTodayString();
    else if (activeMetricFilter === "scheduled") matchesMetric = t.status === "scheduled" || t.status === "in_progress";
    else if (activeMetricFilter === "approvals") {
      // Strict Approver Queue: show only tasks where the logged-in user is the designated approver
      // Includes pending approval tasks + approved tasks (rendered with strikethrough text)
      const isMyApprovalTask = isCurrentUserApprover(t);
      const isPendingForMe = isPendingApproval && isMyApprovalTask;
      const isApprovedByMe = (t.status === "approved" || t.approval_status === "approved") && t.requires_approval && isMyApprovalTask;
      matchesMetric = isPendingForMe || isApprovedByMe;
    }
    else if (activeMetricFilter === "individual") matchesMetric = isIndividual;
    else if (activeMetricFilter === "group") matchesMetric = !isIndividual;
    else if (activeMetricFilter === "completed") matchesMetric = isCompleted;

    const matchesTeam =
      selectedTeamId === "all" ||
      t.team_id === selectedTeamId ||
      (t.team_name && t.team_name.toLowerCase() === selectedTeamId.toLowerCase());

    return matchesSearch && matchesMetric && matchesTeam;
  });

  // Next Day Date & Uncompleted Scheduled Tasks Helper
  const getNextDayString = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const nextDayDateString = getNextDayString(getTodayString());
  const allStoreTasks = plannerStore.getTasks();
  const nextDayScheduledCount = allStoreTasks.filter(
    (t) => t.date === nextDayDateString && t.status !== "completed" && t.status !== "approved"
  ).length;

  // Calculate Metrics Counts
  const todayCount = tasks.filter((t) => t.date === getTodayString()).length;
  const approvalsCount = tasks.filter((t) => t.requires_approval && (t.approval_status === "pending" || t.status === "under_review") && isCurrentUserApprover(t)).length;
  const individualCount = tasks.filter((t) => t.task_type === "individual" || Boolean(t.assignee_id)).length;
  const groupCount = tasks.filter((t) => t.task_type === "group" || (!t.assignee_id && Boolean(t.team_id))).length;
  const completedCount = tasks.filter((t) => t.status === "completed" || t.status === "approved").length;

  return (
    <div className="h-screen flex flex-col bg-[#f3f4fd] text-slate-900 font-sans antialiased overflow-hidden w-full relative">
      
      {/* Light Clean Top Header - Samsung One UI Inspired */}
      <header className="flex-shrink-0 z-40 bg-[#f3f4fd]/95 backdrop-blur-md px-3.5 sm:px-6 py-3.5 border-b border-purple-100/60 shadow-2xs">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1e295b]">
                  Daily Tasks
                </h1>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-extrabold text-[10px] px-2">
                  OrbitFlow
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                {todayCount} tasks today • {approvalsCount} awaiting your sign-off
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-700 hover:bg-white hover:text-slate-900 rounded-full"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-700 hover:bg-white hover:text-slate-900 rounded-full"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white border border-purple-100 rounded-2xl shadow-xl p-1 text-xs">
                <DropdownMenuItem onClick={refreshData} className="rounded-xl py-2 gap-2 font-medium">
                  <RotateCw className="w-4 h-4 text-fuchsia-600" />
                  Sync / Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setNewTeamOpen(true)} className="rounded-xl py-2 gap-2 font-medium">
                  <UserPlus className="w-4 h-4 text-fuchsia-600" />
                  + Form New Team
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/planner/teams")} className="rounded-xl py-2 gap-2 font-medium text-slate-800">
                  <Users className="w-4 h-4 text-blue-600" />
                  Teams Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/planner/settings")} className="rounded-xl py-2 gap-2 font-medium text-slate-800">
                  <Settings className="w-4 h-4 text-slate-700" />
                  Planner Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/app-gallery")} className="rounded-xl py-2 gap-2 font-medium text-slate-800">
                  <LayoutGrid className="w-4 h-4 text-purple-600" />
                  App Gallery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl py-2 gap-2 font-medium text-slate-800">
                  <UserCircle className="w-4 h-4 text-emerald-600" />
                  My Profile ({profile?.first_name || "Account"})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="rounded-xl py-2 gap-2 font-medium text-rose-600 hover:bg-rose-50 cursor-pointer">
                  <LogOut className="w-4 h-4 text-rose-600" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Collapsible Search Input */}
      {showSearch && (
        <div className="flex-shrink-0 px-3.5 sm:px-6 py-2 bg-white/80 border-b border-purple-100 z-30">
          <div className="max-w-2xl mx-auto w-full">
            <Input
              placeholder="Search task title, staff, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs bg-white border-purple-200 text-slate-900 rounded-xl"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Main Container - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-6 pt-3 space-y-4 max-w-2xl mx-auto w-full">

        {/* 6 PASTEL METRIC SHORTCUT CARDS (2 Rows of 3 Cards) - Exactly like reference screenshot */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          
          {/* Card 1: Today */}
          <button
            onClick={() => setActiveMetricFilter(activeMetricFilter === "today" ? "all" : "today")}
            className={`p-3 rounded-2xl bg-white border transition-all text-left space-y-2 shadow-xs ${
              activeMetricFilter === "today"
                ? "border-rose-400 ring-2 ring-rose-300"
                : "border-slate-100 hover:border-purple-200"
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Today</p>
              <h4 className="text-sm font-black text-slate-900">{todayCount}</h4>
            </div>
          </button>

          {/* Card 2: Scheduled (Next Day) */}
          <button
            onClick={() => {
              if (activeMetricFilter === "scheduled" && selectedDate === nextDayDateString) {
                setActiveMetricFilter("all");
                setSelectedDate(getTodayString());
              } else {
                setActiveMetricFilter("scheduled");
                setSelectedDate(nextDayDateString);
              }
            }}
            className={`p-3 rounded-2xl bg-white border transition-all text-left space-y-2 shadow-xs ${
              activeMetricFilter === "scheduled"
                ? "border-sky-400 ring-2 ring-sky-300"
                : "border-slate-100 hover:border-purple-200"
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Scheduled</p>
              <h4 className="text-sm font-black text-slate-900">{nextDayScheduledCount}</h4>
            </div>
          </button>

          {/* Card 3: Approvals */}
          <button
            onClick={() => setActiveMetricFilter(activeMetricFilter === "approvals" ? "all" : "approvals")}
            className={`p-3 rounded-2xl bg-white border transition-all text-left space-y-2 shadow-xs ${
              activeMetricFilter === "approvals"
                ? "border-amber-400 ring-2 ring-amber-300"
                : "border-slate-100 hover:border-purple-200"
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Approvals</p>
              <h4 className="text-sm font-black text-slate-900">{approvalsCount}</h4>
            </div>
          </button>

          {/* Card 4: Individual Tasks */}
          <button
            onClick={() => setActiveMetricFilter(activeMetricFilter === "individual" ? "all" : "individual")}
            className={`p-3 rounded-2xl bg-white border transition-all text-left space-y-2 shadow-xs ${
              activeMetricFilter === "individual"
                ? "border-teal-400 ring-2 ring-teal-300"
                : "border-slate-100 hover:border-purple-200"
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Individual</p>
              <h4 className="text-sm font-black text-slate-900">{individualCount}</h4>
            </div>
          </button>

          {/* Card 5: Group Tasks */}
          <button
            onClick={() => setActiveMetricFilter(activeMetricFilter === "group" ? "all" : "group")}
            className={`p-3 rounded-2xl bg-white border transition-all text-left space-y-2 shadow-xs ${
              activeMetricFilter === "group"
                ? "border-purple-400 ring-2 ring-purple-300"
                : "border-slate-100 hover:border-purple-200"
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Group</p>
              <h4 className="text-sm font-black text-slate-900">{groupCount}</h4>
            </div>
          </button>

          {/* Card 6: Completed */}
          <button
            onClick={() => setActiveMetricFilter(activeMetricFilter === "completed" ? "all" : "completed")}
            className={`p-3 rounded-2xl bg-white border transition-all text-left space-y-2 shadow-xs ${
              activeMetricFilter === "completed"
                ? "border-emerald-400 ring-2 ring-emerald-300"
                : "border-slate-100 hover:border-purple-200"
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Completed</p>
              <h4 className="text-sm font-black text-slate-900">{completedCount}</h4>
            </div>
          </button>

        </div>

        {/* Category & Team Chips Carousel with Left/Right Scroll Arrows */}
        <div className="flex items-center gap-1.5 w-full max-w-full">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => scrollTeamChips("left")}
            className="h-7 w-7 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-2xs border border-purple-100/90 shrink-0"
            title="Scroll left"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <div
            ref={teamChipsRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
          >
            <button
              onClick={() => setSelectedTeamId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedTeamId === "all"
                  ? "bg-[#1e295b] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              All Teams
            </button>

            {teams.map((team) => {
              const isSelected = selectedTeamId === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(isSelected ? "all" : team.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-fuchsia-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200/80 hover:bg-purple-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: team.color || "#9333ea" }} />
                  <span>{team.name}</span>
                </button>
              );
            })}

            <button
              onClick={() => setNewTeamOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 text-fuchsia-700 bg-fuchsia-50 border border-dashed border-fuchsia-300 hover:bg-fuchsia-100 flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              + Team
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => scrollTeamChips("right")}
            className="h-7 w-7 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-2xs border border-purple-100/90 shrink-0"
            title="Scroll right"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Date Navigator Ribbon with Date Picker */}
        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:bg-slate-100 rounded-full"
              onClick={() => handleDateShift(-1)}
              title="Previous day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Interactive Popover Date Picker */}
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50/70 hover:bg-purple-100/90 border border-purple-200/80 hover:border-purple-300 transition-all shadow-2xs group cursor-pointer select-none"
                  title="Click to open calendar"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-fuchsia-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-extrabold text-[#1e295b]">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border border-purple-100 rounded-2xl shadow-xl z-50" align="center">
                <div className="p-2 border-b border-slate-100 flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-800 px-1">Select Date</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] font-bold text-fuchsia-700 hover:bg-fuchsia-50 rounded-lg"
                      onClick={() => {
                        setSelectedDate(getTodayString());
                        setDatePickerOpen(false);
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const y = tomorrow.getFullYear();
                        const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
                        const d = String(tomorrow.getDate()).padStart(2, "0");
                        setSelectedDate(`${y}-${m}-${d}`);
                        setDatePickerOpen(false);
                      }}
                    >
                      Tomorrow
                    </Button>
                  </div>
                </div>
                <Calendar
                  mode="single"
                  selected={new Date(selectedDate + "T00:00:00")}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const day = String(date.getDate()).padStart(2, "0");
                      setSelectedDate(`${year}-${month}-${day}`);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  className="rounded-xl"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:bg-slate-100 rounded-full"
              onClick={() => handleDateShift(1)}
              title="Next day"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            {activeMetricFilter !== "all" && (
              <Badge className="bg-purple-100 text-purple-800 font-bold text-[10px] capitalize">
                Filter: {activeMetricFilter}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] font-bold text-fuchsia-700 hover:bg-fuchsia-50 rounded-xl px-2.5"
              onClick={() => setSelectedDate(getTodayString())}
            >
              {isToday ? "Today" : "Jump to Today"}
            </Button>
          </div>
        </div>

        {/* GROUPED TASK CARDS LIST (Matching Reference Screenshot Design) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-700">
              {activeMetricFilter === "all" ? "Today's Schedule & Tasks" : `Filtered Tasks (${filteredTasks.length})`}
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{filteredTasks.length} items</span>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-purple-100 text-center space-y-3 shadow-xs my-3">
              <CalendarClock className="w-10 h-10 text-purple-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No tasks found</h4>
              <p className="text-xs text-slate-500">
                Tap the floating bar below to schedule a new task.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isCompleted = task.status === "completed" || task.status === "approved";
                const isPendingApproval = task.requires_approval && (task.approval_status === "pending" || task.status === "under_review");
                const isRejected = task.status === "rejected" || task.approval_status === "rejected";
                const cat = categoryConfig[task.category] || categoryConfig.other;
                const prio = priorityConfig[task.priority];
                const isIndividual = task.task_type === "individual" || Boolean(task.assignee_id);
                const deadlineInfo = getDeadlineStatus(task.deadline, isCompleted);

                return (
                  <div
                    key={task.id}
                    onClick={() => setDetailedTask(task)}
                    className={`rounded-3xl p-4 sm:p-4.5 transition-all space-y-2.5 cursor-pointer relative ${
                      isPendingApproval
                        ? "bg-gradient-to-br from-amber-50/90 via-white to-purple-50/70 border-2 border-amber-300 ring-2 ring-amber-200/50 shadow-md"
                        : isCompleted
                        ? "bg-slate-50/90 border-2 border-slate-200/90 shadow-2xs opacity-85 hover:opacity-100"
                        : isRejected
                        ? "bg-rose-50/70 border-2 border-rose-300 ring-2 ring-rose-200/50 shadow-sm"
                        : "bg-white border border-purple-100/90 shadow-xs hover:border-purple-300 hover:shadow-md"
                    }`}
                  >
                    {/* Status Top Banner for Submitted / Pending Approval / Completed / Rejected */}
                    {isPendingApproval && (
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/70 flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          Submitted • Awaiting Manager Approval
                        </span>
                        <span className="text-[10px] text-amber-800 font-bold bg-white border border-amber-200 px-2 py-0.5 rounded-md">
                          Approver: {task.approver_name || "Manager"}
                        </span>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Task Completed & Verified
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Signed off
                        </span>
                      </div>
                    )}

                    {isRejected && (
                      <div className="flex items-center justify-between pb-2 border-b border-rose-200 flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-rose-900 bg-rose-100 px-2.5 py-0.5 rounded-full shadow-2xs">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Revision Required / Rejected
                        </span>
                      </div>
                    )}

                    {/* Main Row: Circular Check Ring + Task Details */}
                    <div className="flex items-start gap-3">
                      {/* CIRCULAR CHECKBOX BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleTaskCompletion(task, e)}
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                          isCompleted
                            ? "bg-emerald-600 border-2 border-emerald-600 text-white shadow-xs"
                            : isPendingApproval
                            ? "border-2 border-amber-500 bg-amber-100 text-amber-700 shadow-sm animate-pulse"
                            : isRejected
                            ? "border-2 border-rose-500 bg-rose-100 text-rose-600"
                            : "border-2 border-slate-300 hover:border-fuchsia-500 bg-white hover:bg-fuchsia-50"
                        }`}
                        title={
                          isCompleted
                            ? "Click to re-open task"
                            : isPendingApproval
                            ? "Submitted for approval - click to cancel/reset"
                            : "Click to complete or submit for approval"
                        }
                      >
                        {isCompleted && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
                        {isPendingApproval && <Clock className="w-3.5 h-3.5 text-amber-700" />}
                        {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      </button>

                      {/* TASK TITLE & STRIKETHROUGH WHEN COMPLETED */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`font-black text-base leading-snug truncate ${
                              isCompleted
                                ? "line-through text-slate-400 font-medium decoration-slate-400 decoration-2"
                                : isPendingApproval
                                ? "text-slate-900 font-black"
                                : "text-slate-900 font-extrabold"
                            }`}
                          >
                            {task.title}
                          </h4>

                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold shrink-0 ${prio.color}`}>
                            {prio.label}
                          </span>
                        </div>

                        {/* Time Slot & Deadline Badge & Category Badge */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                          {task.has_time_slot === false || (!task.start_time && task.deadline) ? (
                            <span className="font-bold text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              Flexible (No time slot)
                            </span>
                          ) : (
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-fuchsia-600" />
                              {task.start_time} - {task.end_time}
                            </span>
                          )}

                          {deadlineInfo && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${deadlineInfo.color}`}>
                              <CalendarIcon className="w-3 h-3" />
                              {deadlineInfo.label}
                              {task.deadline_time ? ` by ${task.deadline_time}` : ""}
                            </span>
                          )}

                          <span className="text-slate-300">•</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${cat.color}`}>
                            {cat.label}
                          </span>
                        </div>

                        {/* ASSIGNER ➔ ASSIGNEE / GROUP TRAIL SUBTEXT */}
                        <div className="text-[11px] text-slate-600 font-medium mt-2 pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1">
                          <span className="flex items-center gap-1 text-slate-700">
                            <span className="text-slate-400">Assigned by:</span>
                            <strong className="text-slate-900 font-bold">{task.assigner_name || task.creator_name || "Assigner"}</strong>
                          </span>

                          <span className="font-extrabold text-fuchsia-800 flex items-center gap-1 bg-fuchsia-50 px-2 py-0.5 rounded-full border border-fuchsia-200/80">
                            {isIndividual ? (
                              <>
                                <User className="w-3 h-3 text-fuchsia-600" />
                                <span>{task.assignee_name || "Staff Member"}</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3 text-fuchsia-600" />
                                <span>{task.team_name || "Functional Group"}</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Inline Manager Approval Action Buttons if Pending */}
                        {isPendingApproval && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              Approver: {task.approver_name || "Manager"}
                            </span>

                            {isCurrentUserApprover(task) ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-0 rounded-xl shadow-xs gap-1"
                                  onClick={() => {
                                    setApprovalModalTask(task);
                                    setApprovalMode("approve");
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 px-3 py-0 font-bold rounded-xl gap-1"
                                  onClick={() => {
                                    setApprovalModalTask(task);
                                    setApprovalMode("reject");
                                  }}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100/90 border border-slate-200 px-2 py-0.5 rounded-lg">
                                Awaiting sign-off by {task.approver_name || "Approver"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
          {/* Bottom Clearance Spacer so floating bar never covers content */}
          <div className="h-16 w-full" />
        </main>

      {/* FLOATING BOTTOM ACTION CAPSULE BAR (Matching Reference Screenshot) */}
      <div className="fixed bottom-3 left-0 right-0 z-50 px-3.5 sm:px-6 max-w-2xl mx-auto pointer-events-none">
        <div
          onClick={() => setNewTaskOpen(true)}
          className="bg-white/95 backdrop-blur-lg border border-purple-200/80 rounded-full p-2 pl-4 flex items-center justify-between shadow-2xl cursor-pointer active:scale-[0.99] transition-transform pointer-events-auto"
        >
          <span className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-2">
            <Plus className="w-4 h-4 text-fuchsia-600" />
            Add daily task or procedure...
          </span>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white flex items-center justify-center shadow-md shadow-fuchsia-600/30 shrink-0">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* TASK DETAILS MODAL (Opens when tapping any task card) */}
      {detailedTask && (
        <Dialog open={Boolean(detailedTask)} onOpenChange={(op) => !op && setDetailedTask(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white border border-purple-100 rounded-3xl shadow-2xl p-5 space-y-4">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${categoryConfig[detailedTask.category]?.color || ""}`}>
                  {categoryConfig[detailedTask.category]?.label}
                </span>
                <Badge className={priorityConfig[detailedTask.priority]?.color || ""}>
                  {priorityConfig[detailedTask.priority]?.label} Priority
                </Badge>
              </div>

              <DialogTitle className="text-lg font-black text-slate-900 pt-1">
                {detailedTask.title}
              </DialogTitle>
              {detailedTask.description && (
                <DialogDescription className="text-xs text-slate-600">
                  {detailedTask.description}
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Comprehensive Task Specs Grid */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-fuchsia-600" />
                  Schedule & Time Slot:
                </span>
                <strong className="text-slate-900">
                  {detailedTask.has_time_slot === false || (!detailedTask.start_time && detailedTask.deadline)
                    ? `Flexible (No time slot) • Active from ${detailedTask.date}`
                    : `${detailedTask.date} (${detailedTask.start_time} - ${detailedTask.end_time})`}
                </strong>
              </div>

              {detailedTask.deadline && (
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="font-semibold flex items-center gap-1 text-fuchsia-700">
                    <Clock className="w-3.5 h-3.5 text-fuchsia-600" />
                    Target Deadline:
                  </span>
                  <strong className="text-fuchsia-900 font-extrabold">
                    {detailedTask.deadline} {detailedTask.deadline_time ? `(${detailedTask.deadline_time})` : ""}
                  </strong>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                <span className="font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-fuchsia-600" />
                  Task Scope:
                </span>
                <strong className="text-slate-900">
                  {detailedTask.task_type === "individual" || detailedTask.assignee_id ? "👤 Individual Task" : "👥 Group / Team Task"}
                </strong>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                <span className="font-semibold">Assigned By:</span>
                <strong className="text-slate-900">{detailedTask.assigner_name || detailedTask.creator_name || "Assigner"}</strong>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                <span className="font-semibold">Assigned To:</span>
                <strong className="text-fuchsia-700">
                  {detailedTask.assignee_name ? `👤 ${detailedTask.assignee_name}` : `👥 Team ${detailedTask.team_name}`}
                </strong>
              </div>

              {detailedTask.requires_approval && (
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    Manager Approver:
                  </span>
                  <strong className="text-purple-700">{detailedTask.approver_name || "Manager"}</strong>
                </div>
              )}
            </div>

            {/* Approval Notes / Rejection Reason (if any) */}
            {detailedTask.approval_note && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-1">
                <p className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Manager Sign-Off Note:
                </p>
                <p className="text-emerald-800">{detailedTask.approval_note}</p>
              </div>
            )}

            {detailedTask.rejection_reason && (
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs space-y-1">
                <p className="font-bold text-rose-900 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Revision Feedback:
                </p>
                <p className="text-rose-800">{detailedTask.rejection_reason}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {detailedTask.requires_approval && (detailedTask.approval_status === "pending" || detailedTask.status === "under_review") && (
                isCurrentUserApprover(detailedTask) ? (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                    onClick={() => {
                      setApprovalModalTask(detailedTask);
                      setApprovalMode("approve");
                      setDetailedTask(null);
                    }}
                  >
                    Approve Task & Sign Off
                  </Button>
                ) : (
                  <div className="p-2.5 bg-slate-100 rounded-xl text-center text-xs text-slate-600 font-medium">
                    Awaiting sign-off by designated approver: <strong className="text-slate-900">{detailedTask.approver_name || "Manager"}</strong>
                  </div>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-slate-700 font-bold text-xs h-9"
                onClick={() => setDetailedTask(null)}
              >
                Close Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG MODALS */}
      <NewTaskDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        defaultDate={selectedDate}
        onTaskCreated={refreshData}
      />

      <NewTeamDialog
        open={newTeamOpen}
        onOpenChange={setNewTeamOpen}
        onTeamCreated={refreshData}
      />

      <ApprovalActionModal
        open={Boolean(approvalModalTask)}
        onOpenChange={(op) => !op && setApprovalModalTask(null)}
        task={approvalModalTask}
        mode={approvalMode}
        onActionCompleted={refreshData}
      />
    </div>
  );
}
