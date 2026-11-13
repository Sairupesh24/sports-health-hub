import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { ShareEnquiryModal } from "@/components/admin/ShareEnquiryModal";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Briefcase, 
  Share2, 
  Clock, 
  ExternalLink,
  MessageSquare, 
  Globe,
  Smartphone,
  Monitor,
  Copy,
  ArrowLeft,
  Loader2,
  FileText,
  HelpCircle
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
        "WhatsApp",
        "Instagram",
        "Facebook",
        "YouTube",
        "LinkedIn",
        "Google Search",
        "Word of Mouth / Friend",
        "Doctor Referral",
        "Professional Referral",
        "Reception Desk",
        "News / Article",
        "Other"
      ] 
    },
    preferred_call_time: { visible: true, required: false },
    notes: { visible: true, required: false }
  },
  custom_questions: []
};

export default function EnquiryFormPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState(profile?.organization_slug || "");
  const [orgName, setOrgName] = useState(profile?.organization_name || "");
  const [orgLogo, setOrgLogo] = useState<string | null>(profile?.organization_logo || null);
  const [config, setConfig] = useState<FormConfig>(DEFAULT_CONFIG);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // New option states for standard dropdowns
  const [newServiceInput, setNewServiceInput] = useState("");
  const [newSourceInput, setNewSourceInput] = useState("");

  // New custom question state
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"text" | "textarea" | "select">("text");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState("");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        name?: string;
        slug?: string;
        logo_url?: string;
        enquiry_form_config?: Record<string, unknown>;
      }>('/organizations/enquiry-config');
      if (data.name) {
        setOrgName(data.name);
      }
      if (data.logo_url) {
        setOrgLogo(data.logo_url);
      }
      if (data.slug) {
        setSlug(data.slug);
      } else if (profile?.organization_slug) {
        setSlug(profile.organization_slug);
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
              ...((remoteFields.referral_source as Record<string, unknown>) || {}),
              options: Array.from(new Set([
                ...DEFAULT_CONFIG.fields.referral_source.options,
                ...(((remoteFields.referral_source as Record<string, unknown>)?.options as string[]) || [])
              ]))
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
  }, [profile?.organization_slug]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveAndPublish = async () => {
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
        title: "Enquiry Form Published!",
        description: "Your updated questions and form settings are now live.",
      });
    } catch (err: unknown) {
      toast({
        title: "Publish Failed",
        description: err instanceof Error ? err.message : "Failed to publish form settings",
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

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/enquiry/${slug || 'default'}`
    : `/enquiry/${slug || 'default'}`;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link Copied",
        description: "Public enquiry form link copied to clipboard.",
      });
    }
  };

  return (
    <DashboardLayout role="crm">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/crm')}
                className="h-8 px-2 text-slate-500 hover:text-slate-900 gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Leads
              </Button>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold uppercase">
                {orgName || profile?.organization_name || "Public Intake Form"}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Enquiry Form Editor</span>
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Customize prospective patient questions, configure clinical service dropdowns, and publish updates to your public form.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="gap-2 text-xs border-slate-200 hover:bg-slate-50 font-semibold"
            >
              <Share2 className="w-4 h-4 text-primary" /> Share & QR Code
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
              className="gap-2 text-xs border-slate-200 hover:bg-slate-50 font-semibold"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" /> View Live Form
            </Button>

            <Button
              onClick={handleSaveAndPublish}
              disabled={saving || loading}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Publish Changes
            </Button>
          </div>
        </div>

        {/* Live Link Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>Public Form URL</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-700">Online & Active</span>
              </div>
              <p className="text-xs font-mono text-emerald-800 truncate mt-0.5 max-w-xl">
                {publicUrl}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCopyLink}
              className="h-8 gap-1.5 text-xs bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-semibold"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
              className="h-8 gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs uppercase font-bold tracking-widest text-slate-400">Loading Form Configuration...</p>
          </div>
        ) : (
          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto grid grid-cols-3 max-w-md">
              <TabsTrigger value="questions" className="text-xs font-semibold">Questions & Fields</TabsTrigger>
              <TabsTrigger value="branding" className="text-xs font-semibold">Branding & Slug</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs font-semibold">Live Preview</TabsTrigger>
            </TabsList>

            {/* TAB 1: QUESTIONS & FIELDS */}
            <TabsContent value="questions" className="space-y-6">
              {/* Section A: Standard Contact & Medical Intake Fields */}
              <Card className="rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Standard Patient Intake Fields
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Control which standard physical therapy details are requested from the patient.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4 divide-y divide-slate-100">
                  {/* Workplace field */}
                  <div className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-500" /> Workplace / Profession
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Captures occupation context for ergonomic and athletic assessment.</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Show on Form</Label>
                        <Switch
                          checked={config.fields.work_place.visible}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            fields: {
                              ...config.fields,
                              work_place: { ...config.fields.work_place, visible: checked }
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Mandatory *</Label>
                        <Switch
                          checked={config.fields.work_place.required}
                          disabled={!config.fields.work_place.visible}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            fields: {
                              ...config.fields,
                              work_place: { ...config.fields.work_place, required: checked }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferred Call Time field */}
                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" /> Preferred Callback Window
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Allows patient to choose Morning, Afternoon, or Evening.</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Show on Form</Label>
                        <Switch
                          checked={config.fields.preferred_call_time.visible}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            fields: {
                              ...config.fields,
                              preferred_call_time: { ...config.fields.preferred_call_time, visible: checked }
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Mandatory *</Label>
                        <Switch
                          checked={config.fields.preferred_call_time.required}
                          disabled={!config.fields.preferred_call_time.visible}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            fields: {
                              ...config.fields,
                              preferred_call_time: { ...config.fields.preferred_call_time, required: checked }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes / Comments field */}
                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-500" /> Specific Concerns & Notes
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Multi-line textarea for pain description or existing physician referrals.</p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Show on Form</Label>
                        <Switch
                          checked={config.fields.notes.visible}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            fields: {
                              ...config.fields,
                              notes: { ...config.fields.notes, visible: checked }
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Mandatory *</Label>
                        <Switch
                          checked={config.fields.notes.required}
                          disabled={!config.fields.notes.visible}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            fields: {
                              ...config.fields,
                              notes: { ...config.fields.notes, required: checked }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section B: Dropdown Options (Services & Marketing Sources) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Looking For / Services List */}
                <Card className="rounded-3xl border border-slate-200/80 shadow-xs">
                  <CardHeader className="py-4 px-6 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      "Looking For" Service Choices
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Options available in the clinical specialty dropdown.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newServiceInput}
                        onChange={(e) => setNewServiceInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddServiceOption())}
                        placeholder="Add new service (e.g. Dry Needling)..."
                        className="h-9 text-xs"
                      />
                      <Button size="sm" onClick={handleAddServiceOption} className="gap-1 text-xs shrink-0 bg-slate-900 text-white">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                      {config.fields.looking_for.options?.map((opt) => (
                        <span 
                          key={opt} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {opt}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveServiceOption(opt)} 
                            className="text-emerald-500 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Referral Sources List */}
                <Card className="rounded-3xl border border-slate-200/80 shadow-xs">
                  <CardHeader className="py-4 px-6 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      "How Did You Hear About Us?" Sources
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Marketing attribution channels displayed on intake.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newSourceInput}
                        onChange={(e) => setNewSourceInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSourceOption())}
                        placeholder="Add channel (e.g. Ortho Clinic)..."
                        className="h-9 text-xs"
                      />
                      <Button size="sm" onClick={handleAddSourceOption} className="gap-1 text-xs shrink-0 bg-slate-900 text-white">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                      {config.fields.referral_source.options?.map((opt) => (
                        <span 
                          key={opt} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          {opt}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSourceOption(opt)} 
                            className="text-blue-500 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Section C: Custom Questions Builder */}
              <Card className="rounded-3xl border border-slate-200/80 shadow-xs">
                <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-600" /> Custom Clinical & Lifestyle Questions
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Add clinic-specific fields such as injury history, physician prescriptions, or activity level.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold w-fit">
                    {config.custom_questions?.length || 0} Custom Field{config.custom_questions?.length === 1 ? '' : 's'}
                  </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Add New Question Card */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" /> Create New Question
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <Label className="text-xs font-semibold">Question Prompt / Title *</Label>
                        <Input
                          value={newQuestionLabel}
                          onChange={(e) => setNewQuestionLabel(e.target.value)}
                          placeholder="e.g. Any previous spine or knee surgeries?"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs font-semibold">Answer Input Type</Label>
                        <Select value={newQuestionType} onValueChange={(val: "text" | "textarea" | "select") => setNewQuestionType(val)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short Answer</SelectItem>
                            <SelectItem value="textarea">Paragraph</SelectItem>
                            <SelectItem value="select">Dropdown Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-3 flex items-end">
                        <div className="flex items-center gap-2 h-9 px-3 bg-white rounded-lg border border-slate-200 w-full justify-between">
                          <Label className="text-xs font-semibold cursor-pointer">Required *</Label>
                          <Switch checked={newQuestionRequired} onCheckedChange={setNewQuestionRequired} />
                        </div>
                      </div>
                    </div>

                    {newQuestionType === 'select' && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Dropdown Options (Comma-Separated) *</Label>
                        <Input
                          value={newQuestionOptions}
                          onChange={(e) => setNewQuestionOptions(e.target.value)}
                          placeholder="e.g. Yes, No, Not sure"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={handleAddCustomQuestion}
                        disabled={!newQuestionLabel.trim()}
                        className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Question to Form
                      </Button>
                    </div>
                  </div>

                  {/* Existing Questions List */}
                  {config.custom_questions && config.custom_questions.length > 0 ? (
                    <div className="space-y-2.5">
                      {config.custom_questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-mono font-bold">
                                {idx + 1}
                              </span>
                              <span>{q.label}</span>
                              {q.required && (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold uppercase px-1.5 py-0">
                                  Required
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px] font-bold uppercase text-slate-500 bg-slate-50">
                                {q.type === 'text' ? 'Short Text' : q.type === 'textarea' ? 'Paragraph' : 'Dropdown'}
                              </Badge>
                            </div>
                            {q.type === 'select' && q.options && (
                              <p className="text-[11px] text-slate-400 pl-7">
                                Choices: {q.options.join(', ')}
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
                    <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      No custom clinical questions configured yet. Standard fields will be used.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: BRANDING & SLUG */}
            <TabsContent value="branding" className="space-y-6">
              <Card className="rounded-3xl border border-slate-200/80 shadow-xs">
                <CardHeader className="py-4 px-6 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Organization Identifier & Public Link
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Defines the dedicated public URL slug where prospective clients access your form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Clinic URL Slug (Shortlink)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 select-none bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                        /enquiry/
                      </span>
                      <Input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="e.g. ishpo"
                        className="h-10 text-xs font-mono max-w-sm"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Full URL: <span className="font-mono text-slate-600">{publicUrl}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200/80 shadow-xs">
                <CardHeader className="py-4 px-6 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Patient Copy & Instructions
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Headline greetings, instructions, and thank you confirmation messages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Form Headline / Tagline</Label>
                    <Input
                      value={config.tagline || ""}
                      onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                      placeholder="e.g. How can we help?"
                      className="h-10 text-xs"
                    />
                    <p className="text-[11px] text-slate-400">Displayed in large colored text above the intake form.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Welcome Description / Instructions</Label>
                    <Textarea
                      value={config.welcome_text || ""}
                      onChange={(e) => setConfig({ ...config, welcome_text: e.target.value })}
                      placeholder="Fill out the form below and start your journey towards peak performance and recovery."
                      className="min-h-[80px] text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Post-Submission Success Message</Label>
                    <Textarea
                      value={config.success_message || ""}
                      onChange={(e) => setConfig({ ...config, success_message: e.target.value })}
                      placeholder="Thank you! Our clinic representative will reach out to you within 24 hours."
                      className="min-h-[80px] text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: LIVE PREVIEW */}
            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-200">
                    Interactive Preview
                  </Badge>
                  <span className="text-xs text-slate-400">Preview changes in real time</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <Button
                    size="sm"
                    variant={previewDevice === "desktop" ? "default" : "ghost"}
                    onClick={() => setPreviewDevice("desktop")}
                    className={cn("h-7 px-2.5 text-xs gap-1", previewDevice === "desktop" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={previewDevice === "mobile" ? "default" : "ghost"}
                    onClick={() => setPreviewDevice("mobile")}
                    className={cn("h-7 px-2.5 text-xs gap-1", previewDevice === "mobile" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500")}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </Button>
                </div>
              </div>

              <div className="p-8 bg-slate-100 rounded-3xl border border-slate-200 flex justify-center">
                <div className={cn(
                  "bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-300 w-full",
                  previewDevice === "mobile" ? "max-w-sm" : "max-w-xl"
                )}>
                  {/* Form Header Mockup */}
                  <div className="bg-slate-900 text-white p-6 sm:p-8 text-center space-y-2">
                    {orgLogo && (
                      <div className="flex justify-center mb-1">
                        <img 
                          src={orgLogo} 
                          alt={orgName || profile?.organization_name || 'Clinic'} 
                          className="h-10 max-w-[160px] object-contain drop-shadow bg-white/10 rounded-lg p-1" 
                        />
                      </div>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      {orgName || profile?.organization_name || "ISHPO Clinic"}
                    </span>
                    <h3 className="font-bold text-xl sm:text-2xl tracking-tight">
                      {config.tagline || "How can we help?"}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {config.welcome_text}
                    </p>
                  </div>

                  {/* Form Fields Mockup */}
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Full Name *</Label>
                      <Input placeholder="John Doe" disabled className="h-9 bg-slate-50 text-xs" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Contact Mobile Number *</Label>
                      <Input placeholder="+91 9876543210" disabled className="h-9 bg-slate-50 text-xs" />
                    </div>

                    {config.fields.work_place.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          Where do you work? {config.fields.work_place.required && '*'}
                        </Label>
                        <Input placeholder="Company / Profession" disabled className="h-9 bg-slate-50 text-xs" />
                      </div>
                    )}

                    {config.fields.looking_for.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          Looking For {config.fields.looking_for.required && '*'}
                        </Label>
                        <Select disabled>
                          <SelectTrigger className="h-9 bg-slate-50 text-xs">
                            <SelectValue placeholder="Select service..." />
                          </SelectTrigger>
                        </Select>
                      </div>
                    )}

                    {config.fields.preferred_call_time.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          Preferred Time to Call {config.fields.preferred_call_time.required && '*'}
                        </Label>
                        <Select disabled>
                          <SelectTrigger className="h-9 bg-slate-50 text-xs">
                            <SelectValue placeholder="Select call window..." />
                          </SelectTrigger>
                        </Select>
                      </div>
                    )}

                    {config.fields.referral_source.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          How did you hear about us? {config.fields.referral_source.required && '*'}
                        </Label>
                        <Select disabled>
                          <SelectTrigger className="h-9 bg-slate-50 text-xs">
                            <SelectValue placeholder="Select referral source..." />
                          </SelectTrigger>
                        </Select>
                      </div>
                    )}

                    {config.custom_questions?.map((q) => (
                      <div key={q.id} className="space-y-1">
                        <Label className="text-xs font-semibold">
                          {q.label} {q.required && '*'}
                        </Label>
                        {q.type === 'textarea' ? (
                          <Textarea placeholder="Your response..." disabled className="min-h-[60px] bg-slate-50 text-xs" />
                        ) : q.type === 'select' ? (
                          <Select disabled>
                            <SelectTrigger className="h-9 bg-slate-50 text-xs">
                              <SelectValue placeholder="Choose an option..." />
                            </SelectTrigger>
                          </Select>
                        ) : (
                          <Input placeholder="Your answer..." disabled className="h-9 bg-slate-50 text-xs" />
                        )}
                      </div>
                    ))}

                    {config.fields.notes.visible && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          Additional Notes / Injury History {config.fields.notes.required && '*'}
                        </Label>
                        <Textarea placeholder="Any specific requirements..." disabled className="min-h-[60px] bg-slate-50 text-xs" />
                      </div>
                    )}

                    <Button disabled className="w-full h-10 font-bold uppercase tracking-wider text-xs bg-emerald-600 text-white mt-2">
                      Submit Enquiry
                    </Button>

                    <p className="text-[10px] text-center text-slate-400">
                      Preview mode. Form submission is disabled in editor.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Share Form Modal Integration */}
        <ShareEnquiryModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          orgSlug={slug || profile?.organization_slug}
          orgName={orgName || profile?.organization_name || "ISHPO Clinic"}
        />
      </div>
    </DashboardLayout>
  );
}

