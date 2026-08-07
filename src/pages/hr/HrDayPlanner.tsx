import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CheckCircle2, 
  Clock, Trash2, CalendarDays, UserCheck, Megaphone, FileText, Sparkles, Filter
} from "lucide-react";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PlannerTask {
  id: string;
  timeSlot: string; // e.g. "09:00 AM"
  title: string;
  category: "interview" | "review" | "notice" | "leave_audit" | "meeting" | "general";
  priority: "high" | "normal" | "routine";
  completed: boolean;
  notes?: string;
}

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
];

const CATEGORY_LABELS: Record<PlannerTask["category"], { label: string; bg: string; text: string }> = {
  interview: { label: "Interview", bg: "bg-purple-50", text: "text-purple-700" },
  review: { label: "Performance Review", bg: "bg-blue-50", text: "text-blue-700" },
  notice: { label: "Notice / Announcement", bg: "bg-teal-50", text: "text-teal-700" },
  leave_audit: { label: "Leave & Attendance Audit", bg: "bg-amber-50", text: "text-amber-700" },
  meeting: { label: "Staff Meeting", bg: "bg-indigo-50", text: "text-indigo-700" },
  general: { label: "General HR Task", bg: "bg-slate-100", text: "text-slate-700" },
};

export default function HrDayPlanner() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Task Creation Form State
  const [timeSlot, setTimeSlot] = useState("09:00 AM");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerTask["category"]>("general");
  const [priority, setPriority] = useState<PlannerTask["priority"]>("normal");
  const [notes, setNotes] = useState("");

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Load tasks from localStorage for the selected date (Clean state: no dummy data)
  useEffect(() => {
    const saved = localStorage.getItem(`hr_day_planner_${profile?.id || 'default'}_${dateKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean out legacy dummy tasks if present
        const filtered = parsed.filter((t: PlannerTask) => 
          !t.title.includes("Morning Attendance & Duty Status Check") && 
          !t.title.includes("Staff Onboarding Interview - Sports Physician")
        );
        setTasks(filtered);
      } catch (e) {
        setTasks([]);
      }
    } else {
      setTasks([]);
    }
  }, [dateKey, profile?.id]);

  // Save tasks to localStorage
  const saveTasks = (newTasks: PlannerTask[]) => {
    setTasks(newTasks);
    localStorage.setItem(`hr_day_planner_${profile?.id || 'default'}_${dateKey}`, JSON.stringify(newTasks));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast({ title: "Title Required", description: "Please enter a task title.", variant: "destructive" });

    const newTask: PlannerTask = {
      id: Date.now().toString(),
      timeSlot,
      title: title.trim(),
      category,
      priority,
      completed: false,
      notes: notes.trim()
    };

    const updated = [...tasks, newTask];
    saveTasks(updated);
    toast({ title: "Task Scheduled ✓", description: `Added to your schedule at ${timeSlot}.` });

    // Reset Form
    setTitle("");
    setNotes("");
    setModalOpen(false);
  };

  const toggleTaskCompletion = (taskId: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    saveTasks(updated);
  };

  const deleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    saveTasks(updated);
    toast({ title: "Task Removed" });
  };

  const openAddForSlot = (slot: string) => {
    setTimeSlot(slot);
    setModalOpen(true);
  };

  // Metrics
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-7xl mx-auto pb-32 sm:pb-12 px-2 sm:px-4">
        {/* Header & Main Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              HR Day Planner & Schedule
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Plan daily HR tasks, candidate interviews, staff reviews, and notice broadcasts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setModalOpen(true)}
              className="gap-2 font-bold rounded-xl shadow-md bg-primary hover:bg-primary/90 text-xs sm:text-sm h-10 px-4"
            >
              <Plus className="w-4 h-4" />
              Add Task / Event
            </Button>
          </div>
        </div>

        {/* 2-Column Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Timeline & Hour Slots (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Date Navigator Bar */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setSelectedDate(prev => subDays(prev, 1))}
                  className="h-9 w-9 rounded-xl flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="text-center flex-1">
                  <span className="text-xs sm:text-sm font-black text-slate-900 block uppercase tracking-tight">
                    {format(selectedDate, "EEEE, dd MMMM yyyy")}
                  </span>
                  {isToday(selectedDate) && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest mt-0.5">
                      Today's Active Schedule
                    </Badge>
                  )}
                </div>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                  className="h-9 w-9 rounded-xl flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-xs font-black rounded-xl h-9 px-3 hidden xs:flex flex-shrink-0"
                >
                  Today
                </Button>
              </div>
            </Card>

            {/* Summary Progress Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="border border-slate-100 shadow-sm rounded-2xl p-3.5 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Completion Rate</p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">{progressPercent}%</h3>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <Progress value={progressPercent} className="h-1.5 rounded-full" />
                <p className="text-[10px] text-slate-500 font-medium">
                  {completedCount} of {totalCount} tasks completed
                </p>
              </Card>

              <Card className="border border-slate-100 shadow-sm rounded-2xl p-3.5 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Total Planned</p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">{totalCount} <span className="text-xs font-bold text-slate-500">events</span></h3>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium pt-1">
                  Across 12 working hour slots
                </p>
              </Card>

              <Card className="border border-slate-100 shadow-sm rounded-2xl p-3.5 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Urgent Tasks</p>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                      {tasks.filter(t => t.priority === "high" && !t.completed).length} <span className="text-xs font-bold text-slate-500">pending</span>
                    </h3>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-rose-600 font-bold pt-1">
                  Priority items for {format(selectedDate, "dd MMM")}
                </p>
              </Card>
            </div>

            {/* Timeline Slots List */}
            <div className="space-y-3">
              {TIME_SLOTS.map(slot => {
                const slotTasks = tasks.filter(t => t.timeSlot === slot);

                return (
                  <div key={slot} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:border-slate-300 transition-all">
                    {/* Time Badge */}
                    <div className="sm:w-28 flex-shrink-0 flex items-center justify-between sm:flex-col sm:items-start gap-1 pt-0.5">
                      <Badge variant="outline" className="font-black text-xs px-2.5 py-1 rounded-xl bg-slate-50 text-slate-800 border-slate-200">
                        <Clock className="w-3 h-3 mr-1 text-slate-400" />
                        {slot}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAddForSlot(slot)}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 h-7 px-2"
                      >
                        + Add Task
                      </Button>
                    </div>

                    {/* Slot Tasks Container */}
                    <div className="flex-1 space-y-2">
                      {slotTasks.length === 0 ? (
                        <div 
                          onClick={() => openAddForSlot(slot)}
                          className="p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium italic cursor-pointer hover:bg-slate-50/50 hover:border-primary/40 transition-colors"
                        >
                          No tasks scheduled for {slot}. Click to plan an event.
                        </div>
                      ) : (
                        slotTasks.map(task => {
                          const catConfig = CATEGORY_LABELS[task.category];

                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                                task.completed ? "bg-slate-50/80 border-slate-200 opacity-75" : "bg-white border-slate-200 shadow-sm"
                              )}
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <button
                                  onClick={() => toggleTaskCompletion(task.id)}
                                  className={cn(
                                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5",
                                    task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-500"
                                  )}
                                >
                                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>

                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={cn("text-xs sm:text-sm font-black text-slate-900 truncate", task.completed && "line-through text-slate-400")}>
                                      {task.title}
                                    </h4>
                                    <Badge className={cn("text-[8px] font-black uppercase border-none px-2 py-0.5", catConfig.bg, catConfig.text)}>
                                      {catConfig.label}
                                    </Badge>
                                    {task.priority === "high" && (
                                      <Badge className="bg-rose-500/10 text-rose-600 border-none text-[8px] font-black uppercase">
                                        Urgent
                                      </Badge>
                                    )}
                                  </div>
                                  {task.notes && (
                                    <p className="text-[11px] font-medium text-slate-600 italic">"{task.notes}"</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Mini Calendar & Date Navigator (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Interactive Mini Calendar Navigation Card */}
            <Card className="border border-slate-200 shadow-md rounded-[28px] overflow-hidden bg-white p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Date Navigator</h3>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-slate-500 border-slate-200">
                  {format(selectedDate, "MMM yyyy")}
                </Badge>
              </div>

              <div className="flex justify-center border border-slate-100 rounded-2xl bg-slate-50/50 p-1">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="rounded-xl border-none p-0"
                />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Selected Date:</span>
                <span className="font-bold text-slate-900">{format(selectedDate, "dd MMM yyyy")}</span>
              </div>
            </Card>

            {/* Quick Action Card */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-4 space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Planner Overview</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click any date on the mini calendar to view or manage that day's HR schedule.
              </p>
              <Button
                onClick={() => setModalOpen(true)}
                className="w-full font-bold rounded-xl gap-2 h-10 text-xs shadow-md bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4" />
                Schedule New Event
              </Button>
            </Card>
          </div>

        </div>

        {/* Create Task Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="w-5 h-5 text-primary" />
                Schedule HR Task / Event
              </DialogTitle>
              <DialogDescription>
                Add a task or meeting to your HR Day Planner for {format(selectedDate, "dd MMM yyyy")}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddTask} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Time Slot</label>
                  <Select value={timeSlot} onValueChange={setTimeSlot}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Select Time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority</label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Urgent / High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Task Category</label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interview">Staff Onboarding Interview</SelectItem>
                    <SelectItem value="review">Performance Review</SelectItem>
                    <SelectItem value="notice">Notice & Announcement</SelectItem>
                    <SelectItem value="leave_audit">Leave & Attendance Audit</SelectItem>
                    <SelectItem value="meeting">Staff Meeting</SelectItem>
                    <SelectItem value="general">General HR Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Task Title</label>
                <Input
                  placeholder="e.g. Conduct interview with Senior Physio candidate"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes & Details (Optional)</label>
                <Textarea
                  placeholder="Additional context or meeting notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-[80px] rounded-xl resize-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="font-bold px-6">
                  Schedule Task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
