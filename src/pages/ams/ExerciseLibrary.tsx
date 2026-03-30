import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { 
  Search, 
  Plus, 
  Dumbbell, 
  Video, 
  FileText, 
  Edit2, 
  Filter, 
  ChevronRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  X,
  Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  
  // Edit & Add State
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("strength");
  const [bodyRegion, setBodyRegion] = useState("full_body");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructions, setInstructions] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching exercises",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (exercise: any) => {
    setEditingExercise(exercise);
    setName(exercise.name);
    setCategory(exercise.category);
    setBodyRegion(exercise.body_region);
    setVideoUrl(exercise.video_url || "");
    setInstructions(exercise.instructions || "");
    setIsEditDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingExercise(null);
    setName("");
    setCategory("strength");
    setBodyRegion("full_body");
    setVideoUrl("");
    setInstructions("");
    setIsAddDialogOpen(true);
  };

  const handleSave = async (isNew: boolean = false) => {
    if (!name.trim()) {
      toast({ title: "Name Required", variant: "destructive" });
      return;
    }

    try {
      setEditLoading(true);
      const exerciseData = {
        name,
        category,
        body_region: bodyRegion,
        video_url: videoUrl,
        instructions,
        equipment_type: 'average_gym', // Default for now
        difficulty_level: 'intermediate', // Default for now
        muscle_groups: [], // Default for now
        updated_at: new Date().toISOString()
      };

      if (isNew) {
        const { error } = await supabase
          .from('exercises')
          .insert(exerciseData);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercises')
          .update(exerciseData)
          .eq('id', editingExercise.id);
        if (error) throw error;
      }

      toast({
        title: isNew ? "Exercise Created" : "Exercise Updated",
        description: `Successfully ${isNew ? "created" : "updated"} ${name}.`
      });

      setIsEditDialogOpen(false);
      setIsAddDialogOpen(false);
      fetchExercises();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         ex.muscle_groups?.some((m: string) => m.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? ex.category === selectedCategory : true;
    const matchesDifficulty = selectedDifficulty ? ex.difficulty_level.toLowerCase() === selectedDifficulty.toLowerCase() : true;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = Array.from(new Set(exercises.map(ex => ex.category)));

  return (
    <DashboardLayout role="coach">
      <div className="min-h-screen bg-[#0F1216] text-white flex flex-col">
        <AmsStaffNav />
        
        {/* Secondary Header - Page Specific */}
        <header className="h-16 bg-[#1A1F26] border-b border-white/5 flex items-center justify-between px-8 shadow-lg z-10 shrink-0">
          <div className="flex items-center gap-4">
             <Dumbbell className="w-5 h-5 text-primary" />
             <span className="text-white font-black uppercase tracking-widest text-sm italic">Exercise Repository</span>
          </div>

          <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-white transition-colors" />
                <Input 
                  placeholder="Search repository..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-64 bg-white/[0.05] hover:bg-white/[0.08] border-none rounded-xl pl-12 text-[11px] font-bold text-white placeholder:text-white/20 focus:ring-primary/40 transition-all ring-1 ring-white/10"
                />
              </div>
              <Button 
                onClick={handleOpenAdd}
                className="h-10 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl border-none shadow-lg gap-2"
              >
                 <Plus className="w-3.5 h-3.5" /> Add New
              </Button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1600px] mx-auto p-8 space-y-8 overflow-y-auto no-scrollbar">
          {/* Filters Row */}
          <div className="flex items-center gap-4">
             {/* Functionality (Category) Filter */}
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Functionality:</span>
                <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                   <SelectTrigger className="w-[180px] h-10 bg-white/[0.03] border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:ring-primary/40 transition-all">
                      <SelectValue placeholder="All Categories" />
                   </SelectTrigger>
                   <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-100 z-[100]">
                      <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest focus:bg-green-50 focus:text-green-600 py-3 cursor-pointer">All Functionalities</SelectItem>
                      {categories.map(cat => (
                         <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest focus:bg-green-50 focus:text-green-600 py-3 cursor-pointer">
                            {cat}
                         </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>

             {/* Difficulty Filter */}
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Difficulty:</span>
                <Select value={selectedDifficulty || "all"} onValueChange={(v) => setSelectedDifficulty(v === "all" ? null : v)}>
                   <SelectTrigger className="w-[180px] h-10 bg-white/[0.03] border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white focus:ring-primary/40 transition-all">
                      <SelectValue placeholder="All Levels" />
                   </SelectTrigger>
                   <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-slate-100 z-[100]">
                      <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest focus:bg-green-50 focus:text-green-600 py-3 cursor-pointer">All Levels</SelectItem>
                      <SelectItem value="Beginner" className="text-[10px] font-black uppercase tracking-widest focus:bg-green-50 focus:text-green-600 py-3 cursor-pointer">Beginner</SelectItem>
                      <SelectItem value="Intermediate" className="text-[10px] font-black uppercase tracking-widest focus:bg-green-50 focus:text-green-600 py-3 cursor-pointer">Intermediate</SelectItem>
                      <SelectItem value="Advanced" className="text-[10px] font-black uppercase tracking-widest focus:bg-green-50 focus:text-green-600 py-3 cursor-pointer">Advanced</SelectItem>
                   </SelectContent>
                </Select>
             </div>

             {/* Clear Active Filters */}
             {(selectedCategory || selectedDifficulty) && (
                <Button 
                   variant="ghost" 
                   onClick={() => { setSelectedCategory(null); setSelectedDifficulty(null); }}
                   className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 rounded-xl gap-2"
                >
                   <X className="w-3 h-3" /> Reset Filters
                </Button>
             )}
          </div>

          {/* Grid View */}
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 bg-white/[0.03] rounded-[2rem] animate-pulse border border-white/5" />
                ))}
             </div>
          ) : filteredExercises.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-8">
              {filteredExercises.map((exercise) => (
                <div 
                  key={exercise.id}
                  className="group relative bg-[#1A1F26] hover:bg-[#232932] border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 ring-1 ring-white/5"
                >
                   {/* Card Header & Backdrop Effect */}
                   <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                      <Dumbbell className="w-32 h-32 rotate-12" />
                   </div>

                   <div className="p-8 space-y-6 relative z-10">
                      <div className="flex justify-between items-start">
                         <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{exercise.category}</Badge>
                         {exercise.video_url && (
                            <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                               <Video className="w-5 h-5" />
                            </div>
                         )}
                      </div>

                      <div className="space-y-4 pr-4">
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-white group-hover:text-primary transition-colors leading-tight min-h-[3rem] line-clamp-2">{exercise.name}</h3>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.1em]">{exercise.body_region}</p>
                          <p className="text-[10px] text-primary/80 font-black uppercase tracking-widest italic">{exercise.difficulty_level}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                         {exercise.muscle_groups?.slice(0, 3).map((m: string) => (
                           <span key={m} className="text-[9px] font-black uppercase px-3 py-1 bg-white/5 rounded-lg text-white/50 border border-white/10 tracking-wider transition-colors group-hover:border-primary/20">{m}</span>
                         ))}
                      </div>

                      <div className="pt-4 flex gap-3">
                         <Button 
                           variant="outline" 
                           onClick={() => handleEditClick(exercise)}
                           className="flex-1 h-12 rounded-2xl bg-white/[0.03] border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] gap-2 transition-all shadow-sm"
                         >
                            <Edit2 className="w-4 h-4 opacity-40" /> Edit Resource
                         </Button>
                         {exercise.video_url && (
                           <a href={exercise.video_url} target="_blank" rel="noreferrer">
                             <Button 
                               variant="outline" 
                               className="w-12 h-12 p-0 rounded-2xl bg-primary/10 border-primary/20 hover:bg-primary text-primary hover:text-white transition-all shadow-lg shadow-primary/20"
                             >
                                <Play className="w-5 h-5 fill-current" />
                             </Button>
                           </a>
                         )}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
               <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto">
                  <Dumbbell className="w-8 h-8 text-white/10" />
               </div>
               <div className="space-y-1">
                  <p className="text-lg font-black uppercase italic tracking-widest">No exercises found</p>
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Adjust your search or filter criteria</p>
               </div>
            </div>
          )}
        </main>

        <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
          }
        }}>
          <DialogContent className="bg-[#1A1F26] border-white/20 text-white rounded-[3rem] overflow-hidden shadow-2xl p-0 max-w-xl ring-1 ring-white/10">
            <DialogHeader className="p-8 bg-white/[0.04] border-b border-white/10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                    {isAddDialogOpen ? <Plus className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                 </div>
                 <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight italic">
                      {isAddDialogOpen ? "Add New Exercise" : "Resource Guide"}
                    </DialogTitle>
                    <DialogDescription className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                      {isAddDialogOpen ? "Create a new entry in the repository" : editingExercise?.name}
                    </DialogDescription>
                 </div>
              </div>
            </DialogHeader>

            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary opacity-80">Exercise Name</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 bg-white/[0.08] border-white/10 rounded-xl px-4 text-white font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary opacity-80">Category</Label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-12 bg-white/[0.08] border-white/10 rounded-xl px-4 text-white font-bold appearance-none hover:bg-white/10 cursor-pointer outline-none"
                  >
                    <option value="strength" className="bg-[#1A1F26]">Strength</option>
                    <option value="mobility" className="bg-[#1A1F26]">Mobility</option>
                    <option value="balance" className="bg-[#1A1F26]">Balance</option>
                    <option value="plyometric" className="bg-[#1A1F26]">Plyometric</option>
                    <option value="flexibility" className="bg-[#1A1F26]">Flexibility</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                   <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary opacity-80">Youtube / Video Link</Label>
                   <Play className="w-3.5 h-3.5 text-red-500" />
                </div>
                <Input 
                  placeholder="https://youtube.com/watch?v=..." 
                  value={videoUrl} 
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="h-14 bg-white/[0.08] border-white/20 rounded-2xl px-6 font-bold text-sm focus:ring-primary/60 ring-1 ring-transparent transition-all text-white placeholder:text-white/10"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                   <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-primary opacity-80">Coaching Instructions</Label>
                   <FileText className="w-3.5 h-3.5 text-primary" />
                </div>
                <Textarea 
                  placeholder="Focus on tempo and full range of motion. Keep core braced..." 
                  value={instructions} 
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-[150px] bg-white/[0.08] border-white/20 rounded-2xl p-6 font-bold text-sm focus:ring-primary/60 ring-1 ring-transparent transition-all text-white placeholder:text-white/10 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="p-8 bg-white/[0.04] border-t border-white/10 gap-3">
               <Button variant="ghost" onClick={() => { setIsEditDialogOpen(false); setIsAddDialogOpen(false); }} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] opacity-40 hover:opacity-100 bg-transparent hover:bg-white/5 border-none">Cancel</Button>
               <Button 
                onClick={() => handleSave(isAddDialogOpen)} 
                disabled={editLoading}
                className="rounded-2xl h-14 px-12 font-black uppercase tracking-[0.2em] text-[11px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-3 min-w-[180px]"
               >
                 {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> {isAddDialogOpen ? "Create Exercise" : "Save Guide"}</>}
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
