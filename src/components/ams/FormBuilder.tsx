import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Trash2, 
  Plus, 
  Settings, 
  GripVertical, 
  CheckCircle2, 
  Type, 
  ListOrdered, 
  CheckSquare, 
  Activity, 
  Loader2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Star,
  Info,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Question {
  id: string;
  type: 'text' | 'mcq' | 'checkbox' | 'range';
  label: string;
  required: boolean;
  options: { text: string; score: number }[];
  minLabel?: string;
  maxLabel?: string;
  scaleLimit?: 5 | 10;
}

interface FormBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function FormBuilder({ isOpen, onClose, onSuccess, initialData }: FormBuilderProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [formName, setFormName] = useState(initialData?.name || "");
  const [classification, setClassification] = useState<'clinical' | 'performance'>(initialData?.classification || "performance");
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
  const [isScored, setIsScored] = useState(initialData?.questions?.some((q: any) => q.options?.some((o: any) => o.score > 0)) || false);
  const [saving, setSaving] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormName(initialData?.name || "");
      setClassification(initialData?.classification || "performance");
      setQuestions(initialData?.questions || []);
      setIsScored(initialData?.questions?.some((q: any) => q.options?.some((o: any) => o.score > 0)) || false);
      setShowSuccessActions(false);
      setSavedFormId(null);
      setActiveQuestionId(null);
    }
  }, [isOpen, initialData]);

  const addQuestion = (type: Question['type']) => {
    const newId = crypto.randomUUID();
    const newQuestion: Question = {
      id: newId,
      type,
      label: "",
      required: true,
      options: type === 'mcq' || type === 'checkbox' ? [{ text: "", score: 0 }] : []
    };
    
    if (type === 'range') {
      newQuestion.minLabel = "Low";
      newQuestion.maxLabel = "High";
      newQuestion.scaleLimit = 10;
    }
    
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newId);
    
    // Auto-scroll logic
    setTimeout(() => {
      const element = document.getElementById(`q-${newId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...q.options, { text: "", score: 0 }] };
      }
      return q;
    }));
  };

  const updateOption = (qId: string, optIndex: number, updates: Partial<{ text: string; score: number }>) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIndex] = { ...newOptions[optIndex], ...updates };
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: q.options.filter((_, i) => i !== optIndex) };
      }
      return q;
    }));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Form name required", variant: "destructive" });
      return;
    }
    if (questions.length === 0) {
      toast({ title: "At least one question required", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const formPayload = {
        org_id: profile?.organization_id,
        name: formName,
        classification: classification,
        questions: questions,
        created_by: user.id
      };

      let error;
      let savedData;
      if (initialData?.id) {
        ({ data: savedData, error } = await supabase
          .from("questionnaires" as any)
          .update(formPayload as any)
          .eq("id", initialData.id)
          .select()
          .single());
      } else {
        ({ data: savedData, error } = await supabase
          .from("questionnaires" as any)
          .insert([formPayload as any])
          .select()
          .single());
      }

      if (error) {
        if (error.message.includes('column "classification" does not exist')) {
          throw new Error("Database update required. Please run the migration script provided in the root directory (supabase/migrations/manual_update_classification.sql).");
        }
        throw error;
      }

      setSavedFormId(savedData.id);
      setShowSuccessActions(true);

      toast({ 
        title: initialData?.id ? "Template Updated" : "Template Created",
        description: `${formName} is now live in your library.`
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const isMobile = useIsMobile();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#F1F5F9] border-none text-slate-900 rounded-none md:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.1)] p-0 max-w-full md:max-w-7xl ring-1 ring-slate-200/50 h-full md:h-[92vh] flex flex-col">
        {/* Modern Header */}
        <DialogHeader className="p-3 md:p-6 bg-white border-b border-slate-100 flex-shrink-0 z-20">
          <div className="flex items-center justify-between gap-4 mb-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                   <Save className="w-4 h-4" />
                </div>
                 <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tight italic text-slate-900">
                  {initialData?.id ? 'Edit' : 'Create'} <span className="text-primary bg-primary/5 px-2 rounded-lg">Questionnaire</span>
                </DialogTitle>
             </div>
             
             <div className="hidden md:flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
               <div className="text-right">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Scoring</p>
                  <p className="text-[7px] font-bold text-primary uppercase italic">Auto-Calc</p>
               </div>
               <Switch checked={isScored} onCheckedChange={setIsScored} className="data-[state=checked]:bg-primary scale-75" />
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
             <Input 
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Form name..."
              className="h-10 md:h-14 bg-white border-slate-200 rounded-2xl font-black text-base md:text-xl placeholder:text-slate-200 focus-visible:ring-primary/20 border-2 text-slate-900 transition-all focus:shadow-xl focus:shadow-primary/5 flex-1"
            />

            <div className="flex items-center gap-3">
              <Tabs 
                value={classification} 
                onValueChange={(val) => setClassification(val as any)}
                className="w-full md:w-auto"
              >
                <TabsList className="grid w-full md:w-64 grid-cols-2 bg-slate-100 h-10 md:h-12 rounded-xl p-1">
                  <TabsTrigger value="performance" className="rounded-lg font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-sm">
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="clinical" className="rounded-lg font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-rose-500 shadow-sm">
                    Clinical
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="md:hidden flex items-center gap-3 bg-slate-900 p-2 rounded-xl">
                 <Switch checked={isScored} onCheckedChange={setIsScored} className="data-[state=checked]:bg-primary scale-75" />
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Builder Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
          
          {/* Desktop Palette Sidebar */}
          {!isMobile && (
            <div className="w-80 bg-white/50 backdrop-blur-xl border-r border-slate-200 flex flex-col p-8 space-y-6 overflow-y-auto">
               <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Question Palette</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Click to inject component</p>
               </div>

               <div className="space-y-3">
                  {[
                    { type: 'text', label: 'Text Response', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { type: 'mcq', label: 'Single Choice', icon: ListOrdered, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                    { type: 'checkbox', label: 'Multi Select', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { type: 'range', label: 'Rating Scale', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
                  ].map((btn) => (
                    <button
                      key={btn.type}
                       onClick={() => addQuestion(btn.type as any)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all group active:scale-95"
                    >
                       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", btn.bg, btn.color)}>
                          <btn.icon className="w-5 h-5" />
                       </div>
                       <span className="font-black uppercase text-[10px] tracking-widest text-slate-600 group-hover:text-slate-900">{btn.label}</span>
                       <Plus className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity" />
                    </button>
                  ))}
               </div>

               <div className="mt-auto pt-8">
                  <div className="p-5 rounded-[2rem] bg-slate-900 text-white space-y-3">
                     <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Builder Tip</span>
                     </div>
                     <p className="text-[10px] leading-relaxed text-white/60 font-medium italic">Rating scales can now have custom limits (1-5 or 1-10) and context labels.</p>
                  </div>
               </div>
            </div>
          )}

          {/* Main Question Canvas */}
          <div className="flex-1 overflow-y-auto bg-slate-200/40 p-4 md:p-12 custom-scrollbar space-y-12" id="builder-canvas">
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-200">
                   <div className="w-20 h-20 rounded-[2.5rem] bg-white shadow-sm flex items-center justify-center mb-6">
                      <Plus className="w-6 h-6" />
                   </div>
                   <p className="font-black uppercase text-[10px] tracking-[0.2em] italic">Start building by selecting a component</p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <Card 
                    key={q.id} 
                    id={`q-${q.id}`}
                    onFocus={() => setActiveQuestionId(q.id)}
                    className={cn(
                      "border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[3rem] overflow-hidden relative transition-all duration-500",
                      activeQuestionId === q.id 
                        ? "bg-white ring-8 ring-primary/5 border-primary scale-[1.03] z-10 shadow-[0_40px_80px_rgba(0,0,0,0.12)]" 
                        : "bg-white/95 grayscale-[0.1] opacity-95 hover:opacity-100 hover:scale-[1.01]"
                    )}
                  >
                    
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                             <Badge className="bg-slate-900 text-white border-none rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter">Q{index + 1}</Badge>
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-full shadow-lg shadow-primary/20">
                               <Zap className="w-2.5 h-2.5" />
                               <span className="text-[8px] font-black uppercase tracking-widest italic">{q.type === 'range' ? 'Scale' : q.type === 'mcq' ? 'Single Choice' : q.type === 'checkbox' ? 'Multi Select' : 'Text'}</span>
                             </div>
                          </div>
                          <Input 
                            value={q.label}
                            onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                            placeholder="Question title..."
                            className="border-none bg-transparent h-10 md:h-12 px-0 text-lg md:text-xl font-black italic placeholder:text-slate-200 focus-visible:ring-0 shadow-none text-slate-900 leading-tight"
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeQuestion(q.id)}
                          className="w-10 h-10 rounded-xl text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>

                      {/* Options Editor for MCQ/Checkbox */}
                      {(q.type === 'mcq' || q.type === 'checkbox') && (
                        <div className="space-y-4 pl-6 border-l-2 border-slate-100 mt-4">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Define Response Options</p>
                           {q.options.map((opt, oIndex) => (
                             <div key={oIndex} className="flex items-center gap-3 group/opt animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                                  {oIndex + 1}
                                </div>
                                <Input 
                                  value={opt.text}
                                  onChange={(e) => updateOption(q.id, oIndex, { text: e.target.value })}
                                  placeholder={`Option ${oIndex + 1} text...`}
                                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-black text-base focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                                />
                                {isScored && (
                                  <div className="flex flex-col gap-1.5 min-w-[80px]">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-1">Points</span>
                                    <div className="flex items-center gap-2 px-3 bg-primary/5 rounded-xl border border-primary/10 h-12">
                                      <Star className="w-3 h-3 text-primary" />
                                      <Input 
                                        type="number"
                                        value={opt.score}
                                        onChange={(e) => updateOption(q.id, oIndex, { score: parseInt(e.target.value) || 0 })}
                                        className="w-10 h-10 bg-transparent border-none font-black text-[14px] text-primary focus-visible:ring-0 text-center p-0"
                                      />
                                    </div>
                                  </div>
                                )}
                                <button 
                                  type="button"
                                  onClick={() => removeOption(q.id, oIndex)}
                                  className="opacity-0 group-hover/opt:opacity-100 transition-opacity text-slate-300 hover:text-rose-500 p-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                           ))}
                           <Button 
                              variant="ghost" 
                              onClick={() => addOption(q.id)}
                              className="h-12 rounded-xl border border-dashed border-slate-200 text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/5 hover:border-primary/20 mt-2 gap-2"
                           >
                              <Plus className="w-4 h-4" /> Add Option
                           </Button>
                        </div>
                      )}

                      {q.type === 'range' && (
                        <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200 shadow-inner mt-6 space-y-10">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {/* Label removed as requested */}
                              </div>
                              <div className="flex items-center gap-3">
                                 {isScored && (
                                   <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10 mr-2">
                                     <Star className="w-3 h-3 text-primary" />
                                     <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">Value = Score</span>
                                   </div>
                                 )}
                                 <span className="text-[9px] font-black uppercase text-slate-400">Scale Limit:</span>
                                 <Select 
                                   value={q.scaleLimit?.toString() || "10"} 
                                   onValueChange={(val) => updateQuestion(q.id, { scaleLimit: parseInt(val) as any })}
                                 >
                                   <SelectTrigger className="w-24 h-9 rounded-xl bg-white border-slate-200 font-black text-[10px]">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent className="rounded-xl p-1">
                                      <SelectItem value="5" className="rounded-lg text-[10px] font-black uppercase">1 - 5</SelectItem>
                                      <SelectItem value="10" className="rounded-lg text-[10px] font-black uppercase">1 - 10</SelectItem>
                                   </SelectContent>
                                 </Select>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                              <div className="space-y-3">
                                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-2">
                                   <ChevronRight className="w-3 h-3 text-primary rotate-180" /> Left Context Label
                                 </Label>
                                 <Input 
                                   value={q.minLabel}
                                   onChange={(e) => updateQuestion(q.id, { minLabel: e.target.value })}
                                   placeholder="e.g., Very Easy"
                                   className="h-12 md:h-14 bg-white border-slate-200 rounded-xl md:rounded-2xl font-bold text-sm md:text-base px-5 shadow-sm"
                                 />
                              </div>
                              <div className="space-y-3">
                                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-2">
                                   Right Context Label <ChevronRight className="w-3 h-3 text-primary" />
                                 </Label>
                                 <Input 
                                   value={q.maxLabel}
                                   onChange={(e) => updateQuestion(q.id, { maxLabel: e.target.value })}
                                   placeholder="e.g., Max Effort"
                                   className="h-12 md:h-14 bg-white border-slate-200 rounded-xl md:rounded-2xl font-bold text-sm md:text-base px-5 shadow-sm"
                                 />
                              </div>
                           </div>
                           
                           <div className="pt-4 border-t border-slate-200/50">
                              <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 mb-4 px-2">
                                 <span>{q.minLabel || 'START'}</span>
                                 <span>{q.maxLabel || 'END'}</span>
                              </div>
                              <div className="flex gap-1 md:gap-2">
                                 {Array.from({ length: q.scaleLimit || 10 }).map((_, i) => (
                                   <div key={i} className="flex-1 h-8 md:h-10 rounded-lg md:rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] md:text-[11px] font-black text-slate-400">
                                      {i + 1}
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Mobile FAB */}
            {isMobile && !showSuccessActions && (
              <div className="fixed bottom-24 right-6 z-50">
                 <Select onValueChange={(value) => addQuestion(value as any)}>
                   <SelectTrigger className="w-14 h-14 rounded-full bg-primary text-white shadow-2xl border-none flex items-center justify-center ring-offset-primary hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8" />
                   </SelectTrigger>
                   <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 mb-2 mr-2">
                     <SelectItem value="text" className="rounded-xl font-black uppercase text-[10px] tracking-widest py-4 cursor-pointer">Text Response</SelectItem>
                     <SelectItem value="mcq" className="rounded-xl font-black uppercase text-[10px] tracking-widest py-4 cursor-pointer">Single Choice</SelectItem>
                     <SelectItem value="checkbox" className="rounded-xl font-black uppercase text-[10px] tracking-widest py-4 cursor-pointer">Multi Select</SelectItem>
                     <SelectItem value="range" className="rounded-xl font-black uppercase text-[10px] tracking-widest py-4 cursor-pointer">Rating Scale</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
            )}
          </div>
          
          {/* Post-Save Success Overlay */}
          {showSuccessActions && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
               <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-12 h-12" />
               </div>
               <h2 className="text-3xl font-black uppercase tracking-tight italic mb-4">Template <span className="text-emerald-500">Secured</span></h2>
               <p className="text-slate-500 font-medium italic max-w-md mb-12">The questionnaire has been saved to your library. What would you like to do next?</p>
               
               <div className="flex flex-col md:flex-row gap-4 w-full max-w-lg">
                  <Button 
                    className="flex-1 h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl shadow-primary/20"
                    onClick={() => {
                      onClose();
                      // Logic to trigger bulk assign
                      window.location.href = isMobile ? `/mobile/specialist/assign/${savedFormId}` : `/ams/assignments?new=${savedFormId}`;
                    }}
                  >
                     <Plus className="w-5 h-5" /> Bulk Assign to Squad
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-16 rounded-2xl border-slate-200 font-black uppercase tracking-widest text-[11px] text-slate-600"
                    onClick={onClose}
                  >
                     Done for now
                  </Button>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 md:p-6 bg-white border-t border-slate-200 flex-shrink-0 gap-3 md:gap-6 flex flex-col md:flex-row items-center justify-between">
           <div className="flex items-center gap-4 text-slate-400">
              {profile?.organizations?.logo_url ? (
                 <img src={profile.organizations.logo_url} alt="Org" className="h-5 md:h-6 w-auto grayscale opacity-50" />
              ) : (
                <div className="flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-primary/40" />
                   <span className="text-[9px] font-black uppercase tracking-widest italic">{profile?.organizations?.official_name || 'ISHPO HUB'}</span>
                </div>
              )}
              <div className="h-4 w-px bg-slate-100 hidden md:block" />
              <div className="flex flex-col hidden md:flex">
                 <span className="text-[7px] font-black uppercase tracking-widest text-slate-300">Logged Specialist</span>
                 <span className="text-[9px] font-bold text-slate-500 italic">{profile?.full_name}</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
             <Button 
               variant="ghost" 
               onClick={onClose} 
               className="h-10 md:h-12 flex-1 md:flex-none px-6 rounded-xl font-black uppercase text-[9px] tracking-widest text-slate-400 hover:bg-slate-50 min-w-[44px]"
             >
               Discard
             </Button>
             
             <Button 
               disabled={saving || showSuccessActions}
               onClick={handleSave}
               className="h-10 md:h-12 flex-1 md:flex-none px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[9px] tracking-[0.1em] shadow-xl shadow-primary/20 gap-2 min-w-[140px] md:min-w-[180px]"
             >
               {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                 <>
                   Deploy Template
                   <ChevronRight className="w-4 h-4" />
                 </>
               )}
             </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
