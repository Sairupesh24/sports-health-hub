import React, { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Plus,
  Users,
  Dumbbell,
  Clock,
  Activity,
  User,
  Filter,
  MoreVertical,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  Download,
  Save,
  Copy,
  Trash2,
  Share2,
  Maximize,
  Columns,
  Sparkles,
  Edit2,
  Layers,
  CalendarDays,
  Loader2,
  X,
  Clipboard,
  ClipboardCheck,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday, 
  addDays, 
  differenceInCalendarDays, 
  startOfDay, 
  isBefore 
} from "date-fns";
import { apiFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatClientName } from "@/lib/utils";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import ProgramAssignmentModal from "@/components/ams/ProgramAssignmentModal";
import BatchCreationModal from "@/components/ams/BatchCreationModal";
import { ClientGroupsModal } from "@/components/admin/ClientGroupsModal";
import BatchInfoPopover from "@/components/ams/BatchInfoPopover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import WorkoutItemModal from "@/components/ams/WorkoutItemModal";
import { useAuth } from "@/contexts/AuthContext";

export default function AmsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [isAthletePopoverOpen, setIsAthletePopoverOpen] = useState(false);
  const [selectedAssignDate, setSelectedAssignDate] = useState<Date | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingWorkoutDays, setEditingWorkoutDays] = useState<any[] | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("");
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Clipboard state for copying/pasting workouts with relative time gaps
  const [clipboard, setClipboard] = useState<{
    mode: 'single_day' | 'upcoming_series';
    sourceAthleteName?: string;
    sourceDate: string;
    totalWorkouts: number;
    days: Array<{
      dayOffset: number;
      title: string;
      items: any[];
    }>;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ams_workout_clipboard');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [confirmDeleteUpcomingOpen, setConfirmDeleteUpcomingOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const monthStart = startOfMonth(currentDate);
  const timelineDays = Array.from({ length: 31 }, (_, i) => addDays(monthStart, i));

  const scrollToDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const targetElement = dayRefs.current.get(dateKey);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete) {
      fetchAthleteWorkouts();
    } else {
      setWorkouts([]);
    }
  }, [selectedAthlete, currentDate]);

  const fetchAthletes = async () => {
    try {
      setLoadingAthletes(true);
      const [profileRes, batchRes] = await Promise.allSettled([
        apiFetch<any[]>('/ams/athletes'),
        apiFetch<any[]>('/ams/batches')
      ]);

      const profileData = profileRes.status === 'fulfilled' && Array.isArray(profileRes.value) ? profileRes.value : [];
      const batchData = batchRes.status === 'fulfilled' && Array.isArray(batchRes.value) ? batchRes.value : [];

      const combined = [
        ...profileData.map(a => ({ ...a, entityType: 'athlete' as const })),
        ...batchData.map(b => ({ ...b, entityType: 'batch' as const }))
      ];
      setAthletes(combined);
    } catch (error) {
      console.error("Failed to fetch athletes/batches", error);
    } finally {
      setLoadingAthletes(false);
    }
  };

  const fetchAthleteWorkouts = async () => {
    if (!selectedAthlete) return;
    try {
      setLoading(true);
      const params: any = { status: 'active' };
      if (selectedAthlete.entityType === 'batch') {
        params.batch_id = selectedAthlete.id;
      } else {
        params.athlete_id = selectedAthlete.id;
      }

      const data = await apiFetch<any[]>('/ams/program-assignments', { params });
      setWorkouts(data || []);
    } catch (error) {
      console.error("Failed to fetch workouts", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (assignmentId: string) => {
    try {
      setLoading(true);
      await apiFetch(`/ams/program-assignments/${assignmentId}`, { method: 'DELETE' });
      toast({ title: "Assignment deleted" });
      fetchAthleteWorkouts();
    } catch (error: any) {
      toast({ title: "Failed to delete assignment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setLoading(true);
      await apiFetch(`/ams/workout-items/${itemId}`, { method: 'DELETE' });
      toast({ title: "Exercise removed from schedule" });
      fetchAthleteWorkouts();
    } catch (error: any) {
      toast({ title: "Failed to delete exercise", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditWorkout = (workout: any) => {
    const mappedDays = [{
      id: workout.workout_day_id || workout.id,
      title: workout.title || "Untitled Workout",
      date: workout.targetDate ? format(workout.targetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      items: (workout.items || []).map((item: any) => {
        const lift = item.lift_items || {};
        return {
          id: item.id,
          exerciseId: lift.exercise_id,
          exerciseName: lift.exercise?.name || "Unknown",
          type: (item.item_type as any) || 'lift',
          sets: lift.sets || 3,
          reps: String(lift.reps || "10"),
          weight: lift.load_value || 0,
          tempo: lift.tempo,
          rest_time_secs: lift.rest_time_secs,
          workout_grouping: lift.workout_grouping,
          each_side: lift.each_side,
          additional_info: lift.additional_info
        };
      })
    }];
    setEditingWorkoutDays(mappedDays);
    setSelectedAssignDate(workout.targetDate || new Date());
    setIsAssignModalOpen(true);
  };

  const getDayWorkouts = (day: Date) => {
    return workouts.flatMap(w => {
      const start = new Date(w.start_date);
      const diffDays = differenceInCalendarDays(day, start);
      if (diffDays >= 0 && w.program?.days) {
        const workoutDay = w.program.days.find((d: any) => d.display_order === diffDays);
        if (workoutDay) return [{ ...workoutDay, id: w.id, workout_day_id: workoutDay.id, programName: w.program.name, targetDate: day }];
      }
      return [];
    });
  };

  // Selected day's workouts
  const selectedDayWorkouts = useMemo(() => {
    return getDayWorkouts(currentDate);
  }, [workouts, currentDate]);

  // All upcoming workouts on or after currentDate for the selected athlete
  const upcomingWorkouts = useMemo(() => {
    if (!selectedAthlete || workouts.length === 0) return [];
    const base = startOfDay(currentDate);
    const map = new Map<string, { date: Date; dateStr: string; workouts: any[] }>();
    
    workouts.forEach(w => {
      const start = new Date(w.start_date);
      if (w.program?.days) {
        w.program.days.forEach((d: any) => {
          const targetDate = addDays(start, d.display_order);
          if (differenceInCalendarDays(startOfDay(targetDate), base) >= 0) {
            const dateStr = format(targetDate, 'yyyy-MM-dd');
            if (!map.has(dateStr)) {
              map.set(dateStr, { date: targetDate, dateStr, workouts: [] });
            }
            map.get(dateStr)!.workouts.push({
              ...d,
              id: w.id,
              workout_day_id: d.id,
              programName: w.program.name,
              targetDate
            });
          }
        });
      }
    });

    const sortedDates = Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    return sortedDates.map(entry => ({
      ...entry,
      dayOffset: differenceInCalendarDays(startOfDay(entry.date), base)
    }));
  }, [workouts, currentDate, selectedAthlete]);

  const clearClipboard = () => {
    setClipboard(null);
    localStorage.removeItem('ams_workout_clipboard');
    toast({ title: "Clipboard cleared" });
  };

  const handleCopyDay = (targetDate: Date = currentDate) => {
    if (!selectedAthlete) {
      toast({ title: "No athlete selected", variant: "destructive" });
      return;
    }
    const dayWorkouts = getDayWorkouts(targetDate);
    if (dayWorkouts.length === 0) {
      toast({ 
        title: "No workouts to copy", 
        description: `There are no scheduled workouts on ${format(targetDate, 'MMM d, yyyy')}.`,
        variant: "destructive" 
      });
      return;
    }

    const copiedDays = dayWorkouts.map(w => ({
      dayOffset: 0,
      title: w.title || "Workout",
      items: (w.items || []).map((it: any) => {
        const lift = it.lift_items || {};
        return {
          exerciseId: lift.exercise_id || lift.exercise?.id,
          exerciseName: lift.exercise?.name || "Exercise",
          type: it.item_type || 'lift',
          sets: lift.sets || 3,
          reps: String(lift.reps || "10"),
          weight: lift.load_value || 0,
          load_type: lift.load_type || 'absolute',
          tempo: lift.tempo,
          rest_time_secs: lift.rest_time_secs,
          workout_grouping: lift.workout_grouping,
          each_side: lift.each_side,
          additional_info: lift.additional_info
        };
      })
    }));

    const clipboardData = {
      mode: 'single_day' as const,
      sourceDate: format(targetDate, 'yyyy-MM-dd'),
      totalWorkouts: copiedDays.length,
      days: copiedDays
    };

    setClipboard(clipboardData);
    localStorage.setItem('ams_workout_clipboard', JSON.stringify(clipboardData));

    toast({
      title: "Day Plan Copied!",
      description: `Copied ${format(targetDate, 'MMM d')}'s workout plan (${copiedDays.length} workout). Select an athlete or date and click Paste.`
    });
  };

  const handleCopyUpcoming = (anchorDate: Date = currentDate) => {
    if (!selectedAthlete) {
      toast({ title: "No athlete selected", variant: "destructive" });
      return;
    }

    if (upcomingWorkouts.length === 0) {
      toast({ 
        title: "No upcoming workouts", 
        description: `There are no workouts scheduled on or after ${format(anchorDate, 'MMM d, yyyy')}.`,
        variant: "destructive" 
      });
      return;
    }

    const baseDate = startOfDay(anchorDate);
    const copiedDays: Array<{ dayOffset: number; title: string; items: any[] }> = [];

    upcomingWorkouts.forEach(entry => {
      const dayOffset = differenceInCalendarDays(startOfDay(entry.date), baseDate);
      entry.workouts.forEach(w => {
        copiedDays.push({
          dayOffset,
          title: w.title || "Workout",
          items: (w.items || []).map((it: any) => {
            const lift = it.lift_items || {};
            return {
              exerciseId: lift.exercise_id || lift.exercise?.id,
              exerciseName: lift.exercise?.name || "Exercise",
              type: it.item_type || 'lift',
              sets: lift.sets || 3,
              reps: String(lift.reps || "10"),
              weight: lift.load_value || 0,
              load_type: lift.load_type || 'absolute',
              tempo: lift.tempo,
              rest_time_secs: lift.rest_time_secs,
              workout_grouping: lift.workout_grouping,
              each_side: lift.each_side,
              additional_info: lift.additional_info
            };
          })
        });
      });
    });

    const clipboardData = {
      mode: 'upcoming_series' as const,
      sourceDate: format(anchorDate, 'yyyy-MM-dd'),
      totalWorkouts: copiedDays.length,
      days: copiedDays
    };

    setClipboard(clipboardData);
    localStorage.setItem('ams_workout_clipboard', JSON.stringify(clipboardData));

    const gapsText = copiedDays.map(d => '+' + d.dayOffset).slice(0, 5).join(', ');
    toast({
      title: "Upcoming Workouts Copied!",
      description: `Copied ${copiedDays.length} workout(s) across ${upcomingWorkouts.length} day(s). Relative gaps preserved: Day ${gapsText}${copiedDays.length > 5 ? '...' : ''}.`
    });
  };

  const handleDeleteDay = async (targetDate: Date = currentDate) => {
    if (!selectedAthlete) return;
    try {
      setActionInProgress(true);
      await apiFetch<any>('/ams/calendar/delete-day', {
        method: 'POST',
        body: {
          athleteId: selectedAthlete.entityType !== 'batch' ? selectedAthlete.id : null,
          batchId: selectedAthlete.entityType === 'batch' ? selectedAthlete.id : null,
          date: format(targetDate, 'yyyy-MM-dd')
        }
      });

      toast({ 
        title: "Workout Deleted", 
        description: `Successfully removed workouts for ${format(targetDate, 'MMM d, yyyy')}.` 
      });
      fetchAthleteWorkouts();
    } catch (error: any) {
      toast({ 
        title: "Delete Failed", 
        description: error.message || "Failed to delete workout.", 
        variant: "destructive" 
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteUpcoming = async () => {
    if (!selectedAthlete) return;
    try {
      setActionInProgress(true);
      const fromDate = format(currentDate, 'yyyy-MM-dd');
      await apiFetch<any>('/ams/calendar/delete-upcoming', {
        method: 'POST',
        body: {
          athleteId: selectedAthlete.entityType !== 'batch' ? selectedAthlete.id : null,
          batchId: selectedAthlete.entityType === 'batch' ? selectedAthlete.id : null,
          fromDate
        }
      });

      const athleteName = selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete);
      toast({ 
        title: "Upcoming Workouts Deleted", 
        description: `All workouts from ${format(currentDate, 'MMM d, yyyy')} onwards have been removed for ${athleteName}.` 
      });
      setConfirmDeleteUpcomingOpen(false);
      fetchAthleteWorkouts();
    } catch (error: any) {
      toast({ 
        title: "Delete Failed", 
        description: error.message || "Failed to delete upcoming workouts.", 
        variant: "destructive" 
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handlePasteWorkouts = async (targetDate: Date = currentDate) => {
    if (!clipboard) {
      toast({ title: "Clipboard is empty", description: "Copy a workout first.", variant: "destructive" });
      return;
    }
    if (!selectedAthlete) {
      toast({ 
        title: "Select an athlete or squad", 
        description: "Choose who should receive the copied workout plan.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setActionInProgress(true);
      const startDate = format(targetDate, 'yyyy-MM-dd');
      const athleteName = selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete);

      await apiFetch('/ams/calendar/paste-workouts', {
        method: 'POST',
        body: {
          athleteId: selectedAthlete.entityType !== 'batch' ? selectedAthlete.id : null,
          batchId: selectedAthlete.entityType === 'batch' ? selectedAthlete.id : null,
          startDate,
          planTitle: 'Training Plan',
          days: clipboard.days
        }
      });

      const appliedDates = clipboard.days.map(d => format(addDays(targetDate, d.dayOffset), 'EEE MMM d')).slice(0, 4).join(', ');

      toast({
        title: "Plan Applied Successfully!",
        description: `Applied ${clipboard.days.length} workout(s) to ${athleteName} starting ${format(targetDate, 'MMM d')}: ${appliedDates}${clipboard.days.length > 4 ? '...' : ''}. Gaps preserved!`
      });

      fetchAthleteWorkouts();
    } catch (error: any) {
      toast({ 
        title: "Paste Failed", 
        description: error.message || "Could not apply copied workouts.", 
        variant: "destructive" 
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteDailyWorkouts = async (dayWorkouts: any[]) => {
    if (dayWorkouts.length === 0) return;
    try {
      setLoading(true);
      for (const w of dayWorkouts) {
        await apiFetch(`/ams/program-assignments/${w.id}`, { method: 'DELETE' });
      }
      fetchAthleteWorkouts();
      toast({ title: "Workouts deleted for day" });
    } catch (error) {
      console.error("Failed to delete workouts", error);
    } finally {
      setLoading(false);
    }
  };

  const batches = athletes.filter(a => a.entityType === 'batch');
  const individualAthletes = athletes.filter(a => a.entityType === 'athlete');

  const filteredBatches = useMemo(() => {
    if (!athleteSearchQuery.trim()) return batches;
    const q = athleteSearchQuery.toLowerCase();
    return batches.filter(b => b.name?.toLowerCase().includes(q));
  }, [batches, athleteSearchQuery]);

  const filteredAthletes = useMemo(() => {
    if (!athleteSearchQuery.trim()) return individualAthletes.slice(0, 100);
    const q = athleteSearchQuery.toLowerCase();
    return individualAthletes.filter(a => {
      const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const uhid = (a.uhid || '').toLowerCase();
      return name.includes(q) || uhid.includes(q);
    }).slice(0, 100);
  }, [individualAthletes, athleteSearchQuery]);

  const miniCalendarNode = (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Month Header & Mini Calendar */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <button 
            type="button"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))} 
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                scrollToDate(today);
              }}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider cursor-pointer"
            >
              Jump to Today
            </button>
          </div>
          <button 
            type="button"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))} 
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mini Calendar Component */}
        <div className="bg-slate-800/80 rounded-2xl p-2.5 border border-white/10 shadow-inner flex justify-center">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(date) => {
              if (date) {
                setCurrentDate(date);
                scrollToDate(date);
                setMobileDrawerOpen(false);
              }
            }}
            className="rounded-md border-none text-white pointer-events-auto p-0"
            classNames={{
              head_cell: "text-white/40 font-bold text-[10px] uppercase w-8 text-center pb-1",
              cell: "text-center text-xs p-0 relative w-8 h-8",
              day: "h-8 w-8 p-0 text-xs font-semibold aria-selected:opacity-100 hover:bg-white/10 rounded-xl transition-all",
              day_selected: "bg-primary text-white hover:bg-primary/90 focus:bg-primary shadow-md shadow-primary/30 font-bold",
              day_today: "text-primary border border-primary/50 font-bold",
              day_outside: "text-white/20 opacity-30",
              nav: "hidden",
              caption: "hidden"
            }}
          />
        </div>

        {/* Schedule Actions Panel (Under Mini-Calendar) */}
        <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
          <div className="bg-slate-800/90 rounded-2xl p-3 border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">Schedule Actions</span>
              </div>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-white/70 text-[9px] font-bold uppercase tracking-wider">
                {format(currentDate, 'MMM d, yyyy')}
              </Badge>
            </div>

            {/* Target Athlete Context */}
            <div className="text-[11px] text-white/60 flex items-center justify-between px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Active Athlete:</span>
              <span className="font-bold text-white truncate max-w-[140px] text-right">
                {selectedAthlete ? (selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete)) : 'None Selected'}
              </span>
            </div>

            {/* Action Buttons: Delete & Copy */}
            <div className="grid grid-cols-2 gap-2">
              {/* DELETE DROPDOWN */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!selectedAthlete || actionInProgress}
                    className="w-full h-9 rounded-xl border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold uppercase text-[10px] tracking-wider gap-1 justify-between px-2.5 transition-all disabled:opacity-40"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Delete</span>
                    </div>
                    <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl p-1.5 z-50">
                  <DropdownMenuItem 
                    onClick={() => handleDeleteDay(currentDate)}
                    disabled={selectedDayWorkouts.length === 0 || actionInProgress}
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-rose-500/20 text-rose-400 focus:bg-rose-500/20 focus:text-rose-300 transition-colors text-xs"
                  >
                    <Trash2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Delete Selected Day</span>
                      <span className="text-[10px] opacity-60 font-normal">
                        {selectedDayWorkouts.length > 0 ? `${selectedDayWorkouts.length} workout(s) on ${format(currentDate, 'MMM d')}` : `No workouts on ${format(currentDate, 'MMM d')}`}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setConfirmDeleteUpcomingOpen(true)}
                    disabled={upcomingWorkouts.length === 0 || actionInProgress}
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-rose-500/20 text-rose-400 focus:bg-rose-500/20 focus:text-rose-300 transition-colors text-xs"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Delete All Upcoming</span>
                      <span className="text-[10px] opacity-60 font-normal">
                        {upcomingWorkouts.length > 0 ? `From ${format(currentDate, 'MMM d')} onwards (${upcomingWorkouts.length} days)` : 'No upcoming workouts'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* COPY DROPDOWN */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!selectedAthlete || actionInProgress}
                    className="w-full h-9 rounded-xl border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-bold uppercase text-[10px] tracking-wider gap-1 justify-between px-2.5 transition-all disabled:opacity-40"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Copy</span>
                    </div>
                    <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl p-1.5 z-50">
                  <DropdownMenuItem 
                    onClick={() => handleCopyDay(currentDate)}
                    disabled={selectedDayWorkouts.length === 0}
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-blue-500/20 text-blue-300 focus:bg-blue-500/20 focus:text-blue-200 transition-colors text-xs"
                  >
                    <Copy className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Copy Selected Day's Plan</span>
                      <span className="text-[10px] opacity-60 font-normal">
                        {selectedDayWorkouts.length > 0 ? `${selectedDayWorkouts.length} workout(s) on ${format(currentDate, 'MMM d')}` : `No workouts on ${format(currentDate, 'MMM d')}`}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleCopyUpcoming(currentDate)}
                    disabled={upcomingWorkouts.length === 0}
                    className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-blue-500/20 text-blue-300 focus:bg-blue-500/20 focus:text-blue-200 transition-colors text-xs"
                  >
                    <Layers className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Copy Entire Upcoming Workouts</span>
                      <span className="text-[10px] opacity-60 font-normal">
                        {upcomingWorkouts.length > 0 ? `Preserves time gap between ${upcomingWorkouts.length} days` : 'No upcoming workouts'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* PASTE BUTTON */}
            <div className="space-y-2 pt-1">
              <Button 
                onClick={() => handlePasteWorkouts(currentDate)}
                disabled={!clipboard || !selectedAthlete || actionInProgress}
                className={cn(
                  "w-full h-10 rounded-xl font-black uppercase text-[10px] tracking-wider gap-2 shadow-md transition-all justify-center",
                  clipboard && selectedAthlete
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30"
                    : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed hover:bg-white/5"
                )}
              >
                {clipboard ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-white" />
                    <span>Apply Copied Workouts</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4 opacity-40" />
                    <span>Paste (Clipboard Empty)</span>
                  </>
                )}
              </Button>

              {/* Clipboard Info Details */}
              {clipboard && (
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-start justify-between text-[10px] text-white/70">
                  <div className="flex flex-col min-w-0 pr-1 space-y-0.5">
                    <span className="font-bold text-primary truncate">
                      {clipboard.mode === 'single_day' ? '1 Day Plan Copied' : `${clipboard.days.length} Days Series Copied`}
                    </span>
                    <span className="text-[9px] text-white/40 truncate">
                      Copied schedule ({clipboard.sourceDate})
                    </span>
                    {clipboard.mode === 'upcoming_series' && (
                      <span className="text-[8.5px] text-emerald-400 font-semibold tracking-wide">
                        Gaps: Day {clipboard.days.map(d => '+' + d.dayOffset).join(', ')}
                      </span>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={clearClipboard}
                    className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Clear Clipboard"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout role="coach">
      <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] overflow-hidden font-sans">
        {/* Top AMS Bar */}
        <AmsStaffNav />

        {/* Main Content Area (Sidebar on Left, Toolbar + Timeline on Right) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Left Sidebar: Full height from below AmsStaffNav down to bottom of viewport */}
          <aside className="hidden lg:flex w-80 bg-slate-900 text-white flex-col border-r border-slate-800 shadow-xl shrink-0 z-10">
            {miniCalendarNode}
          </aside>

          {/* Right Column: Toolbar at top of the timeline canvas, then the timeline below it */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
            {/* Calendar Toolbar / Sub-header */}
            <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 shadow-2xs z-20 shrink-0 flex flex-wrap items-center justify-between gap-3">
              {/* Left: Mobile Drawer Trigger + Athlete Selector */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Sheet Trigger for Mini Calendar */}
                <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="lg:hidden h-9 px-3 rounded-xl border-slate-200 text-slate-700 font-bold text-xs gap-1.5 shrink-0"
                    >
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span className="hidden sm:inline">Calendar</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] p-0 bg-slate-900 text-white border-r border-slate-800">
                    <SheetHeader className="p-4 border-b border-white/10">
                      <SheetTitle className="text-sm font-black uppercase text-white flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        Calendar & Schedule
                      </SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(100vh-65px)]">
                      {miniCalendarNode}
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Athlete Popover Selector */}
                <Popover open={isAthletePopoverOpen} onOpenChange={setIsAthletePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100/80 transition-all outline-none max-w-[280px] sm:max-w-[360px] truncate group shadow-2xs">
                      {selectedAthlete ? (
                        selectedAthlete.entityType === 'batch' ? (
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <Avatar className="h-6 w-6 border border-slate-200 shrink-0">
                            <AvatarFallback className="bg-primary text-white text-[9px] font-black">
                              {selectedAthlete.first_name?.[0]}{selectedAthlete.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-xs font-black uppercase tracking-tight text-slate-900 truncate">
                          {selectedAthlete 
                            ? (selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete))
                            : "Select Athlete / Squad"}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                          {selectedAthlete ? (selectedAthlete.entityType === 'batch' ? "Team Batch" : "Athlete Profile") : "Click to choose"}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 ml-1 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 border-slate-200 bg-white overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-100 mt-2 z-50" align="start" sideOffset={8}>
                    <Command className="bg-transparent" shouldFilter={false}>
                      <div className="flex items-center px-3 border-b border-slate-100">
                        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                          placeholder="Search athletes or teams..."
                          value={athleteSearchQuery}
                          onChange={(e) => setAthleteSearchQuery(e.target.value)}
                          className="h-11 w-full bg-transparent font-medium border-none text-slate-900 focus:outline-none placeholder:text-slate-400 text-xs"
                        />
                        {athleteSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setAthleteSearchQuery("")}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <CommandList className="max-h-[320px] overflow-y-auto">
                        {loadingAthletes && (
                          <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            Loading athletes & groups...
                          </div>
                        )}
                        {!loadingAthletes && filteredBatches.length === 0 && filteredAthletes.length === 0 && (
                          <div className="p-6 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                            No athletes or teams found.
                          </div>
                        )}
                        {filteredBatches.length > 0 && (
                          <CommandGroup heading="Teams & Squad Groups" className="text-[10px] font-black uppercase text-primary border-b border-slate-100 py-1.5 px-2">
                            {filteredBatches.map((batch) => (
                              <CommandItem 
                                key={batch.id} 
                                value={`batch ${batch.name}`} 
                                onSelect={() => { 
                                  setSelectedAthlete(batch); 
                                  setIsAthletePopoverOpen(false); 
                                }} 
                                className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl hover:bg-slate-50 transition-all text-slate-900"
                              >
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                  <Users className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-bold text-xs uppercase tracking-tight text-slate-900 truncate">{batch.name}</span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                    {batch.source_type === 'client_group' ? 'Sports Science Group' : 'Team Batch'}
                                    {batch.member_count !== undefined ? ` • ${batch.member_count} members` : ''}
                                  </span>
                                </div>
                                <BatchInfoPopover 
                                  batch={batch} 
                                  onUpdate={fetchAthletes} 
                                  onManage={() => { 
                                    setIsGroupsModalOpen(true); 
                                    setIsAthletePopoverOpen(false); 
                                  }} 
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {filteredAthletes.length > 0 && (
                          <CommandGroup heading={`Registered Clients & Athletes (${individualAthletes.length})`} className="text-[10px] font-black uppercase text-slate-400 py-1.5 px-2">
                            {filteredAthletes.map((athlete) => (
                              <CommandItem 
                                key={athlete.id} 
                                value={`${formatClientName(athlete)} ${athlete.uhid || ''}`} 
                                onSelect={() => { 
                                  setSelectedAthlete(athlete); 
                                  setIsAthletePopoverOpen(false); 
                                }} 
                                className="flex items-center gap-2.5 p-2.5 cursor-pointer rounded-xl hover:bg-slate-50 transition-all text-slate-900"
                              >
                                <Avatar className="h-7 w-7 border border-slate-200 shrink-0">
                                  <AvatarFallback className="bg-slate-100 text-slate-700 text-[10px] font-black">
                                    {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-bold text-xs uppercase tracking-tight truncate">{formatClientName(athlete)}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">{athlete.uhid || "Registered Client"}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Middle: Month & Jump Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center px-1">
                  <span className="font-black uppercase tracking-wider text-xs md:text-sm text-slate-900 whitespace-nowrap">
                    {format(currentDate, 'MMMM yyyy')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    scrollToDate(today);
                  }}
                  className="h-8 px-2.5 text-[10px] font-black uppercase tracking-wider border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg ml-1 hidden sm:inline-flex"
                >
                  Today
                </Button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGroupsModalOpen(true)} 
                  className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-slate-900 font-bold uppercase text-[10px] tracking-wider gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Manage Groups</span>
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)} 
                  className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-wider gap-1.5 shadow-sm shadow-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Program</span>
                </Button>
              </div>
            </header>

            {/* Timeline View */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 no-scrollbar scroll-smooth">
              {!selectedAthlete ? (
                <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center max-w-xl mx-auto my-auto min-h-[50vh]">
                  <div className="w-24 h-24 rounded-3xl bg-white border-2 border-slate-200 shadow-md flex items-center justify-center mb-6 text-primary">
                    <CalendarDays className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2 font-display">
                    No Athlete or Squad Selected
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm font-medium max-w-md mb-6 leading-relaxed">
                    Choose an individual athlete or squad batch to view workout compliance, inspect logged sets and reps, or assign custom training blocks.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                    <Button 
                      onClick={() => setIsAthletePopoverOpen(true)}
                      className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-primary/20 gap-2"
                    >
                      <User className="w-4 h-4" /> Select Athlete or Squad
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsGroupsModalOpen(true)}
                      className="h-11 px-5 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 font-bold uppercase tracking-wider text-xs gap-2"
                    >
                      <Users className="w-4 h-4" /> Manage Groups
                    </Button>
                  </div>

                  {/* Quick Shortcuts for Batches */}
                  {batches.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200 w-full text-left">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 text-center">
                        Quick Select Active Squad Batches & Groups
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {batches.slice(0, 6).map((batch) => (
                          <button
                            key={batch.id}
                            onClick={() => setSelectedAthlete(batch)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-primary/50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 hover:shadow-xs"
                          >
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>{batch.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-4">
                  {/* Timeline Header Badge */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Training Timeline for
                      </span>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-black uppercase">
                        {selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete)}
                      </Badge>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {timelineDays.length} Days Displayed
                    </span>
                  </div>

                  {/* Day Cards */}
                  {timelineDays.map((day, index) => {
                    const dayWorkouts = getDayWorkouts(day);
                    const isTodayDate = isToday(day);
                    const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()));

                    return (
                      <div 
                        key={index} 
                        ref={(el) => { if (el) dayRefs.current.set(format(day, 'yyyy-MM-dd'), el); }} 
                        className="flex gap-3 md:gap-4 group"
                      >
                        {/* Date Indicator Column */}
                        <div className="flex flex-col items-center pt-1.5 shrink-0 w-12 md:w-14">
                          <div className={cn(
                            "w-11 h-11 md:w-12 md:h-12 rounded-2xl flex flex-col items-center justify-center transition-all border shadow-xs",
                            isTodayDate 
                              ? "bg-primary border-primary text-white shadow-md shadow-primary/30" 
                              : "bg-white border-slate-200 text-slate-400 group-hover:border-primary/40 group-hover:text-primary"
                          )}>
                            <span className="text-base md:text-lg font-black leading-none">{format(day, 'd')}</span>
                            <span className="text-[8px] font-black uppercase tracking-wider">{format(day, 'EEE')}</span>
                          </div>
                          {isTodayDate && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-primary mt-1">
                              Today
                            </span>
                          )}
                          {index < timelineDays.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
                        </div>

                        {/* Day Card Content */}
                        <div className={cn(
                          "flex-1 min-h-[110px] bg-white rounded-2xl border p-4 md:p-5 flex items-start justify-between transition-all relative overflow-hidden group/card shadow-xs",
                          isTodayDate 
                            ? "ring-2 ring-primary/20 border-primary/30 shadow-primary/5" 
                            : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                        )}>
                          <div className="space-y-4 w-full">
                            {dayWorkouts.length === 0 ? (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                                  <span className="text-sm font-bold text-slate-400 italic">No workout scheduled</span>
                                </div>
                                {!isPastDay && (
                                  <div className="flex items-center gap-2">
                                    {clipboard && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 px-3 rounded-xl border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase tracking-wider transition-all gap-1.5"
                                        onClick={() => handlePasteWorkouts(day)}
                                      >
                                        <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        Paste Plan Here
                                      </Button>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[10px] uppercase tracking-wider transition-all gap-1.5 self-start sm:self-auto"
                                      onClick={() => { setSelectedAssignDate(day); setIsAssignModalOpen(true); }}
                                    >
                                      <Plus className="w-3 h-3" /> Add Workout
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-6 w-full">
                                {dayWorkouts.map((workout: any, wIdx: number) => (
                                  <div key={wIdx} className="w-full space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                                        <h4 className="text-base font-black uppercase tracking-tight text-slate-900 truncate">
                                          {workout.title || "Scheduled Workout"}
                                        </h4>
                                      </div>
                                      {workout.programName && 
                                        !/copied plan/i.test(workout.programName) && 
                                        !/^quick assign/i.test(workout.programName) && 
                                        workout.programName.toLowerCase() !== 'training plan' && (
                                        <Badge variant="outline" className="text-[9px] font-black uppercase shadow-2xs border-slate-200 text-slate-500 tracking-wider bg-slate-50">
                                          {workout.programName}
                                        </Badge>
                                      )}
                                    </div>

                                    {workout.items && workout.items.length > 0 && (
                                      <div className="space-y-1.5 pl-2 sm:pl-4">
                                        {(workout.items as any[]).sort((a,b) => a.display_order - b.display_order).map((item: any) => {
                                          if (item.item_type === 'lift' && item.lift_items) {
                                            const exerciseName = item.lift_items.exercise?.name || 'Unknown Exercise';
                                            return (
                                              <div 
                                                key={item.id} 
                                                className="flex flex-col sm:flex-row sm:items-center justify-between group/ext bg-slate-50/70 hover:bg-slate-100/80 p-2 sm:px-3 sm:py-2 rounded-xl transition-colors border border-slate-100 gap-2"
                                              >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs text-slate-500">
                                                    <Dumbbell className="w-3.5 h-3.5" />
                                                  </div>
                                                  <div className="flex flex-col min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs truncate">{exerciseName}</p>
                                                    <p className="text-[10px] text-slate-500 font-semibold tracking-wide">
                                                      {item.lift_items.sets} sets × {item.lift_items.reps} reps {item.lift_items.load_value > 0 ? `@ ${item.lift_items.load_value}kg` : ''}
                                                    </p>
                                                  </div>
                                                </div>
                                                {!isPastDay && (
                                                  <div className="flex items-center gap-1 self-end sm:self-auto">
                                                    <button 
                                                      className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-colors" 
                                                      onClick={(e) => { e.stopPropagation(); handleEditWorkout(workout); }}
                                                      title="Edit Workout"
                                                    >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                      className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-rose-600 transition-colors" 
                                                      onClick={(e) => handleDeleteItem(item.id, e)}
                                                      title="Remove Exercise"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          return null;
                                        })}
                                      </div>
                                    )}

                                    {!isPastDay && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[10px] uppercase tracking-wider transition-all gap-1.5"
                                          onClick={() => { setSelectedAssignDate(day); setIsAssignModalOpen(true); }}
                                        >
                                          <Plus className="w-3 h-3" /> Add More Exercises
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {!isPastDay && dayWorkouts.length > 0 && (
                            <div className="flex items-center pl-2 shrink-0">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-600 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 bg-white border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-1" align="end">
                                  <Button 
                                    variant="ghost" 
                                    className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-9 px-2.5 rounded-xl gap-2 font-bold text-xs uppercase tracking-tight" 
                                    onClick={() => handleCopyDay(day)}
                                  >
                                    <Copy className="w-4 h-4" /> Copy Day Plan
                                  </Button>
                                  {clipboard && (
                                    <Button 
                                      variant="ghost" 
                                      className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-9 px-2.5 rounded-xl gap-2 font-bold text-xs uppercase tracking-tight" 
                                      onClick={() => handlePasteWorkouts(day)}
                                    >
                                      <ClipboardCheck className="w-4 h-4" /> Paste Plan Here
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    className="w-full justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 px-2.5 rounded-xl gap-2 font-bold text-xs uppercase tracking-tight" 
                                    onClick={() => handleDeleteDay(day)}
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete Day Plan
                                  </Button>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                          <div className="absolute right-0 top-0 h-full w-1 bg-slate-100 group-hover/card:bg-primary/40 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </div>


        {/* Modals */}
        <ProgramAssignmentModal 
          isOpen={isAssignModalOpen} 
          onClose={() => { 
            setIsAssignModalOpen(false); 
            setSelectedAssignDate(null); 
            setEditingWorkoutDays(null); 
          }} 
          program={null} 
          onSuccess={fetchAthleteWorkouts} 
          initialSelectedAthleteId={selectedAthlete?.entityType !== 'batch' ? selectedAthlete?.id : null} 
          initialSelectedBatchId={selectedAthlete?.entityType === 'batch' ? selectedAthlete?.id : null} 
          initialStartDate={selectedAssignDate ? format(selectedAssignDate, 'yyyy-MM-dd') : undefined} 
          initialDays={editingWorkoutDays || undefined} 
          recipientName={selectedAthlete ? (selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete)) : undefined} 
        />
        <BatchCreationModal 
          isOpen={isBatchModalOpen} 
          onClose={() => { 
            setIsBatchModalOpen(false); 
            setEditingBatch(null); 
          }} 
          onSuccess={fetchAthletes} 
          batchToEdit={editingBatch} 
        />
        <ClientGroupsModal 
          open={isGroupsModalOpen} 
          onOpenChange={(open) => {
            setIsGroupsModalOpen(open);
            if (!open) {
              fetchAthletes();
            }
          }} 
        />
        {editingItem && (
          <WorkoutItemModal 
            isOpen={!!editingItem} 
            onClose={() => setEditingItem(null)} 
            dayId={editingItem.workout_day_id} 
            orgId={profile?.organization_id || ""} 
            initialItem={editingItem} 
            onSave={() => { 
              toast({ title: "Exercise updated" }); 
              fetchAthleteWorkouts(); 
            }} 
          />
        )}

        {/* Delete All Upcoming Confirmation Modal */}
        <AlertDialog open={confirmDeleteUpcomingOpen} onOpenChange={setConfirmDeleteUpcomingOpen}>
          <AlertDialogContent className="bg-slate-900 border-white/10 text-white rounded-2xl shadow-2xl max-w-md">
            <AlertDialogHeader>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-white uppercase tracking-tight">
                Delete All Upcoming Workouts?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 text-xs leading-relaxed">
                This will delete all scheduled workouts for <strong className="text-white">{selectedAthlete ? (selectedAthlete.entityType === 'batch' ? selectedAthlete.name : formatClientName(selectedAthlete)) : 'this athlete'}</strong> from <strong className="text-white">{format(currentDate, 'MMMM d, yyyy')}</strong> onwards.
                <br /><br />
                Past workout history before this date will remain safe and unaffected. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2 mt-4">
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl font-bold uppercase text-xs tracking-wider">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUpcoming}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-rose-600/30"
              >
                Delete Upcoming
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
