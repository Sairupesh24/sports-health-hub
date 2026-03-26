import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  ChevronLeft, 
  Save, 
  Settings, 
  MoreVertical,
  Dumbbell,
  Zap,
  RotateCw,
  Activity,
  Clipboard,
  Type,
  Trash2,
  Copy,
  GripVertical,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import WorkoutItemModal from "@/components/ams/WorkoutItemModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WorkoutDay {
  id: string;
  title: string;
  is_rest_day: boolean;
  display_order: number;
  items: WorkoutItem[];
}

interface WorkoutItem {
  id: string;
  item_type: 'lift' | 'saqc' | 'circuit' | 'sport_science' | 'warmup' | 'note';
  display_order: number;
  details?: any; 
}

export default function WorkoutBuilder() {
  const { id: programId } = useParams();
  const [program, setProgram] = useState<any>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (programId) {
      fetchProgramData();
    }
  }, [programId]);

  const fetchProgramData = async () => {
    try {
      setLoading(true);
      const { data: programData, error: pError } = await supabase
        .from('training_programs' as any)
        .select('*')
        .eq('id', programId)
        .single();

      if (pError) throw pError;
      setProgram(programData);

      const { data: daysData, error: dError } = await supabase
        .from('workout_days' as any)
        .select(`
          *,
          items:workout_items(
            *,
            lift:lift_items(*, exercise:exercises(name)),
            saqc:saqc_items(*, exercise:exercises(name)),
            circuit:circuit_items(*),
            science:sport_science_items(*, questionnaire:questionnaires(name)),
            warmup:warmup_items(*),
            note:note_items(*)
          )
        `)
        .eq('program_id', programId)
        .order('display_order', { ascending: true });

      if (dError) throw dError;
      
      const formattedDays = daysData.map((day: any) => ({
        ...day,
        items: (day.items || []).sort((a: any, b: any) => a.display_order - b.display_order)
      }));

      setDays(formattedDays);
    } catch (error: any) {
      toast({
        title: "Error fetching builder data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addDay = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const newDay = {
        program_id: programId,
        org_id: profile?.organization_id,
        title: `Day ${days.length + 1}`,
        display_order: days.length,
      };

      const { data, error } = await (supabase
        .from('workout_days' as any)
        .insert(newDay as any) as any)
        .select()
        .single();

      if (error) throw error;
      setDays([...days, { ...data, items: [] }]);
    } catch (error: any) {
      toast({
        title: "Error adding day",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openAddItemModal = (dayId: string, type: string) => {
    setActiveDayId(dayId);
    setEditingItem({ item_type: type });
    setIsModalOpen(true);
  };

  const handleSaveItem = (newItem: any) => {
    fetchProgramData();
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <DashboardLayout role="coach">
      <div className="min-h-screen bg-background text-white flex flex-col">
        <AmsStaffNav />
        
        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between bg-[#161920]/50 backdrop-blur-xl sticky top-16 z-30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ams/programs')} className="hover:bg-white/5 rounded-xl">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase tracking-tight">{program?.name || "Loading..."}</h1>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] uppercase font-black px-2 py-0.5">
                  {program?.status || "Draft"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase opacity-60">Workout Builder • {days.length} Days</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hover:bg-white/5 rounded-xl">
              <Settings className="w-5 h-5 opacity-60" />
            </Button>
            <Button className="gap-2 h-11 px-8 font-black uppercase tracking-widest text-[11px] bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d222b] via-[#0f1115] to-[#0f1115]">
          <div className="flex h-full p-8 gap-8 min-w-max items-start">
            {days.map((day) => (
              <div key={day.id} className="w-[400px] flex flex-col max-h-full group">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-primary border border-white/10 shadow-xl group-hover:border-primary/50 transition-colors">
                      {day.display_order + 1}
                    </div>
                    <h2 className="font-black uppercase tracking-widest text-sm">{day.title}</h2>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 rounded-lg">
                        <MoreVertical className="w-4 h-4 opacity-40" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass border-none shadow-2xl w-48">
                      <DropdownMenuItem className="gap-2 p-3 font-bold text-[10px] uppercase tracking-wider">
                        <Edit className="w-3.5 h-3.5" /> Rename Day
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 p-3 font-bold text-[10px] uppercase tracking-wider">
                        <Copy className="w-3.5 h-3.5" /> Duplicate Day
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="gap-2 p-3 font-bold text-[10px] uppercase tracking-wider text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Day
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 h-[calc(100vh-320px)] scrollbar-hide pb-10">
                  {day.items.map((item) => (
                    <WorkoutItemCard 
                      key={item.id} 
                      item={item} 
                      onEdit={() => {
                        setEditingItem(item);
                        setActiveDayId(day.id);
                        setIsModalOpen(true);
                      }}
                    />
                  ))}
                  
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
                    <AddActionButton icon={Dumbbell} label="Lift" color="blue" onClick={() => openAddItemModal(day.id, "lift")} />
                    <AddActionButton icon={Zap} label="SAQC" color="amber" onClick={() => openAddItemModal(day.id, "saqc")} />
                    <AddActionButton icon={RotateCw} label="Circuit" color="purple" onClick={() => openAddItemModal(day.id, "circuit")} />
                    <AddActionButton icon={Activity} label="S.Science" color="emerald" onClick={() => openAddItemModal(day.id, "sport_science")} />
                    <AddActionButton icon={Clipboard} label="Warm-Up" color="rose" onClick={() => openAddItemModal(day.id, "warmup")} />
                    <AddActionButton icon={Type} label="Note" color="slate" onClick={() => openAddItemModal(day.id, "note")} />
                  </div>
                </div>
              </div>
            ))}

            <button 
              onClick={addDay}
              className="w-[400px] h-32 rounded-3xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-black uppercase tracking-[0.2em] text-[10px] opacity-40 group-hover:opacity-100">Add Training Day</span>
            </button>
          </div>
        </main>

        {activeDayId && (
          <WorkoutItemModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            dayId={activeDayId}
            orgId={program?.org_id}
            initialItem={editingItem}
            onSave={handleSaveItem}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function WorkoutItemCard({ item, onEdit }: { item: any, onEdit: () => void }) {
  const iconMap = {
    lift: Dumbbell,
    saqc: Zap,
    circuit: RotateCw,
    sport_science: Activity,
    warmup: Clipboard,
    note: Type
  };
  
  const Icon = (iconMap as any)[item.item_type] || Dumbbell;
  const name = item[item.item_type]?.exercise?.name || item[item.item_type]?.circuit_name || (item.item_type === 'note' ? 'Note' : 'Untitled Item');

  return (
    <div 
      className="group relative bg-[#1c212a] rounded-2xl border border-white/10 shadow-2xl hover:border-primary/40 transition-all cursor-pointer"
      onClick={onEdit}
    >
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/10 rounded-lg">
            <MoreVertical className="w-3.5 h-3.5 opacity-40" />
         </Button>
      </div>
      
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:border-primary/30 transition-colors">
            <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm uppercase tracking-tight truncate leading-tight mb-1">{name}</h3>
            <div className="flex flex-wrap gap-2">
              {item.item_type === 'lift' && (
                <>
                  <Badge variant="outline" className="text-[9px] uppercase font-black bg-white/5 border-none px-2 py-0.5">
                    {item.lift?.sets} Sets
                  </Badge>
                  <Badge variant="outline" className="text-[9px] uppercase font-black bg-white/5 border-none px-2 py-0.5">
                    {item.lift?.reps} Reps
                  </Badge>
                  {item.lift?.load_value && (
                    <Badge variant="outline" className="text-[9px] uppercase font-black bg-white/5 border-none px-2 py-0.5 text-primary">
                      {item.lift?.load_value}%
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-1 bg-white/[0.02] group-hover:bg-primary/20 transition-colors rounded-b-2xl" />
    </div>
  );
}

function AddActionButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  const colors: any = {
    blue: "hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
    amber: "hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30",
    purple: "hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30",
    emerald: "hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
    rose: "hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30",
    slate: "hover:bg-slate-500/10 hover:text-slate-400 hover:border-slate-500/30",
  };

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-transparent transition-all group ${colors[color] || ""}`}
    >
      <Icon className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
      <span className="font-black uppercase tracking-widest text-[8px] opacity-40 group-hover:opacity-100">{label}</span>
    </button>
  );
}
