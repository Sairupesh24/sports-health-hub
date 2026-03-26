import React, { useState, useEffect, useRef } from "react";
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
  Sparkles
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, addDays, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";
import ProgramAssignmentModal from "@/components/ams/ProgramAssignmentModal";
import BatchCreationModal from "@/components/ams/BatchCreationModal";
import BatchInfoPopover from "@/components/ams/BatchInfoPopover";
import { Calendar } from "@/components/ui/calendar";

export default function AmsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [isAthletePopoverOpen, setIsAthletePopoverOpen] = useState(false);
  const [selectedAssignDate, setSelectedAssignDate] = useState<Date | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Generate 31 days of timeline starting from the beginning of the month
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
    }
  }, [selectedAthlete, currentDate]);

  const fetchAthletes = async () => {
    try {
      // 1. Fetch athletes (Resiliently)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .not('ams_role', 'is', null) 
        .neq('ams_role', 'coach')    
        .order('last_name', { ascending: true });
      
      if (profileError) {
        console.error("Error fetching profiles:", profileError);
      }

      // 2. Fetch batches (Resiliently)
      let batchData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('batches' as any)
          .select('*')
          .order('name', { ascending: true });
        
        if (error) {
          if (!error.message.includes("does not exist")) {
            console.error("Error fetching batches:", error);
          }
        } else {
          batchData = data || [];
        }
      } catch (err) {
        console.warn("Batches fetch exception:", err);
      }

      // 3. Combine results
      const combined = [
        ...(profileData || []).map(a => ({ ...a, entityType: 'athlete' as const })),
        ...(batchData || []).map(b => ({ ...b, entityType: 'batch' as const }))
      ];
      
      setAthletes(combined);
    } catch (error) {
      console.error("Critical error in fetchAthletes:", error);
    }
  };

  const fetchAthleteWorkouts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('program_assignments' as any)
        .select(`
          *,
          program:training_programs(
            *,
            days:workout_days(
              *,
              items:workout_items(
                *,
                lift_items(
                  *,
                  exercise:exercises(name)
                )
              )
            )
          )
        `)
        .eq(selectedAthlete.entityType === 'batch' ? 'batch_id' : 'athlete_id', selectedAthlete.id)
        .eq('status', 'active');

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error("Error fetching workouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('program_assignments' as any)
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      fetchAthleteWorkouts();
    } catch (error: any) {
      console.error("Error deleting workout:", error);
    }
  };

  const getDayWorkouts = (day: Date) => {
    return workouts.flatMap(w => {
      const start = new Date(w.start_date);
      // Use differenceInCalendarDays to avoid time zone/offset issues with Math.floor
      const diffDays = differenceInCalendarDays(day, start);
      
      if (diffDays >= 0 && w.program?.days) {
        // Find if this specific day (offset) exists in the program
        const workoutDay = w.program.days.find((d: any) => d.display_order === diffDays);
        if (workoutDay) return [{ ...workoutDay, id: w.id, programName: w.program.name }];
      }
      return [];
    });
  };

  const handleDeleteDailyWorkouts = async (dayWorkouts: any[]) => {
    if (dayWorkouts.length === 0) return;
    try {
      setLoading(true);
      const ids = dayWorkouts.map(w => w.id);
      const { error } = await supabase
        .from('program_assignments' as any)
        .delete()
        .in('id', ids);

      if (error) throw error;
      fetchAthleteWorkouts();
    } catch (error) {
      console.error("Error deleting daily workouts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="coach">
      <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col h-screen">
        <AmsStaffNav />
        
        <div className="flex flex-1 overflow-hidden bg-[#F2F4F7]">
        {/* LEFT SIDEBAR - Mini Calendar & Actions */}
        <aside className="w-80 bg-[#1A1F26] text-white flex flex-col border-r border-white/5 shadow-2xl z-20 shrink-0">
          {/* Mini Calendar Header */}
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-6">
               <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white/60" />
               </button>
               <h2 className="text-sm font-black uppercase tracking-widest text-white/90">{format(currentDate, 'MMMM yyyy')}</h2>
               <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <ChevronRight className="w-4 h-4 text-white/60" />
               </button>
            </div>
            
            <div className="bg-white/5 rounded-[2rem] p-2 border border-white/10 overflow-hidden shadow-inner flex justify-center">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(date);
                    scrollToDate(date);
                  }
                }}
                className="rounded-md border-none text-white pointer-events-auto"
                classNames={{
                  head_cell: "text-white/40 font-black text-[10px] uppercase w-9",
                  cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20 w-9 h-9",
                  day: "h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-white/10 rounded-full transition-all",
                  day_selected: "bg-primary text-white hover:bg-primary/90 focus:bg-primary shadow-lg shadow-primary/20",
                  day_today: "text-primary border border-primary/40",
                  day_outside: "text-white/20 opacity-50",
                  nav: "hidden",
                  caption: "hidden"
                }}
              />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-6 mt-auto">
             <Button 
               onClick={() => setIsAssignModalOpen(true)}
               className="w-full h-14 bg-primary hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 gap-3 border-none ring-1 ring-white/10"
             >
               <Plus className="w-4 h-4 text-white" /> Assign Program
             </Button>
          </div>
        </aside>

        {/* MAIN CONTENT - Timeline */}
        <div className="flex-1 flex flex-col">
          {/* Orange Header Bar */}
          <header className="h-16 bg-[#FF6B35] flex items-center justify-between px-8 shadow-lg z-10 shrink-0">
            <div className="flex items-center gap-4">
               <CalendarIcon className="w-5 h-5 text-white/80" />
               <span className="text-white font-black uppercase tracking-widest text-sm">{format(currentDate, 'MMMM yyyy')}</span>
            </div>

            <div className="flex items-center gap-4">
              <Popover open={isAthletePopoverOpen} onOpenChange={setIsAthletePopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 group transition-all">
                    <span className="text-white font-black text-lg uppercase tracking-tight group-hover:underline underline-offset-4 decoration-white/40">
                      {selectedAthlete 
                        ? (selectedAthlete.entityType === 'batch' 
                            ? selectedAthlete.name 
                            : `${selectedAthlete.last_name}, ${selectedAthlete.first_name}`) 
                        : "Select Athlete"}
                    </span>
                    <ChevronDown className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 border-white/20 bg-[#1A1F26] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 mt-2" align="end">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Search athletes..." className="h-14 font-bold border-none text-white focus:ring-0" />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty className="p-8 text-center text-sm opacity-40 text-white font-bold uppercase tracking-widest">No results found.</CommandEmpty>
                      
                      {athletes.filter(a => a.entityType === 'batch').length > 0 && (
                        <CommandGroup heading="Teams & Batches" className="text-[10px] font-black uppercase text-primary border-b border-white/5 py-2 px-3">
                          {athletes.filter(a => a.entityType === 'batch').map((batch) => (
                            <CommandItem
                              key={batch.id}
                              value={`batch ${batch.name}`}
                              onSelect={() => {
                                setSelectedAthlete(batch);
                                setIsAthletePopoverOpen(false);
                              }}
                              className="flex items-center gap-3 p-4 cursor-pointer data-[selected=true]:bg-primary/30 hover:bg-white/10 transition-all text-white border-b border-white/5 last:border-none"
                            >
                              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                <Users className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col flex-1">
                                <span className="font-black text-sm uppercase tracking-tight text-primary">{batch.name}</span>
                                <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Team Batch</span>
                              </div>
                                <BatchInfoPopover 
                                  batch={batch} 
                                  onUpdate={fetchAthletes} 
                                  onManage={() => {
                                    setEditingBatch(batch);
                                    setIsBatchModalOpen(true);
                                    setIsAthletePopoverOpen(false);
                                  }}
                                />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      <CommandGroup heading="Individual Athletes" className="text-[10px] font-black uppercase text-white/20 py-2 px-3">
                        {athletes.filter(a => a.entityType === 'athlete').map((athlete) => (
                          <CommandItem
                            key={athlete.id}
                            value={`${athlete.first_name} ${athlete.last_name} ${athlete.uhid || ''}`}
                            onSelect={() => {
                              setSelectedAthlete(athlete);
                              setIsAthletePopoverOpen(false);
                            }}
                            className="flex items-center gap-3 p-4 cursor-pointer data-[selected=true]:bg-primary/30 hover:bg-white/10 transition-all text-white border-b border-white/5 last:border-none"
                          >
                            <Avatar className="h-8 w-8 border border-white/10">
                              <AvatarFallback className="bg-white/5 text-[10px] font-black">{athlete.first_name?.[0]}{athlete.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col flex-1">
                              <span className="font-black text-sm uppercase tracking-tight">{athlete.last_name}, {athlete.first_name}</span>
                              <span className="text-[10px] opacity-40 font-bold">{athlete.uhid || "CLIENT RECORD"}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-6">
               <Button 
                onClick={() => setIsBatchModalOpen(true)}
                className="h-10 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded-xl border-none ring-1 ring-white/20 gap-2 shadow-lg"
               >
                  <Plus className="w-3.5 h-3.5" /> Create Batch
               </Button>
            </div>
          </header>

          {/* Timeline Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 no-scrollbar scroll-smooth">
            {!selectedAthlete ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-32 h-32 rounded-[3rem] bg-white border-4 border-dashed border-slate-200 flex items-center justify-center mb-8 rotate-12 group hover:rotate-0 transition-all duration-700 shadow-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <Users className="w-12 h-12 text-slate-200 group-hover:text-primary transition-colors relative z-10" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-3 italic">No Athlete Selected</h3>
                <p className="text-slate-400 font-bold max-w-sm">Select an athlete from the top navigation to view their training history and upcoming schedule.</p>
                <div className="mt-8 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Awaiting Selection</span>
                </div>
              </div>
            ) : (
              timelineDays.map((day, index) => {
              const dayWorkouts = getDayWorkouts(day);
              const isTodayDate = isToday(day);
              
              return (
                <div 
                  key={index} 
                  ref={(el) => {
                    if (el) dayRefs.current.set(format(day, 'yyyy-MM-dd'), el);
                  }}
                  className="flex gap-4 group"
                >
                  {/* Date Badge */}
                  <div className="flex flex-col items-center pt-2">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all border-2",
                      isTodayDate 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/30" 
                        : "bg-white border-slate-200 text-slate-400 group-hover:border-primary/40 group-hover:text-primary"
                    )}>
                      <span className="text-lg font-black leading-none">{format(day, 'd')}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest">{format(day, 'EEE')}</span>
                    </div>
                    {index < timelineDays.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
                  </div>

                  {/* Workout Card */}
                  <div className={cn(
                    "flex-1 min-h-[140px] bg-white rounded-[2rem] border p-6 flex items-start justify-between transition-all relative overflow-hidden group/card shadow-sm",
                    isTodayDate ? "ring-2 ring-primary/20 border-primary/20 shadow-primary/5" : "border-slate-100 hover:border-slate-300 hover:shadow-md"
                  )}>
                    <div className="space-y-4 w-full">
                       {dayWorkouts.length === 0 ? (
                         <>
                           <div className="flex items-center gap-3">
                             <div className="w-4 h-4 rounded-full border-2 transition-all cursor-pointer border-slate-200" />
                             <h3 className="text-xl font-black uppercase tracking-tight text-slate-300 italic">
                                Untitled Workout
                             </h3>
                           </div>
                           <div className="flex items-center gap-2 pl-7 mt-4">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="bg-[#10B981]/5 hover:bg-[#10B981] text-[#10B981] hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-4 transition-all gap-2 border-none"
                                onClick={() => {
                                  setSelectedAssignDate(day);
                                  setIsAssignModalOpen(true);
                                }}
                              >
                                 <div className="w-5 h-5 rounded-full bg-[#10B981]/20 flex items-center justify-center group-hover:bg-white/20">
                                   <Plus className="w-3 h-3" />
                                 </div>
                                 Add Workout
                              </Button>
                           </div>
                         </>
                       ) : (
                         <div className="space-y-8 w-full">
                           {dayWorkouts.map((workout: any, wIdx: number) => (
                             <div key={wIdx} className="w-full">
                               <div className="flex items-center gap-3">
                                 <div className="w-4 h-4 rounded-full border-2 transition-all cursor-pointer bg-[#10B981] border-[#10B981]" />
                                 <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                    {workout.title || "Untitled Workout"}
                                 </h3>
                                 <Badge variant="outline" className="ml-auto text-[8px] font-black uppercase shadow-xs border-slate-200 text-slate-500 tracking-widest bg-slate-50">
                                    {workout.programName}
                                 </Badge>
                               </div>

                               {/* List Exercises Here */}
                               {workout.items && workout.items.length > 0 && (
                                 <div className="pl-7 mt-5 relative mb-5">
                                   {/* Vertical connecting line */}
                                   <div className="absolute left-[43px] top-4 bottom-4 w-0.5 bg-slate-100 z-0 hidden sm:block" />
                                   <div className="space-y-3 relative z-10 w-full sm:w-auto overflow-hidden">
                                     {(workout.items as any[]).sort((a,b) => a.display_order - b.display_order).map((item: any) => {
                                       if (item.item_type === 'lift' && item.lift_items) {
                                         const exerciseName = item.lift_items.exercise?.name || 'Unknown Exercise';
                                         return (
                                           <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between group/ext bg-white hover:bg-slate-50/50 p-2 sm:p-0 rounded-xl transition-colors border sm:border-none border-slate-100 mb-2 sm:mb-0">
                                             <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
                                               <div className="w-8 h-8 rounded-full bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-200 shadow-sm relative z-10 group-hover/ext:border-primary/40 group-hover/ext:bg-primary/5 transition-all">
                                                 <Dumbbell className="w-3.5 h-3.5 text-slate-400 group-hover/ext:text-primary transition-colors" />
                                               </div>
                                               <div className="flex flex-col min-w-0 pt-0.5">
                                                 <p className="font-bold text-slate-800 text-sm truncate group-hover/ext:text-primary transition-colors">
                                                   {exerciseName}
                                                 </p>
                                                 <p className="text-[11px] text-slate-500 font-semibold tracking-wide mt-0.5">
                                                   {item.lift_items.sets} <span className="text-slate-300 font-light mx-0.5">x</span> {item.lift_items.reps} {item.lift_items.load_value > 0 ? <span className="text-slate-400 font-normal ml-1">@ {item.lift_items.load_value}kg</span> : ''}
                                                 </p>
                                               </div>
                                             </div>
                                             <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/ext:opacity-100 transition-opacity mt-2 sm:mt-0 justify-end border-t sm:border-none border-slate-100 pt-2 sm:pt-0">
                                               <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                               </button>
                                               <button 
                                                 className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                 onClick={() => handleDeleteDailyWorkouts([workout])}
                                               >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                               </button>
                                             </div>
                                           </div>
                                         );
                                       }
                                       return null;
                                     })}
                                   </div>
                                 </div>
                               )}

                               <div className="flex items-center gap-2 pl-7 mt-4">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="bg-[#10B981]/5 hover:bg-[#10B981] text-[#10B981] hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-4 transition-all gap-2 border-none cursor-pointer"
                                    onClick={() => {
                                      setSelectedAssignDate(day);
                                      setIsAssignModalOpen(true);
                                    }}
                                  >
                                     <div className="w-5 h-5 rounded-full bg-[#10B981]/20 flex items-center justify-center group-hover:bg-white/20">
                                       <Plus className="w-3 h-3" />
                                     </div>
                                     Add Workout
                                  </Button>
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>

                    <div className="flex items-center gap-2">
                       <Popover>
                         <PopoverTrigger asChild>
                           <button className="p-3 hover:bg-slate-50 rounded-2xl text-slate-300 hover:text-slate-600 transition-all opacity-0 group-hover/card:opacity-100">
                              <MoreVertical className="w-5 h-5" />
                           </button>
                         </PopoverTrigger>
                         <PopoverContent className="w-48 bg-white border-slate-200 rounded-2xl shadow-xl p-2" align="end">
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 h-10 px-3 rounded-xl gap-2 font-bold text-xs uppercase tracking-tight"
                              onClick={() => handleDeleteDailyWorkouts(dayWorkouts)}
                            >
                              <Trash2 className="w-4 h-4" /> Delete All for Day
                            </Button>
                         </PopoverContent>
                       </Popover>
                    </div>

                    {/* Background Progress Decor */}
                    <div className="absolute right-0 top-0 h-full w-1.5 bg-slate-50 group-hover/card:bg-primary/20 transition-colors" />
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      </div>

      <ProgramAssignmentModal 
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedAssignDate(null);
        }}
        program={null}
        onSuccess={fetchAthleteWorkouts}
        initialSelectedAthleteId={selectedAthlete?.entityType !== 'batch' ? selectedAthlete?.id : null}
        initialSelectedBatchId={selectedAthlete?.entityType === 'batch' ? selectedAthlete?.id : null}
        initialStartDate={selectedAssignDate ? format(selectedAssignDate, 'yyyy-MM-dd') : undefined}
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
      </div>
    </DashboardLayout>
  );
}
