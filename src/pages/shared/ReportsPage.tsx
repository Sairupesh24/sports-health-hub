import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    BarChart3, 
    Download, 
    Filter, 
    Save, 
    Star, 
    Search, 
    RefreshCw, 
    FileText, 
    FileSpreadsheet, 
    FileJson,
    ChevronLeft,
    ChevronRight,
    SearchX
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { REPORT_STRUCTURE, ROLE_MODULE_ACCESS, ReportModule, ReportTemplate, generateReportData } from "@/lib/reporting/reportModules";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsPageProps {
  role: "admin" | "consultant" | "sports_scientist" | "client";
}

export default function ReportsPage({ role }: ReportsPageProps) {
  const [selectedModule, setSelectedModule] = useState<ReportModule | "">("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter modules to only those allowed for this role
  const allowedModules = ROLE_MODULE_ACCESS[role] ?? [];
  const modules = allowedModules.map(m => ({
    id: m as ReportModule,
    name: m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ')
  }));


  const templates = selectedModule ? REPORT_STRUCTURE[selectedModule as ReportModule] : [];

  useEffect(() => {
    setSelectedTemplate("");
    setReportData([]);
    setCurrentTemplate(null);
  }, [selectedModule]);

  const handleGenerateReport = async () => {
    if (!selectedModule || !selectedTemplate) {
      toast({ title: "Module and Template selection required", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    try {
        const template = templates.find(t => t.id === selectedTemplate);
        setCurrentTemplate(template || null);
        
        const data = await generateReportData(selectedModule as ReportModule, selectedTemplate, { startDate, endDate });
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
    const rows = reportData.map(row => 
        currentTemplate.columns.map(c => JSON.stringify(row[c.key])).join(',')
    ).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedTemplate}_report.csv`);
    document.body.appendChild(link);
    link.click();
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

    autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 20,
        theme: 'striped'
    });
    
    doc.save(`${selectedTemplate}_report.pdf`);
  };

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Reporting Engine
            </h1>
            <p className="text-muted-foreground mt-1">Generate modular reports across all system modules</p>
            {role !== "admin" && role !== "manager" && (
              <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                Financial & billing reports are restricted to Admin access only.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 h-10">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Favorites</span>
            </Button>
            <Button variant="outline" className="gap-2 h-10">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </div>
        </div>

        <Card className="gradient-card border-none shadow-premium">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Module</label>
                <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v as ReportModule)}>
                  <SelectTrigger className="bg-background/50 border-white/10 backdrop-blur-sm h-11">
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Report Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={!selectedModule}>
                  <SelectTrigger className="bg-background/50 border-white/10 backdrop-blur-sm h-11">
                    <SelectValue placeholder="Select Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <Button 
                  className="flex-1 gap-2 shadow-glow h-11 font-bold" 
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !selectedTemplate}
                >
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  Generate Report
                </Button>
                <Button variant="secondary" className="gap-2 h-11" disabled={!selectedTemplate}>
                  <Star className="w-4 h-4" />
                  Favorite
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Panel */}
          <div className="lg:col-span-1">
            <Card className="h-full border-white/5 bg-muted/20 backdrop-blur-md sticky top-6">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  Filter Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Range</label>
                  <div className="space-y-2">
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Start Date</span>
                        <Input 
                            type="date" 
                            className="bg-background/50 h-9 text-xs" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">End Date</span>
                        <Input 
                            type="date" 
                            className="bg-background/50 h-9 text-xs" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Location</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="bg-background/50 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff / Consultant</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="bg-background/50 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-full text-[10px] font-bold uppercase tracking-widest h-9 gap-2">
                    <Save className="w-3 h-3" />
                    Save Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Results */}
          <div className="lg:col-span-3">
            <Card className="h-full border-none shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 bg-muted/10 border-b">
                <div>
                  <CardTitle className="text-xl">
                    {currentTemplate ? currentTemplate.name : "Report Results"}
                  </CardTitle>
                  <CardDescription>
                    {currentTemplate ? currentTemplate.description : "Generated data will appear below"}
                  </CardDescription>
                </div>
                {reportData.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 h-9 text-[10px] font-extrabold uppercase tracking-tighter" onClick={exportToPDF}>
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 h-9 text-[10px] font-extrabold uppercase tracking-tighter" onClick={exportToExcel}>
                      <FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 h-9 text-[10px] font-extrabold uppercase tracking-tighter" onClick={exportToCSV}>
                      <FileJson className="w-3.5 h-3.5" /> CSV
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                {isGenerating ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4">
                    <RefreshCw className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium animate-pulse">Running advanced module queries...</p>
                  </div>
                ) : reportData.length > 0 && currentTemplate ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          {currentTemplate.columns.map(col => (
                            <TableHead key={col.key} className="text-[10px] font-bold uppercase tracking-wider h-12 text-foreground/70">
                                {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/10 transition-colors border-border/50">
                            {currentTemplate.columns.map(col => (
                              <TableCell key={col.key} className="py-4 text-sm">
                                {col.key.includes('Date') || col.key.includes('_at') || col.key === 'registered_on' 
                                    ? format(new Date(row[col.key]), 'dd MMM yyyy')
                                    : row[col.key] || '—'
                                }
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto">
                      <SearchX className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <h3 className="text-xl font-bold text-foreground">Prepare Analysis</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Configure your report parameters above and click generate to view the breakdown.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              {reportData.length > 0 && (
                  <div className="p-4 bg-muted/5 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>Showing {reportData.length} records</span>
                      <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled><ChevronLeft className="w-4 h-4" /></Button>
                          <span className="font-bold text-foreground mx-2">1</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                  </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
