import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Dumbbell, 
  Search, 
  Check, 
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  Zap,
  RotateCw,
  Activity,
  Type,
  ChevronRight,
  ChevronLeft,
  LayoutTemplate
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ExerciseItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: 'lift' | 'saqc' | 'circuit' | 'note';
  sets: number;
  reps: string;
  weight: number;
}

interface WorkoutDay {
  id: string;
  title: string;
  date: string;
  items: ExerciseItem[];
}

interface AmsQuickBuilderProps {
  startDate: string;
  onSave: (days: WorkoutDay[]) => void;
  onCancel: () => void;
  loading?: boolean;
  templateMode?: boolean;
  initialDays?: WorkoutDay[];
}

export default function AmsQuickBuilder({ startDate, onSave, onCancel, loading, templateMode, initialDays }: AmsQuickBuilderProps) {
  const [days, setDays] = useState<WorkoutDay[]>(initialDays || [
    { id: '1', title: '', date: startDate, items: [] }
  ]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState<{ [dayId: string]: boolean }>({});
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: templates } = useQuery({
      queryKey: ["ams-templates", profile?.organization_id],
      queryFn: async () => {
          if (!profile?.organization_id) return [];
          const { data, error } = await supabase
              .from('training_programs' as any)
              .select(`*, days:workout_days(*, items:workout_items(*, lift_items(*, exercise:exercises(*))))`)
              .eq('org_id', profile.organization_id)
              .eq('is_template', true)
              .order('created_at', { ascending: false });
          if (error) throw error;
          return data;
      },
      enabled: !!profile?.organization_id && !templateMode // don't load templates if we ARE building a template
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    if (initialDays && initialDays.length > 0) {
      setDays(initialDays);
    }
  }, [initialDays]);

  const fetchExercises = async () => {
    const { data } = await supabase
      .from('exercises' as any)
      .select('id, name, equipment_type')
      .order('name');
    setExercises(data || []);
  };

  const addDay = () => {
    const nextDate = addDays(new Date(days[days.length - 1].date), 1).toISOString().split('T')[0];
    setDays([...days, { 
      id: Math.random().toString(36).substr(2, 9), 
      title: '', 
      date: nextDate, 
      items: [] 
    }]);
  };

  const removeDay = (dayId: string) => {
    if (days.length > 1) {
      setDays(days.filter(d => d.id !== dayId));
    }
  };

  const addExercise = (dayId: string, exercise: any) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return {
          ...d,
          items: [...d.items, {
            id: Math.random().toString(36).substr(2, 9),
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            type: 'lift',
            sets: 3,
            reps: '10',
            weight: 0
          }]
        };
      }
      return d;
    }));
    setSearchOpen({ ...searchOpen, [dayId]: false });
  };

  const applyTemplate = (dayId: string, template: any) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        // Find the first day of the template
        const templateDay = template.days?.[0];
        if (!templateDay || !templateDay.items) return d;

        // Map template items to our ExerciseItem format
        const newItems = templateDay.items.map((item: any) => {
          const lift = item.lift_items;
          return {
            id: Math.random().toString(36).substr(2, 9),
            exerciseId: lift?.exercise?.id || lift?.exercise_id,
            exerciseName: lift?.exercise?.name || 'Unknown Exercise',
            type: 'lift',
            sets: lift?.sets || 3,
            reps: lift?.reps || '10',
            weight: lift?.load_value || 0
          };
        });

        return {
          ...d,
          title: d.title || template.name, // optionally set the title
          items: [...d.items, ...newItems]
        };
      }
      return d;
    }));
  };

  const updateItem = (dayId: string, itemId: string, field: keyof ExerciseItem, value: any) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return {
          ...d,
          items: d.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
        };
      }
      return d;
    }));
  };

  const removeItem = (dayId: string, itemId: string) => {
    setDays(days.map(d => {
      if (d.id === dayId) {
        return { ...d, items: d.items.filter(item => item.id !== itemId) };
      }
      return d;
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        {days.map((day, dayIdx) => (
          <div key={day.id} className="rounded-[2.5rem] border border-white/10 overflow-hidden bg-[#1A1F26] shadow-2xl relative">
            {/* Header Section with subtle gradient */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-white/[0.04] to-transparent flex items-center justify-between">
              <div className="flex items-center gap-6 flex-1 min-w-0 pr-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FF6B35]/20 flex items-center justify-center shrink-0 text-[#FF6B35] font-black border border-[#FF6B35]/40 shadow-lg shadow-[#FF6B35]/10 text-xl italic uppercase">
                  D{dayIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text" 
                    value={day.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setDays(days.map(d => d.id === day.id ? { ...d, title: newTitle } : d));
                    }}
                    placeholder="UNTITLED WORKOUT"
                    className="font-black uppercase tracking-tight text-xl text-white italic bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#FF6B35]/50 focus:outline-none transition-all w-full max-w-2xl px-1 py-0.5 placeholder:text-white/20 placeholder:normal-case placeholder:font-black placeholder:italic truncate"
                  />
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      <CalendarIcon className="w-3 h-3 text-[#FF6B35]" />
                      {format(new Date(day.date), 'EEEE, MMM do')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!templateMode && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-10 border-white/10 hover:bg-white/5 text-white/50 hover:text-white font-bold uppercase tracking-wider text-[10px] gap-2 rounded-xl border">
                        <LayoutTemplate className="w-3.5 h-3.5" /> Preset Templates <ChevronDown className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-[#1A1F26] border-white/10 rounded-2xl shadow-2xl" align="end">
                      <div className="mb-2 px-2 pt-1">
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-wider">Select a Template</p>
                      </div>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {templates?.map((t: any) => (
                          <div 
                            key={t.id}
                            onClick={() => applyTemplate(day.id, t)}
                            className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group/templ flex flex-col gap-1"
                          >
                            <p className="text-sm font-bold text-white group-hover/templ:text-[#FF6B35] transition-colors">{t.name}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">{t.days?.[0]?.items?.length || 0} Exercises</p>
                          </div>
                        ))}
                        {(!templates || templates.length === 0) && (
                          <div className="p-4 text-center text-white/30 text-xs italic">No templates available</div>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start text-[10px] uppercase font-black tracking-wider text-[#FF6B35] hover:bg-[#FF6B35]/10 hover:text-[#FF6B35]"
                          onClick={() => navigate('/sports-scientist/templates')}
                        >
                          <Plus className="w-3 h-3 mr-2" /> Create New Template
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {days.length > 1 && !templateMode && (
                  <Button variant="ghost" size="icon" onClick={() => removeDay(day.id)} className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-transparent hover:border-destructive/20 ml-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-8 space-y-6 bg-white/[0.01]">
              {/* Items List */}
              <div className="space-y-4">
                {day.items.map((item, itemIdx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-6 items-center group bg-[#242933] p-7 rounded-[2rem] border border-white/5 hover:border-[#FF6B35]/40 transition-all shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                    <div className="col-span-1 text-center">
                       <span className="text-[14px] font-black text-white/20 italic tracking-tighter">#{itemIdx + 1}</span>
                    </div>
                    
                    <div className="col-span-4 min-w-0">
                      <p className="font-black text-lg text-white uppercase tracking-tighter truncate italic">{item.exerciseName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[8px] uppercase font-black tracking-[0.2em] border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5">Strength</Badge>
                      </div>
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                       <Label className="text-[9px] font-black text-center uppercase tracking-[0.2em] text-[#FF6B35] opacity-60 block">Sets</Label>
                       <div className="relative group/input">
                         <input 
                          type="number" 
                          value={item.sets}
                          onChange={(e) => updateItem(day.id, item.id, 'sets', parseInt(e.target.value) || 0)}
                          className="w-full bg-[#1A1F26] border border-white/10 text-center text-2xl font-black italic rounded-xl h-14 focus:ring-2 focus:ring-[#FF6B35]/60 focus:border-transparent outline-none text-white shadow-2xl transition-all group-hover/input:border-[#FF6B35]/30"
                        />
                       </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                       <Label className="text-[9px] font-black text-center uppercase tracking-[0.2em] text-[#FF6B35] opacity-60 block">Reps</Label>
                       <div className="relative group/input">
                         <input 
                          type="text" 
                          value={item.reps}
                          onChange={(e) => updateItem(day.id, item.id, 'reps', e.target.value)}
                          className="w-full bg-[#1A1F26] border border-white/10 text-center text-2xl font-black italic rounded-xl h-14 focus:ring-2 focus:ring-[#FF6B35]/60 focus:border-transparent outline-none text-white shadow-2xl transition-all group-hover/input:border-[#FF6B35]/30"
                        />
                       </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                       <Label className="text-[9px] font-black text-center uppercase tracking-[0.2em] text-[#FF6B35] opacity-60 block">Load (KG)</Label>
                       <div className="relative group/input">
                         <input 
                          type="number" 
                          value={item.weight}
                          onChange={(e) => updateItem(day.id, item.id, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1A1F26] border border-white/10 text-center text-2xl font-black italic rounded-xl h-14 focus:ring-2 focus:ring-[#FF6B35]/60 focus:border-transparent outline-none text-white shadow-2xl transition-all group-hover/input:border-[#FF6B35]/30"
                        />
                       </div>
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(day.id, item.id)} className="h-10 w-10 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-transparent hover:border-destructive/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Right Accent Glow */}
                    <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-[#FF6B35]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>

              {/* Add Exercise Action */}
              <Popover open={searchOpen[day.id]} onOpenChange={(open) => setSearchOpen({ ...searchOpen, [day.id]: open })}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="w-full h-20 rounded-[1.5rem] border-2 border-dashed border-white/5 bg-white/[0.02] font-black uppercase tracking-[0.3em] text-[10px] text-white/20 hover:border-[#FF6B35]/40 hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] transition-all group mt-4">
                    <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-500" /> Add Exercise to Plan
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] md:w-[500px] p-0 border-white/20 bg-[#1A1F26] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Search exercises..." className="h-14 font-bold border-none text-white focus:ring-0" />
                    <CommandList 
                      className="max-h-[300px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <CommandEmpty className="p-8 text-center text-sm opacity-40">No exercises found.</CommandEmpty>
                      <CommandGroup>
                        {exercises.map((ex) => (
                          <CommandItem
                            key={ex.id}
                            onSelect={() => {
                              addExercise(day.id, ex); // Reverted to original function call as `addItem` is not defined
                            }}
                            className="flex items-center justify-between p-4 cursor-pointer data-[selected=true]:bg-primary/30 hover:bg-white/10 transition-all text-white font-bold"
                          >
                            <span className="text-white text-sm font-black">{ex.name}</span>
                            <Badge variant="outline" className="text-[8px] uppercase font-black opacity-60 text-white/80 border-white/20">{ex.equipment_type?.replace('_', ' ')}</Badge> {/* Reverted to original property as `category` is not defined */}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ))}

        {!templateMode && (
          <Button 
            onClick={addDay} 
            variant="outline" 
            className="w-full h-14 rounded-[2rem] border-white/5 bg-white/[0.02] hover:bg-white/5 font-black uppercase tracking-widest text-[10px] text-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Training Day
          </Button>
        )}
      </div>

      <div className="flex gap-4 pt-4 border-t border-white/5">
        <Button variant="ghost" onClick={onCancel} className="h-14 flex-1 rounded-2xl font-black uppercase tracking-widest text-[11px] opacity-40">Back to Selection</Button>
        <Button 
          onClick={() => onSave(days)} 
          disabled={loading || days.some(d => d.items.length === 0)}
          className="h-14 flex-[2] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20"
        >
          {loading ? (templateMode ? "Saving..." : "Assigning...") : (templateMode ? "Save Template" : "Publish Multi-Workout Plan")}
        </Button>
      </div>
    </div>
  );
}
