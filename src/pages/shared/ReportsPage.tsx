import { useState, useEffect } from "react";
// v1.0.1 - Final Clinical Reporting Engine Refresh
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    BarChart3, 
    Activity,
    Trash2,
    Download,
    Cloud,
    FolderOpen,
    ShieldCheck,
    Check,
    Users,
    FilePlus,
    MonitorPlay,
    Printer,
    Clipboard,
    RefreshCw,
    Search,
    SearchX,
    FileSearch,
    FileUp,
    CheckCircle2,
    CalendarDays,
    Dna,
    Star
} from "lucide-react";
import { 
    PRESET_TEMPLATES, 
    fetchTemplate, 
    convertToHTML, 
    extractInputs, 
    TemplateMetadata
} from "@/lib/reporting/templateService";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { VIPName } from "@/components/ui/VIPBadge";

interface ReportsPageProps {
  role: "admin" | "consultant" | "sports_scientist" | "client";
}

export default function ReportsPage({ role }: ReportsPageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("");
  const [isFetchingAthletes, setIsFetchingAthletes] = useState(false);

  // Template-Based Reporting State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateHtml, setTemplateHtml] = useState<string>("");
  const [templateBuffer, setTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [profession, setProfession] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [customTemplates, setCustomTemplates] = useState<TemplateMetadata[]>([]);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('profession')
          .eq('id', user.id)
          .single();
        if (data) setProfession(data.profession);
      }
      fetchTemplates();
      fetchAthletes();
    };
    initPage();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped: TemplateMetadata[] = (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        url: t.file_path,
        isCloud: true
      }));
      
      setCustomTemplates(mapped);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
    }
  };

  const fetchAthletes = async () => {
    try {
      setIsFetchingAthletes(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, uhid')
        .not('ams_role', 'is', null)
        .neq('ams_role', 'coach')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setAthletes(data || []);
    } catch (err: any) {
      toast({ title: "Error fetching athletes", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingAthletes(false);
    }
  };

  const loadTemplate = async (template: TemplateMetadata) => {
    setIsTemplateLoading(true);
    try {
      let buffer: ArrayBuffer;
      
      if (template.isCloud) {
          const { data, error } = await supabase.storage
            .from('report-templates')
            .download(template.url);
          if (error) throw error;
          buffer = await data.arrayBuffer();
      } else {
          buffer = await fetchTemplate(template.url);
      }

      const html = await convertToHTML(buffer);
      const interactiveHtml = extractInputs(html);
      
      setTemplateBuffer(buffer);
      setTemplateHtml(interactiveHtml);
      setFormValues({});
      setPendingFile(null); // Clear pending file since we're loading a saved template
      
      toast({
        title: "Template Ready",
        description: `Successfully loaded ${template.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Load Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTemplateLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
        setTemplateHtml("");
        setTemplateBuffer(null);
        return;
    }

    const template = [...PRESET_TEMPLATES, ...customTemplates].find(t => t.id === templateId);
    if (template) loadTemplate(template);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsTemplateLoading(true);
    try {
      // 1. Read Document Locally first for Instant Preview
      const buffer = await file.arrayBuffer();
      const html = await convertToHTML(buffer);
      const interactiveHtml = extractInputs(html);

      // 2. Set Active Workspace to the Uploaded File
      setTemplateBuffer(buffer);
      setTemplateHtml(interactiveHtml);
      setFormValues({});
      setPendingFile(file);
      setSelectedTemplateId("__pending"); // Mark as pending in UI

      toast({ 
        title: "Working Preview Ready", 
        description: "You can edit this now or click 'Save to Library' to persist it." 
      });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsTemplateLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSaveToLibrary = async () => {
    if (!pendingFile) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.organization_id) throw new Error("Organization context missing");

      // 1. Upload Doc to Storage
      const fileExt = pendingFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.organization_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-templates')
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

      // 2. Record Metadata In Database
      const { error: dbError } = await supabase
        .from('report_templates')
        .insert({
          name: pendingFile.name.replace(/\.[^/.]+$/, ""),
          file_path: filePath,
          organization_id: profile.organization_id,
          created_by: user.id
        });

      if (dbError) throw dbError;

      toast({ title: "Template Saved to Cloud" });
      setPendingFile(null);
      fetchTemplates();
    } catch (error: any) {
      toast({ 
        title: "Save Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: TemplateMetadata) => {
    try {
      setIsDeleting(template.id);
      
      // Delete from Storage
      await supabase.storage.from('report-templates').remove([template.url]);
      
      // Delete from DB
      const { error } = await supabase.from('report_templates').delete().eq('id', template.id);
      if (error) throw error;
      
      toast({ title: "Template Removed" });
      if (selectedTemplateId === template.id) {
        setSelectedTemplateId("");
        setTemplateHtml("");
      }
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadOriginal = async (template: TemplateMetadata) => {
    try {
      const { data, error } = await supabase.storage
        .from('report-templates')
        .download(template.url);
      
      if (error) throw error;
      
      const blobUrl = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${template.name}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      toast({ title: "Download Failed", variant: "destructive" });
    }
  };

  const handleFormChange = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.tagName === 'INPUT') {
        const tag = target.getAttribute('data-tag');
        const index = Array.from(e.currentTarget.querySelectorAll('input')).indexOf(target);
        const key = tag || `field_${index}`;
        
        setFormValues(prev => ({
            ...prev,
            [key]: target.value
        }));
    }
  };

  const handleExportPDF = async () => {
    if (!templateHtml) return;
    
    setIsGenerating(true);
    try {
        const element = document.getElementById('report-capture-area') as HTMLElement;
        if (!element) throw new Error("Report area not found");

        const inputs = Array.from(element.querySelectorAll('input'));
        const originalStates: { parent: Node, input: HTMLInputElement }[] = [];

        inputs.forEach(input => {
            const val = input.value;
            const parent = input.parentNode;
            if (parent) {
                originalStates.push({ parent, input });
                const span = document.createElement('span');
                span.textContent = val || "________";
                span.className = 'pdf-capture-value';
                span.style.fontWeight = '400';
                span.style.color = '#1e293b';
                parent.replaceChild(span, input);
            }
        });

        window.print();

        originalStates.forEach(({ parent, input }) => {
            const currentSpan = Array.from(parent.childNodes).find(n => (n as HTMLElement).className === 'pdf-capture-value');
            if (currentSpan) {
              parent.replaceChild(input, currentSpan);
            }
        });
        
        setIsGenerating(false);
        toast({ title: "Print Preview Ready" });
    } catch (error: any) {
        toast({ title: "Export Failed", description: error.message, variant: "destructive" });
        setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout role={role}>
      <>
        <div className="space-y-6 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                {role === "consultant" ? "Clinical Reporting Engine" : "Reporting Engine"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {role === "consultant" 
                  ? "Comprehensive clinical analysis and patient progress tracking" 
                  : "Generate modular reports across all system modules"}
              </p>
            </div>
            <div className="flex gap-2 invisible">
              {/* Removed Favorites and History as requested */}
            </div>
          </div>

          <Card className="gradient-card border-none shadow-premium overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center">
                <div className="p-6 md:col-span-3 flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="space-y-2 w-full md:w-80">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40">Active Reporting Template</label>
                      <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="bg-white/10 border-white/5 backdrop-blur-md h-12 text-white">
                          <SelectValue placeholder="No template uploaded..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pendingFile && (
                            <>
                              <SelectItem value="__pending" className="font-bold text-amber-500">
                                {pendingFile.name.replace(/\.[^/.]+$/, "")} (Current Preview)
                              </SelectItem>
                              <div className="h-px bg-white/10 my-1" />
                            </>
                          )}
                          {customTemplates.length > 0 ? (
                              <>
                                  <SelectItem value="_custom" disabled className="text-[10px] font-bold opacity-50 uppercase">Cloud Library</SelectItem>
                                  {customTemplates.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                  ))}
                              </>
                          ) : (
                              <SelectItem value="none" disabled className="text-[10px] font-bold opacity-50 uppercase italic">Organization Library Empty</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-auto self-end">
                      <Button 
                          variant="secondary" 
                          size="lg" 
                          className="gap-2 h-12 font-black uppercase tracking-tighter text-[10px] bg-white/5 hover:bg-white/20 border-white/10"
                          onClick={() => {
                            const input = document.getElementById('template-upload');
                            if (input) input.click();
                          }}
                      >
                          <FilePlus className="w-4 h-4" />
                          New Upload
                      </Button>
                      {profession === 'Sports Physician' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 text-[8px] uppercase tracking-widest text-primary/60 hover:text-primary gap-1"
                          onClick={() => setIsLibraryModalOpen(true)}
                        >
                          <FolderOpen className="w-3 h-3" />
                          Manage Library
                        </Button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      id="template-upload" 
                      className="hidden" 
                      accept=".docx,.dotx"
                      onChange={handleFileUpload}
                    />
                </div>
                
                <div className="bg-primary p-6 h-full flex flex-col justify-center gap-3">
                  <Button 
                    className="w-full gap-2 h-12 bg-white text-primary hover:bg-white/90 font-black uppercase tracking-tighter" 
                    onClick={handleExportPDF}
                    disabled={isGenerating || isTemplateLoading || (!selectedTemplateId && !pendingFile)}
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    EXPORT PDF
                  </Button>
                  {pendingFile && profession === 'Sports Physician' && (
                    <Button 
                      variant="outline"
                      className="w-full gap-2 h-10 border-white/20 text-white bg-white/5 hover:bg-white/10 font-bold uppercase tracking-tighter text-[10px]" 
                      onClick={handleSaveToLibrary}
                      disabled={isSaving}
                    >
                      {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                      Save to Library
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="w-full">
            <div className="w-full">
              <Card className="h-full border-none shadow-premium overflow-hidden flex flex-col min-h-[700px] bg-white ring-1 ring-black/5">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 bg-slate-50 border-b">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Clipboard className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">
                          {selectedTemplateId ? "Active Reporting Workspace" : "Clinical Interpretation Engine"}
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-medium">
                          {selectedTemplateId ? "Filling medical summary" : "Select a template above to begin analysis"}
                      </CardDescription>
                    </div>
                  </div>
                  {selectedTemplateId && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none px-4 py-1.5 rounded-full font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/20">
                          Live Editor
                      </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col bg-[#F8FAFC]">
                  {isTemplateLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 gap-6">
                      <div className="relative">
                          <RefreshCw className="w-16 h-16 animate-spin text-primary opacity-20" />
                          <MonitorPlay className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="text-center space-y-2">
                          <p className="text-slate-800 font-black uppercase tracking-widest text-xs">Transforming Document</p>
                          <p className="text-slate-500 text-sm">Building clinical form structure...</p>
                      </div>
                    </div>
                  ) : templateHtml ? (
                    <div className="flex-1 overflow-y-auto p-12 max-h-[1000px] no-scrollbar">
                          <div id="report-capture-area" className="max-w-4xl mx-auto bg-white p-16 shadow-[0_0_50px_rgba(0,0,0,0.03)] border border-slate-200 rounded-sm min-h-[1000px] relative">
                              <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                                  <div className="flex items-center gap-4">
                                      <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
                                          <Activity className="w-10 h-10" />
                                      </div>
                                      <div>
                                          <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900 leading-tight">ISHPO Clinic</h2>
                                          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Integrated Sports Health Hub</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[10px] font-black uppercase text-slate-900 mb-1">Clinic Reference: #CLN-2401</p>
                                      <p className="text-[9px] font-bold text-slate-500 uppercase">Strategic Performance Medicine</p>
                                  </div>
                              </div>

                              <div 
                                 className="clinical-form-container prose prose-slate max-w-none"
                                 dangerouslySetInnerHTML={{ __html: templateHtml }}
                                 onInput={handleFormChange}
                              />
                          </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                      <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center mx-auto ring-8 ring-white">
                        <FilePlus className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="max-w-sm mx-auto space-y-3">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">No Active Template</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed text-center">
                          Upload your <strong>.docx</strong> or <strong>.dotx</strong> template to begin interpreting clinical metrics.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Dialog open={isAthleteModalOpen} onOpenChange={setIsAthleteModalOpen}>
          <DialogContent className="bg-[#1A1F26] border-white/20 text-white rounded-[2rem] max-w-xl p-0 overflow-hidden shadow-2xl ring-1 ring-white/10">
            <DialogHeader className="p-8 bg-white/[0.04] border-b border-white/10">
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
                Select Client
              </DialogTitle>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 group-focus-within:text-primary transition-all" />
                <Input 
                  placeholder="Search by name or UHID..." 
                  value={athleteSearchQuery}
                  onChange={(e) => setAthleteSearchQuery(e.target.value)}
                  className="h-14 bg-white/[0.08] border-white/20 rounded-2xl pl-14 text-sm font-bold text-white placeholder:opacity-30"
                />
              </div>
              <div className="max-h-60 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                {athletes
                  .filter(a => `${a.first_name} ${a.last_name} ${a.uhid}`.toLowerCase().includes(athleteSearchQuery.toLowerCase()))
                  .map(athlete => (
                  <div 
                    key={athlete.id}
                    onClick={() => {
                      setSelectedAthlete({ id: athlete.id, name: `${athlete.first_name} ${athlete.last_name}` });
                      setIsAthleteModalOpen(false);
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xs uppercase">
                        {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100">
                           {athlete.first_name} {athlete.last_name}
                        </div>
                        <div className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{athlete.uhid || "CLIENT RECORD"}</div>
                      </div>
                    </div>
                    {selectedAthlete?.id === athlete.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white stroke-[4px]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="p-8 bg-black/20 pt-4 flex gap-3">
               <Button variant="ghost" onClick={() => setIsAthleteModalOpen(false)} className="rounded-xl h-12 font-bold uppercase tracking-wider text-[10px] opacity-50">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLibraryModalOpen} onOpenChange={setIsLibraryModalOpen}>
          <DialogContent className="max-w-3xl bg-slate-900 border-white/10 p-0 overflow-hidden text-white rounded-3xl">
            <DialogHeader className="p-8 bg-white/5 border-b border-white/10">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-primary" />
                Template Library Management
              </DialogTitle>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Authorized Access: Sports Physicians Only</p>
            </DialogHeader>
            
            <div className="p-0 max-h-[500px] overflow-y-auto no-scrollbar">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40">Template Name</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-white/40">Administrative Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customTemplates.map((template) => (
                    <TableRow key={template.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-bold py-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Activity className="w-4 h-4" />
                          </div>
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="h-9 px-4 gap-2 font-black uppercase text-[9px] tracking-widest bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-lg shadow-emerald-500/20"
                            onClick={() => {
                              loadTemplate(template);
                              setIsLibraryModalOpen(false);
                            }}
                          >
                            <MonitorPlay className="w-3 h-3" />
                            Use this
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => handleDownloadOriginal(template)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10"
                            onClick={() => handleDeleteTemplate(template)}
                            disabled={isDeleting === template.id}
                          >
                            {isDeleting === template.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter className="p-6 bg-black/20 flex justify-between items-center sm:justify-between">
               <div className="flex items-center gap-2 opacity-40">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sport Physician Role Confirmed</span>
               </div>
               <Button onClick={() => setIsLibraryModalOpen(false)} className="rounded-xl px-8 bg-white/20 hover:bg-white/30 border-white/10 text-white uppercase font-black text-[10px] tracking-widest">Close Library</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </DashboardLayout>
  );
}
