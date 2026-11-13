import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Eye, 
  Save, 
  Check, 
  Sparkles, 
  HelpCircle,
  Briefcase,
  Share2,
  Clock,
  MessageSquare,
  CheckCircle2,
  Phone,
  User,
  Loader2
} from "lucide-react";

interface CustomQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormConfig {
  tagline: string;
  welcome_text: string;
  success_message: string;
  fields: {
    work_place: { visible: boolean; required: boolean };
    looking_for: { visible: boolean; required: boolean; options: string[] };
    referral_source: { visible: boolean; required: boolean; options: string[] };
    preferred_call_time: { visible: boolean; required: boolean };
    notes: { visible: boolean; required: boolean };
  };
  custom_questions: CustomQuestion[];
}

const DEFAULT_CONFIG: FormConfig = {
  tagline: "How can we help?",
  welcome_text: "Fill out the form below and start your journey towards peak performance and recovery.",
  success_message: "Thank you! Our clinic representative will reach out to you within 24 hours.",
  fields: {
    work_place: { visible: true, required: true },
    looking_for: { 
      visible: true, 
      required: true, 
      options: [
        "Physiotherapy",
        "Strength & Conditioning",
        "Sports Consultation",
        "Injury Rehabilitation",
        "Performance Training",
        "Diet & Nutrition",
        "Other"
      ] 
    },
    referral_source: { 
      visible: true, 
      required: true, 
      options: [
        "Instagram",
        "Facebook",
        "YouTube",
        "LinkedIn",
        "Google Search",
        "Word of Mouth / Friend",
        "Professional Referral",
        "News / Article",
        "Other"
      ] 
    },
    preferred_call_time: { visible: true, required: false },
    notes: { visible: true, required: false }
  },
  custom_questions: []
};

interface EnquiryFormSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EnquiryFormSettingsModal({
  open,
  onOpenChange,
  onSaved
}: EnquiryFormSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState("");
  const [config, setConfig] = useState<FormConfig>(DEFAULT_CONFIG);

  // New option states for standard dropdowns
  const [newServiceInput, setNewServiceInput] = useState("");
  const [newSourceInput, setNewSourceInput] = useState("");

  // New custom question state
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"text" | "textarea" | "select">("text");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState("");

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ slug?: string; enquiry_form_config?: Record<string, unknown> }>('/organizations/enquiry-config');
      if (data.slug) {
        setSlug(data.slug);
      }
      if (data.enquiry_form_config && typeof data.enquiry_form_config === 'object') {
        const remoteConfig = data.enquiry_form_config as Record<string, unknown>;
        const remoteFields = (remoteConfig.fields || {}) as Record<string, unknown>;
        setConfig({
          ...DEFAULT_CONFIG,
          ...remoteConfig,
          fields: {
            ...DEFAULT_CONFIG.fields,
            ...remoteFields,
            looking_for: {
              ...DEFAULT_CONFIG.fields.looking_for,
              ...((remoteFields.looking_for as Record<string, unknown>) || {})
            },
            referral_source: {
              ...DEFAULT_CONFIG.fields.referral_source,
              ...((remoteFields.referral_source as Record<string, unknown>) || {})
            }
          },
          custom_questions: Array.isArray(remoteConfig.custom_questions) 
            ? (remoteConfig.custom_questions as CustomQuestion[]) 
            : []
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Could not load settings",
        description: err instanceof Error ? err.message : "Failed to load form settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/organizations/enquiry-config', {
        method: 'PATCH',
        data: {
          enquiry_form_config: config,
          slug: slug.trim()
        }
      });

      toast({
        title: "Settings Saved",
        description: "Your enquiry form questions and settings have been updated.",
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddServiceOption = () => {
    if (!newServiceInput.trim()) return;
    const current = config.fields.looking_for.options || [];
    if (!current.includes(newServiceInput.trim())) {
      setConfig({
        ...config,
        fields: {
          ...config.fields,
          looking_for: {
            ...config.fields.looking_for,
            options: [...current, newServiceInput.trim()]
          }
        }
      });
    }
    setNewServiceInput("");
  };

  const handleRemoveServiceOption = (optToRemove: string) => {
    setConfig({
      ...config,
      fields: {
        ...config.fields,
        looking_for: {
          ...config.fields.looking_for,
          options: config.fields.looking_for.options.filter(o => o !== optToRemove)
        }
      }
    });
  };

  const handleAddSourceOption = () => {
    if (!newSourceInput.trim()) return;
    const current = config.fields.referral_source.options || [];
    if (!current.includes(newSourceInput.trim())) {
      setConfig({
        ...config,
        fields: {
          ...config.fields,
          referral_source: {
            ...config.fields.referral_source,
            options: [...current, newSourceInput.trim()]
          }
        }
      });
    }
    setNewSourceInput("");
  };

  const handleRemoveSourceOption = (optToRemove: string) => {
    setConfig({
      ...config,
      fields: {
        ...config.fields,
        referral_source: {
          ...config.fields.referral_source,
          options: config.fields.referral_source.options.filter(o => o !== optToRemove)
        }
      }
    });
  };

  const handleAddCustomQuestion = () => {
    if (!newQuestionLabel.trim()) return;
    
    const parsedOptions = newQuestionType === 'select'
      ? newQuestionOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      options: parsedOptions
    };

    setConfig({
      ...config,
      custom_questions: [...(config.custom_questions || []), newQ]
    });

    setNewQuestionLabel("");
    setNewQuestionType("text");
    setNewQuestionRequired(false);
    setNewQuestionOptions("");
  };

  const handleRemoveCustomQuestion = (qId: string) => {
    setConfig({
      ...config,
      custom_questions: (config.custom_questions || []).filter(q => q.id !== qId)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-slate-900">
                Enquiry Form Settings & Questions Editor
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Customize form copy, toggle fields, configure intake dropdowns, and add custom clinical questions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs uppercase font-bold tracking-widest text-slate-400">Loading Configuration...</p>
          </div>
        ) : (
          <Tabs defaultValue="fields" className="w-full mt-2">
            <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="fields" className="text-xs font-semibold">Standard Fields</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs font-semibold">Custom Questions ({config.custom_questions?.length || 0})</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs font-semibold">Branding & Copy</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs font-semibold">Live Preview</TabsTrigger>
            </TabsList>

            {/* TAB 1: STANDARD FIELDS */}
            <TabsContent value="fields" className="space-y-6 mt-4">
              <div className="space-y-4">
                {/* Workplace field */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" /> Where do you work? (Workplace / Profession)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Captures occupation context for ergonomic and athletic assessment.</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <span>Visible</span>
                      <Switch 
                        checked={config.fields.work_place.visible} 
                        onCheckedChange={(c) => setConfig({
                          ...config,
                          fields: { ...config.fields, work_place: { ...config.fields.work_place, visible: c } }
                        })}
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <span>Mandatory</span>
                      <Switch 
                        checked={config.fields.work_place.required} 
                        disabled={!config.fields.work_place.visible}
                        onCheckedChange={(c) => setConfig({
                          ...config,
                          fields: { ...config.fields, work_place: { ...config.fields.work_place, required: c } }
                        })}
                      />
                    </label>
                  </div>
                </div>

                {/* Looking For (Services) field */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" /> Looking For (Service of Interest)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Dropdown choices of treatments, therapies, or consultations offered.</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                        <span>Visible</span>
                        <Switch 
                          checked={config.fields.looking_for.visible} 
                          onCheckedChange={(c) => setConfig({
                            ...config,
                            fields: { ...config.fields, looking_for: { ...config.fields.looking_for, visible: c } }
                          })}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                        <span>Mandatory</span>
                        <Switch 
                          checked={config.fields.looking_for.required} 
                          disabled={!config.fields.looking_for.visible}
                          onCheckedChange={(c) => setConfig({
                            ...config,
                            fields: { ...config.fields, looking_for: { ...config.fields.looking_for, required: c } }
                          })}
                        />
                      </label>
                    </div>
                  </div>

                  {config.fields.looking_for.visible && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-3">
                      <Label className="text-xs font-semibold text-slate-700">Available Service Options:</Label>
                      <div className="flex flex-wrap gap-2">
                        {(config.fields.looking_for.options || []).map((opt) => (
                          <Badge key={opt} variant="secondary" className="bg-white border text-slate-800 gap-1.5 py-1 px-2.5 text-xs">
                            {opt}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveServiceOption(opt)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              &times;
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Input 
                          placeholder="Add new service option (e.g. Dry Needling)" 
                          className="h-9 bg-white text-xs max-w-sm"
                          value={newServiceInput}
                          onChange={(e) => setNewServiceInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddServiceOption(); } }}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddServiceOption} className="h-9 text-xs gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Referral Source field */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-primary" /> How Did You Hear About Us? (Referral Source)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">Captures marketing channels & physician referral attribution.</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                        <span>Visible</span>
                        <Switch 
                          checked={config.fields.referral_source.visible} 
                          onCheckedChange={(c) => setConfig({
                            ...config,
                            fields: { ...config.fields, referral_source: { ...config.fields.referral_source, visible: c } }
                          })}
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                        <span>Mandatory</span>
                        <Switch 
                          checked={config.fields.referral_source.required} 
                          disabled={!config.fields.referral_source.visible}
                          onCheckedChange={(c) => setConfig({
                            ...config,
                            fields: { ...config.fields, referral_source: { ...config.fields.referral_source, required: c } }
                          })}
                        />
                      </label>
                    </div>
                  </div>

                  {config.fields.referral_source.visible && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-3">
                      <Label className="text-xs font-semibold text-slate-700">Available Source Options:</Label>
                      <div className="flex flex-wrap gap-2">
                        {(config.fields.referral_source.options || []).map((opt) => (
                          <Badge key={opt} variant="secondary" className="bg-white border text-slate-800 gap-1.5 py-1 px-2.5 text-xs">
                            {opt}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveSourceOption(opt)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              &times;
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Input 
                          placeholder="Add new source (e.g. Marathon Expo)" 
                          className="h-9 bg-white text-xs max-w-sm"
                          value={newSourceInput}
                          onChange={(e) => setNewSourceInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSourceOption(); } }}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddSourceOption} className="h-9 text-xs gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preferred Callback Time field */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Preferred Call Time (Morning, Afternoon, Evening)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Allows prospective clients to specify when they are available to talk.</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <span>Visible</span>
                      <Switch 
                        checked={config.fields.preferred_call_time.visible} 
                        onCheckedChange={(c) => setConfig({
                          ...config,
                          fields: { ...config.fields, preferred_call_time: { ...config.fields.preferred_call_time, visible: c } }
                        })}
                      />
                    </label>
                  </div>
                </div>

                {/* Additional Notes field */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" /> Additional Requirement Notes
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Open text area for patients to describe symptoms or specific queries.</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                      <span>Visible</span>
                      <Switch 
                        checked={config.fields.notes.visible} 
                        onCheckedChange={(c) => setConfig({
                          ...config,
                          fields: { ...config.fields, notes: { ...config.fields.notes, visible: c } }
                        })}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: CUSTOM QUESTIONS */}
            <TabsContent value="custom" className="space-y-6 mt-4">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Add New Custom Question
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Question Label / Heading</Label>
                    <Input 
                      placeholder="e.g. Which joint or muscle is causing pain?" 
                      className="bg-white text-xs h-10"
                      value={newQuestionLabel}
                      onChange={(e) => setNewQuestionLabel(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Response Type</Label>
                    <Select value={newQuestionType} onValueChange={(val) => setNewQuestionType(val as "text" | "textarea" | "select")}>
                      <SelectTrigger className="bg-white text-xs h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short Text (One-line)</SelectItem>
                        <SelectItem value="textarea">Paragraph (Multi-line)</SelectItem>
                        <SelectItem value="select">Dropdown Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newQuestionType === 'select' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Dropdown Choices (comma-separated)</Label>
                    <Input 
                      placeholder="e.g. Knee, Shoulder, Lower Back, Neck, Ankle" 
                      className="bg-white text-xs h-10"
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <Switch checked={newQuestionRequired} onCheckedChange={setNewQuestionRequired} />
                    <span>Make this question mandatory</span>
                  </label>

                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleAddCustomQuestion}
                    disabled={!newQuestionLabel.trim()}
                    className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Plus className="w-4 h-4" /> Add Question
                  </Button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Configured Custom Questions</h4>
                {config.custom_questions && config.custom_questions.length > 0 ? (
                  <div className="space-y-2">
                    {config.custom_questions.map((q, idx) => (
                      <div key={q.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>#{idx + 1}</span> {q.label}
                            {q.required && <Badge variant="destructive" className="text-[9px] py-0 px-1.5">Required</Badge>}
                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">{q.type}</Badge>
                          </p>
                          {q.type === 'select' && q.options && (
                            <p className="text-[11px] text-slate-500">
                              Options: {q.options.join(', ')}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCustomQuestion(q.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    No custom questions configured yet. Standard fields will be used.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: BRANDING & COPY */}
            <TabsContent value="branding" className="space-y-5 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Form Headline / Tagline</Label>
                  <Input 
                    value={config.tagline || ""} 
                    onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                    placeholder="e.g. How can we help?"
                    className="h-10 text-xs"
                  />
                  <p className="text-[11px] text-slate-400">Displayed in large colored text above the form card.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Clinic URL Slug (Shortlink)</Label>
                  <Input 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                    placeholder="e.g. ishpo"
                    className="h-10 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">Public URL: {typeof window !== 'undefined' ? window.location.origin : ''}/enquiry/{slug || 'default'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Welcome Description / Instructions</Label>
                <Textarea 
                  value={config.welcome_text || ""} 
                  onChange={(e) => setConfig({ ...config, welcome_text: e.target.value })}
                  placeholder="Fill out the form below and start your journey towards peak performance and recovery."
                  className="min-h-[70px] text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Submission Success Message</Label>
                <Textarea 
                  value={config.success_message || ""} 
                  onChange={(e) => setConfig({ ...config, success_message: e.target.value })}
                  placeholder="Thank you! Our clinic representative will reach out to you within 24 hours."
                  className="min-h-[70px] text-xs"
                />
              </div>
            </TabsContent>

            {/* TAB 4: LIVE PREVIEW */}
            <TabsContent value="preview" className="mt-4">
              <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                  <div className="bg-slate-900 text-white p-6 text-center space-y-1">
                    <h3 className="font-bold text-lg">{config.tagline || "How can we help?"}</h3>
                    <p className="text-xs text-slate-400">{config.welcome_text}</p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Full Name *</Label>
                      <Input placeholder="John Doe" disabled className="h-9 bg-slate-50 text-xs" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Contact Number *</Label>
                      <Input placeholder="+91 9876543210" disabled className="h-9 bg-slate-50 text-xs" />
                    </div>

                    {config.fields.work_place.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Where do you work? {config.fields.work_place.required && '*'}</Label>
                        <Input placeholder="Company / Profession" disabled className="h-9 bg-slate-50 text-xs" />
                      </div>
                    )}

                    {config.fields.looking_for.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Looking For {config.fields.looking_for.required && '*'}</Label>
                        <Select disabled>
                          <SelectTrigger className="h-9 bg-slate-50 text-xs">
                            <SelectValue placeholder="Select service..." />
                          </SelectTrigger>
                        </Select>
                      </div>
                    )}

                    {config.custom_questions?.map(q => (
                      <div key={q.id} className="space-y-1">
                        <Label className="text-xs font-semibold">{q.label} {q.required && '*'}</Label>
                        <Input placeholder="Your answer..." disabled className="h-9 bg-slate-50 text-xs" />
                      </div>
                    ))}

                    <Button disabled className="w-full h-10 font-bold uppercase tracking-wider text-xs bg-primary text-white">
                      Submit Enquiry
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Form Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

