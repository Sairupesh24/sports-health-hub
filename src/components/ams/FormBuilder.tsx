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
  Save,
  RotateCcw
} from "lucide-react";
import { apiFetch } from "@/utils/api";
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
import { Textarea } from "@/components/ui/textarea";

interface Question {
  id: string;
  type: 'text' | 'mcq' | 'checkbox' | 'range';
  label: string;
  subtitle?: string;
  description?: string;
  subtitlePosition?: 'before' | 'after';
  descriptionPosition?: 'before' | 'after';
  required: boolean;
  options: { text: string; score: number }[];
  minLabel?: string;
  maxLabel?: string;
  scaleLimit?: 5 | 10;
  rangeScoringMode?: 'direct' | 'custom';
}

interface FormBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function FormBuilder({ isOpen, onClose, onSuccess, initialData }: FormBuilderProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  const [formName, setFormName] = useState(initialData?.name || "");
  const [classification, setClassification] = useState<'clinical' | 'performance'>(initialData?.classification || "performance");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isScored, setIsScored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormName(initialData?.name || "");
      setClassification(initialData?.classification || "performance");
      
      const loadedQuestions: Question[] = (initialData?.questions || []).map((q: any) => {
        if (q.type === 'range') {
          const limit = (q.scaleLimit === 5 ? 5 : 10) as 5 | 10;
          const hasCustomScores = q.options?.some((o: any) => {
            const num = parseInt(o.text);
            return !isNaN(num) && o.score !== num && o.score > 0;
          });
          const mode = q.rangeScoringMode || (hasCustomScores ? 'custom' : 'direct');
          
          let opts = q.options;
          if (!opts || opts.length !== limit) {
            opts = Array.from({ length: limit }, (_, i) => {
              const val = i + 1;
              const existing = q.options?.find((o: any) => o.text === String(val));
              return {
                text: String(val),
                score: existing ? existing.score : val
              };
            });
          }
          return {
            ...q,
            scaleLimit: limit,
            rangeScoringMode: mode,
            options: opts
          };
        }
        return q;
      });

      setQuestions(loadedQuestions);
      setIsScored(
        initialData?.questions?.some((q: any) => 
          q.rangeScoringMode === 'direct' || 
          q.rangeScoringMode === 'custom' || 
          q.options?.some((o: any) => o.score > 0)
        ) || false
      );
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
      newQuestion.rangeScoringMode = 'direct';
      newQuestion.options = Array.from({ length: 10 }, (_, i) => ({
        text: String(i + 1),
        score: i + 1
      }));
    }
    
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newId);
    
    // Auto-scroll logic
    setTimeout(() => {
      const element = document.getElementById(`q-${newId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  // Range-specific score handlers
  const updateRangeScore = (qId: string, valueNumber: number, newScore: number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const limit = q.scaleLimit || 10;
        const currentOpts = Array.from({ length: limit }, (_, i) => {
          const val = i + 1;
          const existing = q.options?.find(o => o.text === String(val));
          return {
            text: String(val),
            score: existing ? existing.score : val
          };
        });
        currentOpts[valueNumber - 1] = {
          text: String(valueNumber),
          score: newScore
        };
        return {
          ...q,
          rangeScoringMode: 'custom',
          options: currentOpts
        };
      }
      return q;
    }));
  };

  const setRangeScoringMode = (qId: string, mode: 'direct' | 'custom') => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const limit = q.scaleLimit || 10;
        let newOptions: { text: string; score: number }[] = [];
        if (mode === 'direct') {
          newOptions = Array.from({ length: limit }, (_, i) => ({
            text: String(i + 1),
            score: i + 1
          }));
        } else {
          newOptions = Array.from({ length: limit }, (_, i) => {
            const val = i + 1;
            const existing = q.options?.find(o => o.text === String(val));
            return {
              text: String(val),
              score: existing ? existing.score : val
            };
          });
        }
        return {
          ...q,
          rangeScoringMode: mode,
          options: newOptions
        };
      }
      return q;
    }));
  };

  const applyRangePreset = (qId: string, preset: 'direct' | 'reverse' | 'zero') => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const limit = q.scaleLimit || 10;
        let newOptions: { text: string; score: number }[] = [];
        if (preset === 'direct') {
          newOptions = Array.from({ length: limit }, (_, i) => ({
            text: String(i + 1),
            score: i + 1
          }));
        } else if (preset === 'reverse') {
          newOptions = Array.from({ length: limit }, (_, i) => ({
            text: String(i + 1),
            score: limit - i
          }));
        } else if (preset === 'zero') {
          newOptions = Array.from({ length: limit }, (_, i) => ({
            text: String(i + 1),
            score: 0
          }));
        }
        return {
          ...q,
          rangeScoringMode: 'custom',
          options: newOptions
        };
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
      if (!user) throw new Error("Not authenticated");

      // Normalize range questions to ensure options and scores are synced
      const normalizedQuestions = questions.map(q => {
        if (q.type === 'range') {
          const limit = q.scaleLimit || 10;
          const mode = q.rangeScoringMode || 'direct';
          let opts = q.options;
          if (mode === 'direct' || !opts || opts.length !== limit) {
            if (mode === 'direct') {
              opts = Array.from({ length: limit }, (_, i) => ({
                text: String(i + 1),
                score: isScored ? (i + 1) : 0
              }));
            } else {
              opts = Array.from({ length: limit }, (_, i) => {
                const val = i + 1;
                const existing = opts?.find(o => o.text === String(val));
                return {
                  text: String(val),
                  score: existing ? existing.score : (isScored ? val : 0)
                };
              });
            }
          } else if (!isScored) {
            opts = opts.map(o => ({ ...o, score: 0 }));
          }
          return {
            ...q,
            rangeScoringMode: mode,
            options: opts
          };
        } else if (!isScored) {
          return {
            ...q,
            options: q.options?.map(o => ({ ...o, score: 0 })) || []
          };
        }
        return q;
      });

      const formPayload = {
        name: formName,
        classification: classification,
        questions: normalizedQuestions
      };

      if (initialData?.id) {
        await apiFetch(`/ams/questionnaires/${initialData.id}`, {
          method: 'PATCH',
          body: formPayload
        });
      } else {
        const savedData = await apiFetch<any>('/ams/questionnaires', {
          method: 'POST',
          body: formPayload
        });
        setSavedFormId(savedData.id);
      }

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
      <DialogContent 
        aria-describedby={undefined} 
        className="bg-[#F1F5F9] border-none text-slate-900 rounded-none md:rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.15)] p-0 w-full max-w-full md:w-[95vw] md:max-w-6xl 2xl:max-w-7xl ring-1 ring-slate-200/50 h-full md:h-[90vh] md:max-h-[94vh] flex flex-col"
      >
        {/* Compact Dynamic Header */}
        <DialogHeader className="px-4 md:px-6 py-2.5 md:py-3 bg-white border-b border-slate-200/80 flex-shrink-0 z-20">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Save className="w-3.5 h-3.5" />
              </div>
              <DialogTitle className="text-base md:text-lg font-black uppercase tracking-tight italic text-slate-900">
                {initialData?.id ? 'Edit' : 'Create'} <span className="text-primary bg-primary/5 px-2 py-0.5 rounded-md">Questionnaire</span>
              </DialogTitle>
            </div>
             
            <div className="flex items-center gap-2.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80">
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Scoring</p>
                <p className="text-[7px] font-bold text-primary uppercase italic">Auto-Calc</p>
              </div>
              <Switch 
                checked={isScored} 
                onCheckedChange={(checked) => {
                  setIsScored(checked);
                  if (checked) {
                    setQuestions(prev => prev.map(q => {
                      if (q.type === 'range' && (!q.options || q.options.length === 0)) {
                        const limit = q.scaleLimit || 10;
                        return {
                          ...q,
                          rangeScoringMode: q.rangeScoringMode || 'direct',
                          options: Array.from({ length: limit }, (_, i) => ({ text: String(i + 1), score: i + 1 }))
                        };
                      }
                      return q;
                    }));
                  }
                }} 
                className="data-[state=checked]:bg-primary scale-75" 
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <Input 
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Form title / questionnaire name..."
              className="h-9 bg-slate-50/80 hover:bg-white focus:bg-white border-slate-200 rounded-xl font-bold text-xs md:text-sm placeholder:text-slate-300 focus-visible:ring-primary/20 border text-slate-900 transition-all flex-1"
            />

            <Tabs 
              value={classification} 
              onValueChange={(val) => setClassification(val as any)}
              className="shrink-0"
            >
              <TabsList className="grid w-full sm:w-56 grid-cols-2 bg-slate-100 h-9 rounded-xl p-0.5">
                <TabsTrigger value="performance" className="rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-xs">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="clinical" className="rounded-lg font-black uppercase text-[8px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-rose-500 shadow-xs">
                  Clinical
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* Builder Workspace Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
          
          {/* Compact Component Palette Sidebar */}
          {!isMobile && (
            <div className="w-52 lg:w-60 bg-white/60 backdrop-blur-md border-r border-slate-200/80 flex flex-col p-3 lg:p-4 space-y-3 overflow-y-auto shrink-0">
              <div className="space-y-0.5">
                <h4 className="text-[9px] font-black uppercase tracking-[0.18em] text-primary italic">Question Palette</h4>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Click to add question</p>
              </div>

              <div className="space-y-2">
                {[
                  { type: 'text', label: 'Text Response', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { type: 'mcq', label: 'Single Choice', icon: ListOrdered, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                  { type: 'checkbox', label: 'Multi Select', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { type: 'range', label: 'Rating Scale', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => addQuestion(btn.type as any)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-primary/60 hover:shadow-md transition-all group active:scale-95 text-left"
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0", btn.bg, btn.color)}>
                      <btn.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-black uppercase text-[9px] tracking-wider text-slate-600 group-hover:text-slate-900">{btn.label}</span>
                    <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity" />
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-3">
                <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Builder Tip</span>
                  </div>
                  <p className="text-[8.5px] leading-relaxed text-white/60 font-medium italic">
                    Rating scales support 1-5 or 1-10 limits with direct (1:1) or custom scoring.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Question Canvas */}
          <div className="flex-1 overflow-y-auto bg-slate-100/50 p-3 md:p-5 lg:p-6 custom-scrollbar space-y-3.5 md:space-y-4" id="builder-canvas">
            <div className="max-w-4xl mx-auto space-y-3.5 md:space-y-4 pb-16">
              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 bg-white/60 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3">
                    <Plus className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="font-black uppercase text-[9px] tracking-[0.2em] italic text-slate-400">Add a question from the palette to start building</p>
                </div>
              ) : (
                questions.map((q, index) => (
                  <Card 
                    key={q.id} 
                    id={`q-${q.id}`}
                    onFocus={() => setActiveQuestionId(q.id)}
                    className={cn(
                      "border border-slate-200/90 shadow-xs rounded-2xl overflow-hidden relative transition-all duration-200",
                      activeQuestionId === q.id 
                        ? "bg-white ring-2 ring-primary/20 border-primary/50 shadow-md" 
                        : "bg-white hover:border-slate-300"
                    )}
                  >
                    <CardContent className="p-3.5 md:p-4 lg:p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-slate-900 text-white border-none rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter">Q{index + 1}</Badge>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">
                              <Zap className="w-2.5 h-2.5" />
                              <span className="text-[7.5px] font-black uppercase tracking-widest italic">
                                {q.type === 'range' ? 'Scale' : q.type === 'mcq' ? 'Single Choice' : q.type === 'checkbox' ? 'Multi Select' : 'Text'}
                              </span>
                            </div>
                            {isScored && q.type === 'range' && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 rounded-md px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider">
                                {q.rangeScoringMode === 'custom' ? 'Custom Points' : '1:1 Value Score'}
                              </Badge>
                            )}
                          </div>

                          {/* Sub-Title when positioned BEFORE */}
                          {q.subtitle !== undefined && (q.subtitlePosition || 'before') === 'before' && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 animate-in fade-in duration-200">
                              <span className="text-[7.5px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                Sub-Title
                              </span>
                              <div className="flex items-center bg-white rounded border border-slate-200 p-0.5 text-[7.5px] shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { subtitlePosition: 'before' })}
                                  className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-primary text-white"
                                  title="Positioned before question"
                                >
                                  Before
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { subtitlePosition: 'after' })}
                                  className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                  title="Move after question"
                                >
                                  After
                                </button>
                              </div>
                              <Input 
                                value={q.subtitle}
                                onChange={(e) => updateQuestion(q.id, { subtitle: e.target.value })}
                                placeholder="Enter question sub-title (e.g., Lower Extremity / Cardio Check)..."
                                className="h-7 bg-white border-slate-200 rounded-md text-xs font-semibold px-2 flex-1 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                              />
                              <button 
                                type="button" 
                                onClick={() => updateQuestion(q.id, { subtitle: undefined })}
                                className="text-slate-400 hover:text-rose-500 p-1 transition-colors shrink-0"
                                title="Remove Sub-Title"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Description when positioned BEFORE */}
                          {q.description !== undefined && q.descriptionPosition === 'before' && (
                            <div className="flex items-start gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 animate-in fade-in duration-200">
                              <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded text-center">
                                  Description
                                </span>
                                <div className="flex items-center bg-white rounded border border-slate-200 p-0.5 text-[7.5px]">
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(q.id, { descriptionPosition: 'before' })}
                                    className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-primary text-white"
                                    title="Positioned before question"
                                  >
                                    Before
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(q.id, { descriptionPosition: 'after' })}
                                    className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                    title="Move after question"
                                  >
                                    After
                                  </button>
                                </div>
                              </div>
                              <Textarea 
                                value={q.description}
                                onChange={(e) => updateQuestion(q.id, { description: e.target.value })}
                                placeholder="Enter detailed question description or helper instructions..."
                                className="min-h-[44px] h-[44px] bg-white border-slate-200 rounded-md text-xs font-medium p-1.5 flex-1 resize-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                              />
                              <button 
                                type="button" 
                                onClick={() => updateQuestion(q.id, { description: undefined })}
                                className="text-slate-400 hover:text-rose-500 p-1 transition-colors shrink-0 mt-0.5"
                                title="Remove Description"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Main Question Title / Prompt */}
                          <Input 
                            value={q.label}
                            onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                            placeholder="Type question prompt here..."
                            className="border-none bg-transparent h-8 md:h-9 px-0 text-base md:text-lg font-bold italic placeholder:text-slate-300 focus-visible:ring-0 shadow-none text-slate-900 leading-snug"
                          />

                          {/* Sub-Title when positioned AFTER */}
                          {q.subtitle !== undefined && q.subtitlePosition === 'after' && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 animate-in fade-in duration-200">
                              <span className="text-[7.5px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                Sub-Title
                              </span>
                              <div className="flex items-center bg-white rounded border border-slate-200 p-0.5 text-[7.5px] shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { subtitlePosition: 'before' })}
                                  className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                  title="Move before question"
                                >
                                  Before
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { subtitlePosition: 'after' })}
                                  className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-primary text-white"
                                  title="Positioned after question"
                                >
                                  After
                                </button>
                              </div>
                              <Input 
                                value={q.subtitle}
                                onChange={(e) => updateQuestion(q.id, { subtitle: e.target.value })}
                                placeholder="Enter question sub-title (e.g., Lower Extremity / Cardio Check)..."
                                className="h-7 bg-white border-slate-200 rounded-md text-xs font-semibold px-2 flex-1 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                              />
                              <button 
                                type="button" 
                                onClick={() => updateQuestion(q.id, { subtitle: undefined })}
                                className="text-slate-400 hover:text-rose-500 p-1 transition-colors shrink-0"
                                title="Remove Sub-Title"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Description when positioned AFTER */}
                          {q.description !== undefined && (q.descriptionPosition || 'after') === 'after' && (
                            <div className="flex items-start gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 animate-in fade-in duration-200">
                              <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded text-center">
                                  Description
                                </span>
                                <div className="flex items-center bg-white rounded border border-slate-200 p-0.5 text-[7.5px]">
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(q.id, { descriptionPosition: 'before' })}
                                    className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-slate-500 hover:text-slate-900"
                                    title="Move before question"
                                  >
                                    Before
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(q.id, { descriptionPosition: 'after' })}
                                    className="px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-primary text-white"
                                    title="Positioned after question"
                                  >
                                    After
                                  </button>
                                </div>
                              </div>
                              <Textarea 
                                value={q.description}
                                onChange={(e) => updateQuestion(q.id, { description: e.target.value })}
                                placeholder="Enter detailed question description or helper instructions..."
                                className="min-h-[44px] h-[44px] bg-white border-slate-200 rounded-md text-xs font-medium p-1.5 flex-1 resize-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                              />
                              <button 
                                type="button" 
                                onClick={() => updateQuestion(q.id, { description: undefined })}
                                className="text-slate-400 hover:text-rose-500 p-1 transition-colors shrink-0 mt-0.5"
                                title="Remove Description"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Action Buttons: Add Sub-Title and Add Description available after each question */}
                          {(q.subtitle === undefined || q.description === undefined) && (
                            <div className="flex items-center gap-2 pt-0.5">
                              {q.subtitle === undefined && (
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { subtitle: "", subtitlePosition: 'before' })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 hover:border-primary/60 text-slate-600 hover:text-primary text-[8.5px] font-black uppercase tracking-wider bg-slate-50/70 hover:bg-primary/5 transition-all shadow-2xs active:scale-95"
                                >
                                  <Plus className="w-3 h-3 text-primary" />
                                  Add Sub-Title
                                </button>
                              )}
                              {q.description === undefined && (
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { description: "", descriptionPosition: 'after' })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 hover:border-primary/60 text-slate-600 hover:text-primary text-[8.5px] font-black uppercase tracking-wider bg-slate-50/70 hover:bg-primary/5 transition-all shadow-2xs active:scale-95"
                                >
                                  <Plus className="w-3 h-3 text-primary" />
                                  Add Description
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeQuestion(q.id)}
                          className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Options Editor for MCQ/Checkbox */}
                      {(q.type === 'mcq' || q.type === 'checkbox') && (
                        <div className="space-y-2 pl-3 md:pl-4 border-l-2 border-slate-100 mt-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Define Response Options</p>
                          {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2 group/opt">
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                                {oIndex + 1}
                              </div>
                              <Input 
                                value={opt.text}
                                onChange={(e) => updateOption(q.id, oIndex, { text: e.target.value })}
                                placeholder={`Option ${oIndex + 1} text...`}
                                className="h-9 bg-slate-50/80 border-slate-200 rounded-xl font-semibold text-xs focus:bg-white transition-all flex-1"
                              />
                              {isScored && (
                                <div className="flex items-center gap-1.5 px-2 bg-primary/5 rounded-lg border border-primary/15 h-9 shrink-0">
                                  <Star className="w-3 h-3 text-primary" />
                                  <span className="text-[8px] font-black uppercase text-slate-400">Pts:</span>
                                  <Input 
                                    type="number"
                                    value={opt.score}
                                    onChange={(e) => updateOption(q.id, oIndex, { score: parseInt(e.target.value) || 0 })}
                                    className="w-10 h-7 bg-transparent border-none font-bold text-xs text-primary focus-visible:ring-0 text-center p-0"
                                  />
                                </div>
                              )}
                              <button 
                                type="button"
                                onClick={() => removeOption(q.id, oIndex)}
                                className="opacity-0 group-hover/opt:opacity-100 transition-opacity text-slate-300 hover:text-rose-500 p-1.5 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <Button 
                            variant="ghost" 
                            onClick={() => addOption(q.id)}
                            className="h-8 rounded-lg border border-dashed border-slate-200 text-[9px] font-black uppercase text-primary tracking-widest hover:bg-primary/5 hover:border-primary/20 mt-1 gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Option
                          </Button>
                        </div>
                      )}

                      {/* Compact & Structured Rating Scale Editor */}
                      {q.type === 'range' && (
                        <div className="bg-slate-50/70 p-3 md:p-4 rounded-xl border border-slate-200/80 mt-2.5 space-y-3">
                          {/* Control Bar: Scale Limit & Scoring Mode */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500">Scale Limit:</span>
                              <Select 
                                value={q.scaleLimit?.toString() || "10"} 
                                onValueChange={(val) => {
                                  const newLimit = parseInt(val) as 5 | 10;
                                  const currentMode = q.rangeScoringMode || 'direct';
                                  let newOpts: { text: string; score: number }[] = [];
                                  if (currentMode === 'direct') {
                                    newOpts = Array.from({ length: newLimit }, (_, i) => ({ text: String(i + 1), score: i + 1 }));
                                  } else {
                                    newOpts = Array.from({ length: newLimit }, (_, i) => {
                                      const valNum = i + 1;
                                      const existing = q.options?.find(o => o.text === String(valNum));
                                      return { text: String(valNum), score: existing ? existing.score : valNum };
                                    });
                                  }
                                  updateQuestion(q.id, { scaleLimit: newLimit, options: newOpts });
                                }}
                              >
                                <SelectTrigger className="w-20 h-7 rounded-lg bg-white border-slate-200 font-bold text-[9px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl p-1">
                                  <SelectItem value="5" className="rounded-lg text-[9px] font-bold">1 - 5</SelectItem>
                                  <SelectItem value="10" className="rounded-lg text-[9px] font-bold">1 - 10</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Scoring Configuration for Rating Scale */}
                            {isScored ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500">Scoring:</span>
                                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => setRangeScoringMode(q.id, 'direct')}
                                    className={cn(
                                      "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                                      (q.rangeScoringMode || 'direct') === 'direct'
                                        ? "bg-primary text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-900"
                                    )}
                                    title="Selected rating number directly awards points (e.g. 7 = 7 pts)"
                                  >
                                    <Star className="w-2.5 h-2.5" />
                                    1:1 Rated Value
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRangeScoringMode(q.id, 'custom')}
                                    className={cn(
                                      "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                                      q.rangeScoringMode === 'custom'
                                        ? "bg-primary text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-900"
                                    )}
                                    title="Assign specific point values to each rating number"
                                  >
                                    <Settings className="w-2.5 h-2.5" />
                                    Custom Scores
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[8.5px] font-medium text-slate-400 italic">
                                Scoring disabled (Turn on in header to assign points)
                              </span>
                            )}
                          </div>

                          {/* Context Labels: Inline Left and Right */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 shrink-0">Min Label:</span>
                              <input 
                                value={q.minLabel || ""}
                                onChange={(e) => updateQuestion(q.id, { minLabel: e.target.value })}
                                placeholder="e.g., Low / None / Very Easy"
                                className="w-full text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none p-0"
                              />
                            </div>
                            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 shrink-0">Max Label:</span>
                              <input 
                                value={q.maxLabel || ""}
                                onChange={(e) => updateQuestion(q.id, { maxLabel: e.target.value })}
                                placeholder="e.g., High / Extreme / Max Effort"
                                className="w-full text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none p-0"
                              />
                            </div>
                          </div>
                          
                          {/* Scale Values & Points Layout */}
                          <div className="pt-2 border-t border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between text-[8.5px] font-black uppercase text-slate-400 px-1">
                              <span className="truncate max-w-[130px]">{q.minLabel || 'START'}</span>
                              
                              {isScored && q.rangeScoringMode === 'custom' && (
                                <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                  <span className="text-[7.5px] text-slate-400 font-bold">Presets:</span>
                                  <button
                                    type="button"
                                    onClick={() => applyRangePreset(q.id, 'direct')}
                                    className="text-[7.5px] font-black uppercase tracking-wider text-primary hover:underline"
                                  >
                                    1:1
                                  </button>
                                  <span className="text-slate-200">•</span>
                                  <button
                                    type="button"
                                    onClick={() => applyRangePreset(q.id, 'reverse')}
                                    className="text-[7.5px] font-black uppercase tracking-wider text-primary hover:underline"
                                  >
                                    Reverse
                                  </button>
                                  <span className="text-slate-200">•</span>
                                  <button
                                    type="button"
                                    onClick={() => applyRangePreset(q.id, 'zero')}
                                    className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 hover:underline"
                                  >
                                    All 0
                                  </button>
                                </div>
                              )}

                              <span className="truncate max-w-[130px]">{q.maxLabel || 'END'}</span>
                            </div>

                            {/* Responsive Rating Grid */}
                            <div 
                              className="grid gap-1.5" 
                              style={{ gridTemplateColumns: `repeat(${q.scaleLimit || 10}, minmax(0, 1fr))` }}
                            >
                              {Array.from({ length: q.scaleLimit || 10 }).map((_, i) => {
                                const val = i + 1;
                                const opt = q.options?.find(o => o.text === String(val));
                                const score = opt ? opt.score : val;

                                return (
                                  <div 
                                    key={val} 
                                    className={cn(
                                      "flex flex-col items-center gap-1 p-1 rounded-lg border transition-all",
                                      isScored && q.rangeScoringMode === 'custom' 
                                        ? "bg-white border-primary/20 shadow-xs" 
                                        : "bg-white border-slate-200/80"
                                    )}
                                  >
                                    {/* Number pill */}
                                    <div className="w-full h-7 rounded-md bg-slate-100 flex items-center justify-center text-[10px] md:text-[11px] font-black text-slate-700">
                                      {val}
                                    </div>

                                    {/* Score display or input */}
                                    {isScored && (
                                      q.rangeScoringMode === 'custom' ? (
                                        <div className="w-full">
                                          <input 
                                            type="number"
                                            value={score}
                                            onChange={(e) => updateRangeScore(q.id, val, parseInt(e.target.value) || 0)}
                                            className="w-full h-6 text-[9.5px] font-black text-center text-primary bg-primary/5 rounded border border-primary/30 focus:border-primary focus:outline-none p-0"
                                            title={`Points assigned for score value ${val}`}
                                          />
                                        </div>
                                      ) : (
                                        <div className="text-[7.5px] font-black text-primary/80 uppercase tracking-tighter">
                                          {val} pt
                                        </div>
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {isScored && (
                              <p className="text-[8.5px] text-slate-400 font-medium italic pt-0.5">
                                {q.rangeScoringMode === 'custom' 
                                  ? "Custom score assigned: Type the exact point value awarded for each rating value." 
                                  : "Direct score (1:1): The rating number selected will automatically be used as the score."}
                              </p>
                            )}
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
              <div className="fixed bottom-20 right-4 z-50">
                <Select onValueChange={(value) => addQuestion(value as any)}>
                  <SelectTrigger className="w-12 h-12 rounded-full bg-primary text-white shadow-xl border-none flex items-center justify-center ring-offset-primary hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-1.5 mb-2 mr-2">
                    <SelectItem value="text" className="rounded-xl font-bold uppercase text-[9px] tracking-wider py-3 cursor-pointer">Text Response</SelectItem>
                    <SelectItem value="mcq" className="rounded-xl font-bold uppercase text-[9px] tracking-wider py-3 cursor-pointer">Single Choice</SelectItem>
                    <SelectItem value="checkbox" className="rounded-xl font-bold uppercase text-[9px] tracking-wider py-3 cursor-pointer">Multi Select</SelectItem>
                    <SelectItem value="range" className="rounded-xl font-bold uppercase text-[9px] tracking-wider py-3 cursor-pointer">Rating Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Post-Save Success Overlay */}
          {showSuccessActions && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">Template <span className="text-emerald-500">Secured</span></h2>
              <p className="text-slate-500 font-medium text-xs italic max-w-md mb-8">The questionnaire has been saved to your library. What would you like to do next?</p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button 
                  className="flex-1 h-12 rounded-xl bg-primary text-white font-black uppercase tracking-wider text-[10px] gap-2 shadow-lg shadow-primary/20"
                  onClick={() => {
                    onClose();
                    window.location.href = isMobile ? `/mobile/specialist/assign/${savedFormId}` : `/ams/assignments?new=${savedFormId}`;
                  }}
                >
                  <Plus className="w-4 h-4" /> Bulk Assign to Squad
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl border-slate-200 font-black uppercase tracking-wider text-[10px] text-slate-600"
                  onClick={onClose}
                >
                  Done for now
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Compact Modern Footer */}
        <DialogFooter className="py-2.5 px-4 md:px-6 bg-white border-t border-slate-200/80 flex-shrink-0 gap-2.5 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-3 text-slate-400">
            {profile?.organizations?.logo_url ? (
              <img src={profile.organizations.logo_url} alt="Org" className="h-5 w-auto grayscale opacity-50" />
            ) : (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary/40" />
                <span className="text-[8.5px] font-black uppercase tracking-widest italic">{profile?.organizations?.official_name || 'ISHPO HUB'}</span>
              </div>
            )}
            <div className="h-3 w-px bg-slate-200 hidden md:block" />
            <div className="hidden md:flex flex-col">
              <span className="text-[6.5px] font-black uppercase tracking-widest text-slate-300">Logged Specialist</span>
              <span className="text-[8.5px] font-bold text-slate-500 italic">{profile?.full_name}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="h-9 flex-1 md:flex-none px-4 rounded-xl font-black uppercase text-[8.5px] tracking-wider text-slate-400 hover:bg-slate-50"
            >
              Discard
            </Button>
            
            <Button 
              disabled={saving || showSuccessActions}
              onClick={handleSave}
              className="h-9 flex-1 md:flex-none px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[8.5px] tracking-wider shadow-lg shadow-primary/20 gap-1.5 min-w-[130px]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <>
                  Deploy Template
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
