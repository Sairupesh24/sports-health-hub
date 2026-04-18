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
  LayoutTemplate,
  Pencil
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  load_type: 'absolute' | 'percentage';
  tempo?: string;
  rest_time_secs?: number;
  workout_grouping?: string;
  each_side?: boolean;
  additional_info?: string;
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
  recipientName?: string;
  hideTitle?: boolean;
}

export default function AmsQuickBuilder({ startDate, onSave, onCancel, loading, templateMode, initialDays, recipientName, hideTitle }: AmsQuickBuilderProps) {
  const [days, setDays] = useState<WorkoutDay[]>(initialDays || [
    { id: '1', title: '', date: startDate, items: [] }
  ]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState<{ [dayId: string]: boolean }>({});
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<{ [itemId: string]: boolean }>({});

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
      enabled: !!profile?.organization_id
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

  const addGroup = () => {
    const lastDate = days[days.length - 1].date;
    setDays([...days, { 
      id: Math.random().toString(36).substr(2, 9), 
      title: '', 
      date: lastDate, 
      items: [] 
    }]);
  };

  const removeDay = (dayId: string) => {
    if (days.length > 1) {
      setDays(days.filter(d => d.id !== dayId));
    }
  };

  const addExercise = (dayId: string, exercise: any) => {
    setDays(days.map((d, dIdx) => {
      if (d.id === dayId) {
        const groupLetter = String.fromCharCode(65 + dIdx);
        const exerciseNumber = d.items.length + 1;
        return {
          ...d,
          items: [...d.items, {
            id: Math.random().toString(36).substr(2, 9),
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            type: 'lift',
            sets: 3,
            reps: '10',
            weight: 0,
            load_type: 'absolute',
            tempo: '0-0-0-0',
            rest_time_secs: 60,
            workout_grouping: `${groupLetter}${exerciseNumber}`,
            each_side: false,
            additional_info: '',
            is_completion_lift: false,
            is_bodyweight: false,
            is_coach_completion: false
          }]
        };
      }
      return d;
    }));
    setSearchOpen({ ...searchOpen, [dayId]: false });
  };

  const applyTemplate = (dayId: string, template: any) => {
    setDays(days.map((d, dIdx) => {
      if (d.id === dayId) {
        // Find the first day of the template
        const templateDay = template.days?.[0];
        if (!templateDay || !templateDay.items) return d;

        // Map template items to our ExerciseItem format
        const groupLetter = String.fromCharCode(65 + dIdx);
        const newItems = templateDay.items.map((item: any, iIdx: any) => {
          const lift = item.lift_items;
          return {
            id: Math.random().toString(36).substr(2, 9),
            exerciseId: lift?.exercise?.id || lift?.exercise_id,
            exerciseName: lift?.exercise?.name || 'Unknown Exercise',
            type: 'lift',
            sets: lift?.sets || 3,
            reps: lift?.reps || '10',
            weight: lift?.load_value || 0,
            load_type: lift?.load_type || 'absolute',
            tempo: lift?.tempo || '0-0-0-0',
            rest_time_secs: lift?.rest_time_secs || 60,
            workout_grouping: lift?.workout_grouping || `${groupLetter}${d.items.length + iIdx + 1}`,
            each_side: lift?.each_side || false,
            additional_info: lift?.additional_info || '',
            is_completion_lift: lift?.is_completion_lift || false,
            is_bodyweight: lift?.is_bodyweight || false,
            is_coach_completion: lift?.is_coach_completion || false
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
      {!hideTitle && (
        <div className="flex flex-col">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Dumbbell className="w-4 h-4" />
            </div>
            {templateMode ? "Create Template" : "Build Training Plan"}
          </h3>
        </div>
      )}
      {recipientName && (
        <div className={cn("flex items-center gap-2 mt-2", !hideTitle && "pl-13")}>
          <Badge variant="outline" className="bg-primary/20 border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
            Assigning to: {recipientName}
          </Badge>
        </div>
      )}
      <div className="space-y-6">
        {days.map((day, dayIdx) => (
          <div key={day.id} className="rounded-2xl border border-white/10 overflow-hidden bg-[#1A1F26] shadow-xl relative">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold border border-primary/20 text-sm">
                  {String.fromCharCode(65 + dayIdx)}
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
                    className="font-bold uppercase tracking-tight text-lg text-white bg-transparent border-none focus:outline-none transition-all w-full max-w-2xl placeholder:text-white/20 truncate"
                  />
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(day.date), 'EEE, MMM do')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 border-white/10 bg-transparent text-white/50 hover:text-white hover:bg-white/5 text-[10px] gap-2 rounded-lg">
                        <LayoutTemplate className="w-3 h-3" /> Templates <ChevronDown className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-[#1A1F26] border-white/10 rounded-xl shadow-2xl" align="end">
                      <div className="mb-2 px-2 pt-1">
                        <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider">Select a Template</p>
                      </div>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {templates?.map((t: any) => (
                          <div 
                            key={t.id}
                            onClick={() => applyTemplate(day.id, t)}
                            className="p-2.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group/templ flex flex-col gap-1"
                          >
                            <p className="text-sm font-semibold text-white group-hover/templ:text-primary transition-colors">{t.name}</p>
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
                

                {days.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDay(day.id)} 
                    className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4 bg-white/[0.01]">
              <div className="space-y-2">
                {day.items.map((item, itemIdx) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "group bg-[#242933]/50 p-4 rounded-xl border transition-all relative overflow-hidden",
                      expandedItems[item.id] ? "border-primary/40 bg-[#242933]" : "border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-6 text-center">
                         <span className="text-xs font-bold text-white/20">#{itemIdx + 1}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white uppercase tracking-tight truncate">{item.exerciseName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{item.workout_grouping || '—'}</span>
                          <span className="text-[9px] font-medium text-white/20 uppercase">Strength</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                           <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-1">Sets</span>
                           <input 
                            type="number" 
                            value={item.sets}
                            onChange={(e) => updateItem(day.id, item.id, 'sets', parseInt(e.target.value) || 0)}
                            className="w-10 bg-white/5 border border-white/10 text-center text-sm font-bold rounded-md h-8 focus:border-primary/50 outline-none text-white transition-all"
                          />
                        </div>

                        <div className="flex flex-col items-center">
                           <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-1">Reps</span>
                           <input 
                            type="text" 
                            value={item.reps}
                            onChange={(e) => updateItem(day.id, item.id, 'reps', e.target.value)}
                            className="w-12 bg-white/5 border border-white/10 text-center text-sm font-bold rounded-md h-8 focus:border-primary/50 outline-none text-white transition-all"
                          />
                        </div>

                        <div className="flex flex-col items-center">
                           <div className="flex items-center gap-1 mb-1">
                             <span className="text-[8px] font-bold uppercase tracking-wider text-white/30">{item.load_type === 'absolute' ? 'Load' : '% 1RM'}</span>
                             <button 
                               onClick={() => updateItem(day.id, item.id, 'load_type', item.load_type === 'absolute' ? 'percentage' : 'absolute')}
                               className="text-[8px] font-bold text-primary hover:underline"
                             >
                               {item.load_type === 'absolute' ? '(KG)' : '(%)'}
                             </button>
                           </div>
                           <input 
                            type="number" 
                            value={item.weight}
                            onChange={(e) => updateItem(day.id, item.id, 'weight', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white/5 border border-white/10 text-center text-sm font-bold rounded-md h-8 focus:border-primary/50 outline-none text-white transition-all"
                          />
                        </div>

                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))} 
                            className={cn(
                              "h-8 w-8 rounded-lg transition-all",
                              expandedItems[item.id] ? "bg-primary/20 text-primary" : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeItem(day.id, item.id)} 
                            className="h-8 w-8 text-white/20 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Advanced parameters section - collapsible */}
                    {expandedItems[item.id] && (
                      <div className="animate-in slide-in-from-top-2 duration-200 mt-4 pt-4 border-t border-white/5 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Grouping</Label>
                            <Input 
                              placeholder="e.g. A1"
                              value={item.workout_grouping}
                              onChange={(e) => updateItem(day.id, item.id, 'workout_grouping', e.target.value)}
                              className="bg-white/5 border-white/10 rounded-lg h-9 text-xs focus:ring-primary/40"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Tempo</Label>
                            <Input 
                              placeholder="5-0-1-0"
                              value={item.tempo}
                              onChange={(e) => updateItem(day.id, item.id, 'tempo', e.target.value)}
                              className="bg-white/5 border-white/10 rounded-lg h-9 text-xs focus:ring-primary/40"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Rest (s)</Label>
                            <Input 
                              type="number"
                              placeholder="60"
                              value={item.rest_time_secs}
                              onChange={(e) => updateItem(day.id, item.id, 'rest_time_secs', parseInt(e.target.value) || 0)}
                              className="bg-white/5 border-white/10 rounded-lg h-9 text-xs focus:ring-primary/40"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <Checkbox 
                              id={`each-side-${item.id}`} 
                              checked={item.each_side} 
                              onCheckedChange={(checked) => updateItem(day.id, item.id, 'each_side', checked)}
                              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label htmlFor={`each-side-${item.id}`} className="text-[10px] font-bold uppercase tracking-wider text-white/60 cursor-pointer">Each Side</Label>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Coaching Cues</Label>
                          <Textarea 
                            placeholder="Add exercise notes..."
                            value={item.additional_info}
                            onChange={(e) => updateItem(day.id, item.id, 'additional_info', e.target.value)}
                            className="bg-white/5 border-white/10 rounded-lg h-16 text-xs focus:ring-primary/40 min-h-[40px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Popover open={searchOpen[day.id]} onOpenChange={(open) => setSearchOpen({ ...searchOpen, [day.id]: open })}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="w-full h-12 rounded-xl border-2 border-dashed border-white/5 bg-white/[0.02] font-bold uppercase tracking-widest text-[10px] text-white/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all mt-2">
                    <Plus className="w-4 h-4 mr-2" /> Add Exercise
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] md:w-[400px] p-0 border-white/10 bg-[#1A1F26] overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/5">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Search exercises..." className="h-11 border-none focus:ring-0" />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty className="p-4 text-center text-xs opacity-40">No results found.</CommandEmpty>
                      <CommandGroup>
                        {exercises.map((ex) => (
                          <CommandItem
                            key={ex.id}
                            onSelect={() => addExercise(day.id, ex)}
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-all"
                          >
                            <span className="text-white text-xs font-bold">{ex.name}</span>
                            <span className="text-[8px] uppercase font-bold text-white/20">{ex.equipment_type?.replace('_', ' ')}</span>
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

        <Button 
          onClick={addGroup} 
          variant="outline" 
          className="w-full h-12 rounded-xl border-white/5 bg-white/[0.02] hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] text-primary"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Workout Group
        </Button>
      </div>

      <div className="flex gap-4 pt-6 mt-8 border-t border-white/5">
        <Button variant="ghost" onClick={onCancel} className="h-12 flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] opacity-40">Cancel</Button>
        <Button 
          onClick={() => onSave(days)} 
          disabled={loading || days.some(d => d.items.length === 0)}
          className="h-12 flex-[2] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-[0.15em] text-[10px]"
        >
          {loading ? "Saving..." : (templateMode ? "Save Template" : "Publish Plan")}
        </Button>
      </div>
    </div>
  );
}
