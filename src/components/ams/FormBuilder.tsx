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
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
  const [isScored, setIsScored] = useState(initialData?.questions?.some((q: any) => q.options?.some((o: any) => o.score > 0)) || false);
  const [saving, setSaving] = useState(false);

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      label: "",
      required: true,
      options: type === 'mcq' || type === 'checkbox' ? [{ text: "", score: 0 }] : []
    };
    
    if (type === 'range') {
      newQuestion.minLabel = "Low";
      newQuestion.maxLabel = "High";
    }
    
    setQuestions([...questions, newQuestion]);
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
        questions: questions,
        created_by: user.id
      };

      let error;
      if (initialData?.id) {
        ({ error } = await supabase
          .from("questionnaires" as any)
          .update(formPayload as any)
          .eq("id", initialData.id));
      } else {
        ({ error } = await supabase
          .from("questionnaires" as any)
          .insert([formPayload as any]));
      }

      if (error) throw error;

      toast({ 
        title: initialData?.id ? "Template Updated" : "Template Created",
        description: `${formName} is now live in your library.`
      });
      
      onSuccess();
      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#F8FAFC] border-none text-slate-900 rounded-[3rem] overflow-hidden shadow-2xl p-0 max-w-5xl ring-1 ring-slate-200 h-[90vh] flex flex-col">
        {/* Modern Header */}
        <DialogHeader className="p-8 bg-white border-b border-slate-100 flex-shrink-0 z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Save className="w-5 h-5" />
                 </div>
                 <DialogTitle className="text-2xl font-black uppercase tracking-tight italic">
                   {initialData?.id ? 'Edit' : 'Create'} <span className="text-primary">Questionnaire</span>
                 </DialogTitle>
              </div>
              <Input 
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Externally shared form name..."
                className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-black text-xl placeholder:text-slate-400 focus-visible:ring-primary/20 border-2 text-slate-900 transition-all focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-4 bg-slate-900 p-5 rounded-[2rem] border border-white/5 shadow-xl shadow-slate-900/10">
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Enable Scoring</p>
                  <p className="text-[9px] font-bold text-primary uppercase italic">Calculate Readiness</p>
               </div>
               <Switch checked={isScored} onCheckedChange={setIsScored} className="data-[state=checked]:bg-primary" />
            </div>
          </div>
        </DialogHeader>

        {/* Builder Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Sidebar: Components */}
          <div className="w-full md:w-72 bg-white border-r border-slate-200 p-8 space-y-5 flex-shrink-0 overflow-y-auto">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
               <Plus className="w-3 h-3 text-primary" /> Add Component
             </p>
             
             <button onClick={() => addQuestion('text')} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-primary/5 hover:text-primary transition-all group border border-transparent hover:border-primary/20">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-primary/10">
                   <Type className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                </div>
                <span className="font-black text-[11px] uppercase tracking-widest text-slate-700">Text Response</span>
             </button>
             
             <button onClick={() => addQuestion('mcq')} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-primary/5 hover:text-primary transition-all group border border-transparent hover:border-primary/20">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-primary/10">
                   <ListOrdered className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                </div>
                <span className="font-black text-[11px] uppercase tracking-widest text-slate-700">Single Choice</span>
             </button>
             
             <button onClick={() => addQuestion('checkbox')} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-primary/5 hover:text-primary transition-all group border border-transparent hover:border-primary/20">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-primary/10">
                   <CheckSquare className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                </div>
                <span className="font-black text-[11px] uppercase tracking-widest text-slate-700">Multi Select</span>
             </button>

             <button onClick={() => addQuestion('range')} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-primary/5 hover:text-primary transition-all group border border-transparent hover:border-primary/20">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:bg-primary/10">
                   <Activity className="w-5 h-5 text-slate-500 group-hover:text-primary" />
                </div>
                <span className="font-black text-[11px] uppercase tracking-widest text-slate-700">Scale (1-10)</span>
             </button>

             <div className="pt-8 opacity-40">
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center gap-2">
                   <Zap className="w-6 h-6" />
                   <p className="text-[9px] font-black uppercase">More coming soon</p>
                </div>
             </div>
          </div>

          {/* Main List Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scrollbar">
            {questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 opacity-50">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-sm flex items-center justify-center mb-6">
                    <Plus className="w-8 h-8" />
                 </div>
                 <p className="font-black uppercase text-[11px] tracking-widest italic">Start adding questions from the sidebar</p>
              </div>
            ) : (
              questions.map((q, index) => (
                <Card key={q.id} className="border-none shadow-sm rounded-3xl overflow-hidden group/card relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 group-hover/card:bg-primary transition-colors" />
                  
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between gap-6 mb-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                           <Badge className="bg-slate-900 text-white border-none rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter">QUESTION {index + 1}</Badge>
                           <span className="text-[9px] font-black uppercase tracking-widest text-primary italic">{q.type}</span>
                        </div>
                        <Input 
                          value={q.label}
                          onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                          placeholder="Your question here..."
                          className="border-none bg-transparent h-12 px-0 text-2xl font-black italic placeholder:text-slate-300 focus-visible:ring-0 shadow-none text-slate-900"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeQuestion(q.id)}
                        className="rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Options Editor for MCQ/Checkbox */}
                    {(q.type === 'mcq' || q.type === 'checkbox') && (
                      <div className="space-y-3 pl-4 border-l-2 border-slate-100">
                         {q.options.map((opt, oIndex) => (
                           <div key={oIndex} className="flex items-center gap-3 group/opt">
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                {oIndex + 1}
                              </div>
                              <Input 
                                value={opt.text}
                                onChange={(e) => updateOption(q.id, oIndex, { text: e.target.value })}
                                placeholder={`Option ${oIndex + 1}`}
                                className="h-10 bg-white border-slate-100 rounded-xl font-bold text-[13px]"
                              />
                              {isScored && (
                                <Input 
                                  type="number"
                                  value={opt.score}
                                  onChange={(e) => updateOption(q.id, oIndex, { score: parseInt(e.target.value) || 0 })}
                                  placeholder="Score"
                                  className="w-20 h-10 bg-primary/5 border-primary/10 rounded-xl font-black text-[12px] text-primary"
                                />
                              )}
                              <button 
                                onClick={() => removeOption(q.id, oIndex)}
                                className="opacity-0 group-hover/opt:opacity-100 transition-opacity text-slate-300 hover:text-rose-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                         ))}
                         <Button 
                            variant="ghost" 
                            onClick={() => addOption(q.id)}
                            className="text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/5 hover:text-primary mt-2"
                         >
                            <Plus className="w-3 h-3 mr-1.5" /> Add Option
                         </Button>
                      </div>
                    )}

                    {q.type === 'range' && (
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Min Label (1)</Label>
                             <Input 
                               value={q.minLabel}
                               onChange={(e) => updateQuestion(q.id, { minLabel: e.target.value })}
                               className="h-10 bg-white border-slate-100 rounded-xl"
                             />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Max Label (10)</Label>
                             <Input 
                               value={q.maxLabel}
                               onChange={(e) => updateQuestion(q.id, { maxLabel: e.target.value })}
                               className="h-10 bg-white border-slate-100 rounded-xl"
                             />
                          </div>
                       </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-8 bg-white border-t border-slate-200 flex-shrink-0 gap-4 flex items-center">
           <div className="flex-1 flex items-center gap-4 text-slate-500 hidden md:flex">
              <div className="flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-primary" />
                 <span className="text-[9px] font-black uppercase tracking-widest italic">Linear Flow Validated</span>
              </div>
           </div>
           
           <Button variant="ghost" onClick={onClose} className="h-14 px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
             Discard changes
           </Button>
           
           <Button 
             disabled={saving}
             onClick={handleSave}
             className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/20 gap-3 min-w-[200px]"
           >
             {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
               <>
                 Save Template
                 <ChevronRight className="w-4 h-4" />
               </>
             )}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
