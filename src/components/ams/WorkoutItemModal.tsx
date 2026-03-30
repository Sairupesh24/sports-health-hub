import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dumbbell, 
  Zap, 
  RotateCw, 
  Activity, 
  Clipboard, 
  Type, 
  Search, 
  Check, 
  ChevronDown 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface WorkoutItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  orgId: string;
  initialItem?: any;
  onSave: (newItem: any) => void;
}

export default function WorkoutItemModal({ 
  isOpen, 
  onClose, 
  dayId, 
  orgId, 
  initialItem, 
  onSave 
}: WorkoutItemModalProps) {
  const [activeTab, setActiveTab] = useState<string>(initialItem?.item_type || "lift");
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form States
  const [formData, setFormData] = useState<any>({
    sets: 1,
    reps: "10",
    load_value: 0,
    rounds: 1,
    content: "",
    tempo: "0-0-0-0",
    rest_time_secs: 60,
    workout_grouping: "",
    each_side: false,
    additional_info: "",
    is_completion_lift: false,
    is_bodyweight: false,
    is_coach_completion: false,
    ...initialItem?.[initialItem?.item_type]
  });

  useEffect(() => {
    fetchExercises();
    if (initialItem) {
      setActiveTab(initialItem.item_type);
      setSelectedExercise(initialItem[initialItem.item_type]?.exercise);
      setFormData({ ...initialItem[initialItem.item_type] });
    } else {
      setActiveTab("lift");
      setSelectedExercise(null);
      setFormData({
        sets: 3,
        reps: "10",
        load_value: 0,
        rounds: 1,
        content: "",
        tempo: "0-0-0-0",
        rest_time_secs: 60,
        workout_grouping: "",
        each_side: false,
        additional_info: "",
        is_completion_lift: false,
        is_bodyweight: false,
        is_coach_completion: false
      });
    }
  }, [initialItem, isOpen]);

  const fetchExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, category_id, equipment_type')
      .order('name');
    setExercises(data || []);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 1. Create/Update Base Workout Item
      const itemPayload = {
        workout_day_id: dayId,
        org_id: orgId,
        item_type: activeTab,
        display_order: initialItem?.display_order || 0
      };

      let baseItem;
      if (initialItem?.id) {
        const { data } = await supabase
          .from('workout_items')
          .update(itemPayload)
          .eq('id', initialItem.id)
          .select()
          .single();
        baseItem = data;
      } else {
        const { data } = await supabase
          .from('workout_items')
          .insert(itemPayload)
          .select()
          .single();
        baseItem = data;
      }

      // 2. Create/Update Detail Item
      const detailTable = `${activeTab}_items`;
      const detailPayload: any = { id: baseItem.id };

      if (activeTab === 'lift' || activeTab === 'saqc') {
        detailPayload.exercise_id = selectedExercise.id;
        detailPayload.sets = formData.sets;
        detailPayload.reps = formData.reps;
        detailPayload.load_value = formData.load_value;
        detailPayload.tempo = formData.tempo;
        detailPayload.rest_time_secs = formData.rest_time_secs;
        detailPayload.workout_grouping = formData.workout_grouping;
        detailPayload.each_side = formData.each_side;
        detailPayload.additional_info = formData.additional_info;
        detailPayload.is_completion_lift = formData.is_completion_lift;
        detailPayload.is_bodyweight = formData.is_bodyweight;
        detailPayload.is_coach_completion = formData.is_coach_completion;
      } else if (activeTab === 'circuit') {
        detailPayload.circuit_name = formData.circuit_name;
        detailPayload.rounds = formData.rounds;
      } else if (activeTab === 'note') {
        detailPayload.content = formData.content;
      }

      const { error: detailError } = await supabase
        .from(detailTable)
        .upsert(detailPayload);

      if (detailError) throw detailError;

      onSave({ ...baseItem, [activeTab]: { ...detailPayload, exercise: selectedExercise } });
      onClose();
    } catch (error: any) {
      console.error("Save Error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#161920] border-white/10 text-white rounded-3xl overflow-hidden glass p-0">
        <DialogHeader className="p-6 bg-white/[0.02] border-b border-white/5">
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {initialItem ? "Edit Workout Item" : "Add Workout Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {!initialItem && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList className="bg-white/5 p-1 h-auto grid grid-cols-3 md:grid-cols-6 rounded-2xl border border-white/10">
                <TabTrigger value="lift" icon={Dumbbell} label="Lift" />
                <TabTrigger value="saqc" icon={Zap} label="SAQC" />
                <TabTrigger value="circuit" icon={RotateCw} label="Circuit" />
                <TabTrigger value="sport_science" icon={Activity} label="Science" />
                <TabTrigger value="warmup" icon={Clipboard} label="Warmup" />
                <TabTrigger value="note" icon={Type} label="Note" />
              </TabsList>
            </Tabs>
          )}

          <div className="space-y-6">
            {(activeTab === 'lift' || activeTab === 'saqc') && (
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-widest opacity-50">Select Exercise</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-14 justify-between bg-white/5 border-white/10 rounded-2xl px-4 hover:bg-white/10 transition-all font-bold group">
                      <div className="flex items-center gap-3">
                        <Search className={cn("w-4 h-4 opacity-40 group-hover:text-primary transition-colors", selectedExercise && "text-primary opacity-100")} />
                        {selectedExercise ? selectedExercise.name : "Search Exercise Library..."}
                      </div>
                      <ChevronDown className="w-4 h-4 opacity-40" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] md:w-[600px] p-0 border-white/10 bg-[#161920] overflow-hidden rounded-2xl glass">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Type to filter exercises..." className="h-14 font-bold border-none" />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty className="p-8 text-center text-sm opacity-40">No exercises found.</CommandEmpty>
                        <CommandGroup>
                          {exercises.map((ex) => (
                            <CommandItem
                              key={ex.id}
                              onSelect={() => {
                                setSelectedExercise(ex);
                                setSearchOpen(false);
                              }}
                              className="p-4 cursor-pointer hover:bg-white/5 aria-selected:bg-primary/10 aria-selected:text-primary flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-bold">{ex.name}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] uppercase font-black opacity-40 border-white/10">{ex.equipment_type.replace('_', ' ')}</Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedExercise && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Sets" value={formData.sets} onChange={(v) => setFormData({...formData, sets: v})} type="number" />
                      <Field label="Reps" value={formData.reps} onChange={(v) => setFormData({...formData, reps: v})} type="text" />
                      <Field label="Load %" value={formData.load_value} onChange={(v) => setFormData({...formData, load_value: v})} type="number" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Grouping" value={formData.workout_grouping} onChange={(v) => setFormData({...formData, workout_grouping: v})} type="text" />
                      <Field label="Tempo" value={formData.tempo} onChange={(v) => setFormData({...formData, tempo: v})} type="text" />
                      <Field label="Rest (S)" value={formData.rest_time_secs} onChange={(v) => setFormData({...formData, rest_time_secs: v})} type="number" />
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          id="modal-each-side" 
                          checked={formData.each_side} 
                          onCheckedChange={(checked) => setFormData({...formData, each_side: !!checked})} 
                          className="border-white/20"
                        />
                        <Label htmlFor="modal-each-side" className="text-[10px] uppercase font-black tracking-widest text-white/60 cursor-pointer">Each Side</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest opacity-50 pl-1">Additional Information</Label>
                      <Textarea 
                        value={formData.additional_info} 
                        onChange={(e) => setFormData({...formData, additional_info: e.target.value})}
                        placeholder="Instructions..."
                        className="bg-white/5 border-white/10 rounded-2xl h-24 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'note' && (
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-widest opacity-50">Note Content</Label>
                <Textarea 
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Type your notes here..."
                  className="bg-white/5 border-white/10 rounded-2xl h-32 focus:ring-primary/40 ring-1 ring-transparent"
                />
              </div>
            )}

            {activeTab === 'circuit' && (
              <div className="space-y-4">
                <Field label="Circuit Name" value={formData.circuit_name} onChange={(v) => setFormData({...formData, circuit_name: v})} type="text" />
                <Field label="Number of Rounds" value={formData.rounds} onChange={(v) => setFormData({...formData, rounds: v})} type="number" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-white/[0.02] border-t border-white/5 gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[11px] opacity-40 hover:opacity-100">Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || (activeTab === 'lift' && !selectedExercise)}
            className="rounded-xl h-12 px-10 font-black uppercase tracking-[0.2em] text-[11px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
          >
            {saving ? "Saving..." : initialItem ? "Update Item" : "Add to Workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 md:py-2 transition-all"
    >
      <Icon className="w-4 h-4" />
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </TabsTrigger>
  );
}

function Field({ label, value, onChange, type }: { label: string, value: any, onChange: (v: any) => void, type: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase font-black tracking-widest opacity-50 pl-1">{label}</Label>
      <Input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-center italic text-xl ring-1 ring-transparent focus:ring-primary/40" 
      />
    </div>
  );
}
