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
  Play,
  Trash2
} from "lucide-react";
import { apiFetch } from "@/utils/api";
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
      const data = await apiFetch<any[]>('/ams/exercises');
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

  const handleSaveExercise = async (isNew = false) => {
    if (!name) {
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
        instructions
      };

      if (isNew) {
        await apiFetch('/ams/exercises', {
          method: 'POST',
          data: exerciseData
        });
      } else {
        await apiFetch(`/ams/exercises/${editingExercise.id}`, {
          method: 'PUT',
          data: exerciseData
        });
      }

      toast({ 
        title: isNew ? "Exercise Created" : "Exercise Updated",
        description: `${name} has been saved to the library.`
      });
      
      setIsEditDialogOpen(false);
      setIsAddDialogOpen(false);
      fetchExercises();
    } catch (error: any) {
      toast({
        title: "Error saving exercise",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!selectedCategory || ex.category === selectedCategory)
  );

  return (
    <DashboardLayout role="coach">
      <AmsStaffNav />
      <div className="container py-8 max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
            <p className="text-muted-foreground mt-1">Manage and organize your exercise database.</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 h-11 px-6 font-bold uppercase tracking-wider text-xs">
            <Plus className="w-4 h-4" /> Add Exercise
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search exercises..." 
              className="pl-10 h-11 glass border-none ring-1 ring-border/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select onValueChange={(val) => setSelectedCategory(val === 'all' ? null : val)}>
            <SelectTrigger className="w-[180px] h-11 glass border-none ring-1 ring-border/50 font-bold uppercase text-[10px] tracking-widest">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="glass border-none shadow-2xl">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="power">Power</SelectItem>
              <SelectItem value="mobility">Mobility</SelectItem>
              <SelectItem value="conditioning">Conditioning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse h-40 bg-muted/50 border-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="group p-6 rounded-2xl glass border-none ring-1 ring-border/50 hover:ring-primary/40 transition-all duration-300 relative">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{exercise.category}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={() => handleEditClick(exercise)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{exercise.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed h-10">
                  {exercise.instructions || "No instructions provided."}
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  {exercise.video_url && (
                    <a href={exercise.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                      <Play className="w-3.5 h-3.5" /> Video
                    </a>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{exercise.body_region?.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen || isAddDialogOpen} onOpenChange={() => { setIsEditDialogOpen(false); setIsAddDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[600px] glass border-none shadow-2xl p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 {isAddDialogOpen ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </div>
              {isAddDialogOpen ? "Add New Exercise" : "Edit Exercise"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Fill in the details below to save the exercise to your library.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 pt-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exercise Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 glass border-none ring-1 ring-border/50 focus:ring-primary/40 font-bold" placeholder="e.g. Back Squat" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 glass border-none ring-1 ring-border/50 focus:ring-primary/40 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-none shadow-2xl">
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="conditioning">Conditioning</SelectItem>
                    <SelectItem value="rehab">Rehab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Body Region</Label>
                <Select value={bodyRegion} onValueChange={setBodyRegion}>
                  <SelectTrigger className="h-12 glass border-none ring-1 ring-border/50 focus:ring-primary/40 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-none shadow-2xl">
                    <SelectItem value="full_body">Full Body</SelectItem>
                    <SelectItem value="upper_body">Upper Body</SelectItem>
                    <SelectItem value="lower_body">Lower Body</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Video URL (Optional)</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="h-12 glass border-none ring-1 ring-border/50 focus:ring-primary/40 font-bold" placeholder="YouTube or Vimeo link" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instructions</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-[120px] glass border-none ring-1 ring-border/50 focus:ring-primary/40 leading-relaxed font-medium" placeholder="Describe the proper form and technique..." />
            </div>
          </div>

          <DialogFooter className="p-8 pt-4 bg-muted/20 flex gap-3">
            <Button variant="ghost" onClick={() => { setIsEditDialogOpen(false); setIsAddDialogOpen(false); }} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] opacity-40 hover:opacity-100 bg-transparent hover:bg-white/5 border-none">Cancel</Button>
            <Button onClick={() => handleSaveExercise(isAddDialogOpen)} disabled={editLoading} className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 flex-1">
              {editLoading ? "Saving..." : "Save Exercise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
