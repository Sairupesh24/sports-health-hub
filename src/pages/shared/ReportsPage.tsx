import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "@/components/ui/card";
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
    Star,
    Filter,
    Save,
    ChevronLeft,
    ChevronRight,
    FileText,
    FileSpreadsheet,
    FileJson
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Types for New Engine
import { 
    PRESET_TEMPLATES, 
    fetchTemplate, 
    convertToHTML, 
    extractInputs, 
    TemplateMetadata
} from "@/lib/reporting/templateService";

// Types for Old Engine
import { 
    REPORT_STRUCTURE, 
    ROLE_MODULE_ACCESS, 
    ReportModule, 
    ReportTemplate, 
    generateReportData 
} from "@/lib/reporting/reportModules";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsPageProps {
  role: "admin" | "consultant" | "sports_scientist" | "client" | "foe" | "manager";
}

// -----------------------------------------------------------------------------------------
// CLINICAL REPORTING ENGINE (New Template-Based System)
// -----------------------------------------------------------------------------------------
function ClinicalReports({ role }: { role: ReportsPageProps['role'] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("");
  const [isFetchingAthletes, setIsFetchingAthletes] = useState(false);

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
      setPendingFile(null);
      
      toast({ title: "Template Ready", description: `Successfully loaded ${template.name}` });
    } catch (error: any) {
      toast({ title: "Load Failed", description: error.message, variant: "destructive" });
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
      const buffer = await file.arrayBuffer();
      const html = await convertToHTML(buffer);
      const interactiveHtml = extractInputs(html);

      setTemplateBuffer(buffer);
      setTemplateHtml(interactiveHtml);
      setFormValues({});
      setPendingFile(file);
      setSelectedTemplateId("__pending");

      toast({ title: "Working Preview Ready", description: "You can edit this now or click 'Save to Library' to persist it." });
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

      const fileExt = pendingFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.organization_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-templates')
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

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
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.tagName === 'INPUT') {
        const tag = target.getAttribute('data-tag');
        const index = Array.from(e.currentTarget.querySelectorAll('input')).indexOf(target);
        const key = tag || `field_${index}`;
        setFormValues(prev => ({ ...prev, [key]: target.value }));
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
            if (currentSpan) parent.replaceChild(input, currentSpan);
        });
        setIsGenerating(false);
        toast({ title: "Print Preview Ready" });
    } catch (error: any) {
        toast({ title: "Export Failed", description: error.message, variant: "destructive" });
        setIsGenerating(false);
    }
  };

  const handleDownloadOriginal = async (template: TemplateMetadata) => {
    try {
      const { data, error } = await supabase.storage.from('report-templates').download(template.url);
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

  const handleDeleteTemplate = async (template: TemplateMetadata) => {
    try {
      setIsDeleting(template.id);
      await supabase.storage.from('report-templates').remove([template.url]);
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

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Clinical Reporting Engine
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive clinical analysis and patient progress tracking</p>
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
                      onClick={() => document.getElementById('template-upload')?.click()}
                  >
                      <FilePlus className="w-4 h-4" />
                      New Upload
                  </Button>
                  <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 text-[8px] uppercase tracking-widest text-primary/60 hover:text-primary gap-1"
                      onClick={() => setIsLibraryModalOpen(true)}
                  >
                      <FolderOpen className="w-3 h-3" />
                      Manage Library
                  </Button>
                </div>
                <input type="file" id="template-upload" className="hidden" accept=".docx,.dotx" onChange={handleFileUpload} />
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
              {pendingFile && (
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
                <RefreshCw className="w-16 h-16 animate-spin text-primary opacity-20" />
                <p className="text-slate-800 font-black uppercase tracking-widest text-xs mt-4">Transforming Document</p>
              </div>
            ) : templateHtml ? (
              <div className="flex-1 overflow-y-auto p-12 max-h-[1000px] no-scrollbar">
                <div id="report-capture-area" className="max-w-4xl mx-auto bg-white p-16 shadow-[0_0_50px_rgba(0,0,0,0.03)] border border-slate-200 rounded-sm relative">
                  <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                    <div className="flex items-center gap-4">
                      <Activity className="w-10 h-10 text-slate-900" />
                      <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900">ISHPO Clinic</h2>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Integrated Sports Health Hub</p>
                      </div>
                    </div>
                  </div>
                  <div className="clinical-form-container prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: templateHtml }} onInput={handleFormChange} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                <FilePlus className="w-24 h-24 text-slate-200" />
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">No Active Template</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">Upload a <strong>.docx</strong> template to begin clinical interpretation.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isLibraryModalOpen} onOpenChange={setIsLibraryModalOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border-white/10 p-0 overflow-hidden text-white rounded-3xl">
          <DialogHeader className="p-8 bg-white/5 border-b border-white/10">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Template Library Management
            </DialogTitle>
          </DialogHeader>
          <div className="p-0 max-h-[500px] overflow-y-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-white/5"><TableRow><TableHead className="text-white/40">Template Name</TableHead><TableHead className="text-right text-white/40">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {customTemplates.map((template) => (
                  <TableRow key={template.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-bold py-6">{template.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" className="bg-emerald-500 hover:bg-emerald-600 border-none text-white font-black" onClick={() => { loadTemplate(template); setIsLibraryModalOpen(false); }}>Use this</Button>
                        <Button variant="ghost" size="icon" className="text-white/40" onClick={() => handleDownloadOriginal(template)}><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-rose-500/40" onClick={() => handleDeleteTemplate(template)} disabled={isDeleting === template.id}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-6 bg-black/20"><Button onClick={() => setIsLibraryModalOpen(false)} className="bg-white/20 text-white font-black">Close Library</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// LEGACY REPORTING ENGINE (Old Module-Based System)
// -----------------------------------------------------------------------------------------
function LegacyReports({ role }: { role: ReportsPageProps['role'] }) {
  const [selectedModule, setSelectedModule] = useState<ReportModule | "">("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("");
  const [isFetchingAthletes, setIsFetchingAthletes] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const allowedModules = ROLE_MODULE_ACCESS[role] ?? [];
  const modules = allowedModules.map(m => ({ id: m as ReportModule, name: m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ') }));
  const templates = selectedModule ? REPORT_STRUCTURE[selectedModule as ReportModule] : [];

  useEffect(() => {
    setSelectedTemplate("");
    setReportData([]);
    setCurrentTemplate(null);
    setSelectedAthlete(null);
  }, [selectedModule]);

  useEffect(() => {
    if (selectedTemplate === "workout_schedule") {
        setIsAthleteModalOpen(true);
        fetchAthletes();
    }
  }, [selectedTemplate]);

  const fetchAthletes = async () => {
    try {
      setIsFetchingAthletes(true);
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, uhid, is_vip').not('ams_role', 'is', null).neq('ams_role', 'coach').order('last_name', { ascending: true });
      if (error) throw error;
      setAthletes(data || []);
    } catch (err: any) {
      toast({ title: "Error fetching athletes", description: err.message, variant: "destructive" });
    } finally {
      setIsFetchingAthletes(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedModule || !selectedTemplate) {
      toast({ title: "Module and Template selection required", variant: "destructive" });
      return;
    }
    if (selectedTemplate === "workout_schedule" && !selectedAthlete) {
        setIsAthleteModalOpen(true);
        return;
    }
    setIsGenerating(true);
    try {
        const template = templates.find(t => t.id === selectedTemplate);
        setCurrentTemplate(template || null);
        const data = await generateReportData(selectedModule as ReportModule, selectedTemplate, { startDate, endDate, athleteId: selectedAthlete?.id });
        setReportData(data);
        toast({ title: "Report generated successfully" });
    } catch (error: any) {
        toast({ title: "Failed to generate report", description: error.message, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData.length || !currentTemplate) return;
    const headers = currentTemplate.columns.map(c => c.label).join(',');
    const rows = reportData.map(row => currentTemplate.columns.map(c => JSON.stringify(row[c.key])).join(',')).join('\n');
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + headers + '\n' + rows);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedTemplate}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (!reportData.length || !currentTemplate) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${selectedTemplate}_report.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData.length || !currentTemplate) return;
    const doc = new jsPDF();
    doc.text(`${currentTemplate.name} - ${format(new Date(), 'PPP')}`, 14, 15);
    const tableData = reportData.map(row => currentTemplate.columns.map(c => row[c.key]));
    const tableHeaders = currentTemplate.columns.map(c => c.label);
    autoTable(doc, { head: [tableHeaders], body: tableData, startY: 20, theme: 'striped' });
    doc.save(`${selectedTemplate}_report.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Reporting Engine
          </h1>
          <p className="text-muted-foreground mt-1">Generate modular reports across all system modules</p>
        </div>
      </div>

      <Card className="gradient-card border-none shadow-premium">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Module</label>
              <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v as ReportModule)}>
                <SelectTrigger className="bg-background/50 h-11"><SelectValue placeholder="Select Module" /></SelectTrigger>
                <SelectContent>{modules.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Report Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={!selectedModule}>
                <SelectTrigger className="bg-background/50 h-11"><SelectValue placeholder="Select Template" /></SelectTrigger>
                <SelectContent>{templates.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button className="flex-1 gap-2 h-11 font-bold" onClick={handleGenerateReport} disabled={isGenerating || !selectedTemplate}>
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card className="h-full border-none bg-muted/20 backdrop-blur-md">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Filter className="w-4 h-4 text-primary" />Filter Panel</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Range</label>
                <div className="space-y-2">
                  <Input type="date" className="bg-background/50 h-9 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <Input type="date" className="bg-background/50 h-9 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Client Selection</label>
                <div onClick={() => { setIsAthleteModalOpen(true); fetchAthletes(); }} className="h-9 px-3 bg-background/50 border rounded-lg flex items-center justify-between cursor-pointer text-[10px]">
                  {selectedAthlete ? selectedAthlete.name : "All Clients"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full border-none shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <CardHeader className="flex items-center justify-between gap-4 pb-4 bg-muted/10 border-b">
              <div><CardTitle>{currentTemplate ? currentTemplate.name : "Report Results"}</CardTitle></div>
              {reportData.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToPDF}><FileText className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel}><FileSpreadsheet className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {isGenerating ? (<div className="flex-1 p-20 text-center animate-pulse">Generating...</div>) : reportData.length > 0 && currentTemplate ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>{currentTemplate.columns.map(col => (<TableHead key={col.key}>{col.label}</TableHead>))}</TableRow></TableHeader>
                    <TableBody>
                      {reportData.map((row, idx) => (
                        <TableRow key={idx}>{currentTemplate.columns.map(col => (<TableCell key={col.key}>{row[col.key] || '—'}</TableCell>))}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (<div className="flex-1 p-20 text-center text-muted-foreground">No data available. Configure and generate report.</div>)}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAthleteModalOpen} onOpenChange={setIsAthleteModalOpen}>
        <DialogContent className="bg-[#1A1F26] text-white rounded-[2rem] max-w-xl">
          <DialogHeader><DialogTitle>Select Client</DialogTitle></DialogHeader>
          <div className="p-8 space-y-6">
            <Input placeholder="Search..." value={athleteSearchQuery} onChange={(e) => setAthleteSearchQuery(e.target.value)} className="bg-white/10" />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {athletes.filter(a => `${a.first_name} ${a.last_name} ${a.uhid}`.toLowerCase().includes(athleteSearchQuery.toLowerCase())).map(athlete => (
                <div key={athlete.id} onClick={() => { setSelectedAthlete({ id: athlete.id, name: `${athlete.first_name} ${athlete.last_name}` }); setIsAthleteModalOpen(false); }} className="p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
                  {athlete.first_name} {athlete.last_name} ({athlete.uhid})
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// MAIN ROUTER COMPONENT
// -----------------------------------------------------------------------------------------
export default function ReportsPage({ role: initialRole }: ReportsPageProps) {
  const { roles } = useAuth();
  
  // Role Escalation Logic
  let role: ReportsPageProps['role'] = initialRole;
  if (roles.includes('admin')) role = 'admin';
  else if (roles.includes('foe')) role = 'foe';
  else if (roles.includes('manager')) role = 'manager';
  else if (roles.includes('sports_scientist')) role = 'sports_scientist';
  else if (roles.includes('consultant')) role = 'consultant';

  // Routing Logic: Admin/FOE/Manager -> Legacy, Physio/SportsScientist -> Clinical
  const isLegacy = role === 'admin' || role === 'foe' || role === 'manager';

  return (
    <DashboardLayout role={role}>
      {isLegacy ? (
        <LegacyReports role={role} />
      ) : (
        <ClinicalReports role={role} />
      )}
    </DashboardLayout>
  );
}
