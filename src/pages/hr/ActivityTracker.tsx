import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Download, 
  Mail, 
  Send, 
  Clock, 
  RefreshCw, 
  CalendarRange, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  FileSpreadsheet, 
  Calendar,
  Layers,
  Eye,
  CheckCircle,
  Clock4,
  AlertCircle
} from "lucide-react";
import { format, addDays, subDays, isToday, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface StaffActivity {
  id: string;
  name: string;
  email: string;
  role: string;
  profession: string;
  activeMinutes: number;
  sessionsCount: number;
  plannedSessionsCount?: number;
  registrationsCount: number;
}

interface SessionItem {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd?: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  serviceType: string;
  sessionMode: string;
  clientName: string;
  uhid?: string | null;
}

interface StaffReportItem {
  id: string;
  name: string;
  email: string;
  role: string;
  profession: string;
  plannedSessions: number;
  completedSessions: number;
  totalScheduled: number;
  completionRate: number;
  activeMinutes: number;
  registrationsCount: number;
  sessions: SessionItem[];
}

interface TimeFrameReportResponse {
  startDate: string;
  endDate: string;
  roleFilter: string;
  summary: {
    totalPlanned: number;
    totalCompleted: number;
    totalScheduled: number;
    overallCompletionRate: number;
    totalActiveStaff: number;
    totalStaffCount: number;
  };
  data: StaffReportItem[];
}

interface AutomationConfig {
  id?: string;
  is_enabled: boolean;
  recipient_emails: string;
  scheduled_time: string;
  last_sent_date?: string | null;
}

export default function ActivityTracker() {
  const { profile } = useAuth();

  // Navigation Tab: 'daily' vs 'report'
  const [activeTab, setActiveTab] = useState<"daily" | "report">("daily");

  // Daily View State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailySearchQuery, setDailySearchQuery] = useState("");
  const [dailyRoleFilter, setDailyRoleFilter] = useState("all");
  const [exportingDailyPDF, setExportingDailyPDF] = useState(false);

  // Time Frame Report State
  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(new Date(), "yyyy-MM-dd");
  const [reportStartDate, setReportStartDate] = useState<string>(defaultStartDate);
  const [reportEndDate, setReportEndDate] = useState<string>(defaultEndDate);
  const [reportRoleFilter, setReportRoleFilter] = useState<string>("all");
  const [reportSearchQuery, setReportSearchQuery] = useState<string>("");
  const [selectedStaffForModal, setSelectedStaffForModal] = useState<StaffReportItem | null>(null);
  const [exportingReportPDF, setExportingReportPDF] = useState(false);

  // Automation Modal State
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState("");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [sendingInstant, setSendingInstant] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch Daily Activity Metrics with live polling when viewing today
  const { 
    data: dailyResponse, 
    isLoading: isDailyLoading, 
    refetch: refetchDailyMetrics, 
    isFetching: isDailyFetching 
  } = useQuery<{ date: string; data: StaffActivity[] }>({
    queryKey: ["activity-tracker-metrics", dateStr, profile?.organization_id],
    queryFn: async () => {
      return await apiFetch<{ date: string; data: StaffActivity[] }>(`/hr/activity-tracker?date=${dateStr}`);
    },
    refetchInterval: isToday(selectedDate) && activeTab === "daily" ? 4000 : false,
    refetchOnWindowFocus: true,
  });

  // Fetch Time Frame Report
  const {
    data: reportResponse,
    isLoading: isReportLoading,
    refetch: refetchReport,
    isFetching: isReportFetching
  } = useQuery<TimeFrameReportResponse>({
    queryKey: ["activity-tracker-timeframe-report", reportStartDate, reportEndDate, reportRoleFilter, profile?.organization_id],
    queryFn: async () => {
      return await apiFetch<TimeFrameReportResponse>(
        `/hr/activity-tracker/report?startDate=${reportStartDate}&endDate=${reportEndDate}&role=${reportRoleFilter}`
      );
    },
    enabled: Boolean(reportStartDate && reportEndDate),
  });

  // Fetch Automation Settings
  const { data: automationData, refetch: refetchAutomation } = useQuery<AutomationConfig>({
    queryKey: ["activity-tracker-automation", profile?.organization_id],
    queryFn: async () => {
      return await apiFetch<AutomationConfig>("/hr/activity-tracker/automation");
    },
  });

  useEffect(() => {
    if (automationData) {
      setIsAutomationEnabled(automationData.is_enabled || false);
      setRecipientEmails(automationData.recipient_emails || "");
      setScheduledTime(automationData.scheduled_time || "18:00");
    }
  }, [automationData]);

  const staffActivities = dailyResponse?.data || [];

  // Filter daily staff members
  const filteredDailyStaff = staffActivities.filter(staff => {
    const isBot =
      staff.role === 'bot' ||
      (staff.profession || '').toLowerCase().includes('automated') ||
      staff.email.includes('hubbot_') ||
      staff.name.toLowerCase() === 'hubbot' ||
      (staff.profession || '').toLowerCase() === 'automated assistant';
    if (isBot) return false;

    const matchesSearch = 
      staff.name.toLowerCase().includes(dailySearchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(dailySearchQuery.toLowerCase()) ||
      (staff.profession || "").toLowerCase().includes(dailySearchQuery.toLowerCase());

    const p = (staff.profession || staff.role || "").toLowerCase();
    const matchesRole = 
      dailyRoleFilter === "all" ||
      staff.role.toLowerCase() === dailyRoleFilter.toLowerCase() ||
      p.includes(dailyRoleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Filter time frame report staff members
  const rawReportStaff = reportResponse?.data || [];
  const filteredReportStaff = rawReportStaff.filter(staff => {
    const isBot =
      staff.role === 'bot' ||
      (staff.profession || '').toLowerCase().includes('automated') ||
      staff.email.includes('hubbot_') ||
      staff.name.toLowerCase() === 'hubbot' ||
      (staff.profession || '').toLowerCase() === 'automated assistant';
    if (isBot) return false;

    const matchesSearch = 
      staff.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
      (staff.profession || "").toLowerCase().includes(reportSearchQuery.toLowerCase());

    return matchesSearch;
  });

  // Dynamic KPI summary metrics for the filtered report staff
  const reportTotalPlanned = filteredReportStaff.reduce((acc, s) => acc + s.plannedSessions, 0);
  const reportTotalCompleted = filteredReportStaff.reduce((acc, s) => acc + s.completedSessions, 0);
  const reportTotalScheduled = reportTotalPlanned + reportTotalCompleted;
  const reportOverallCompletionRate = reportTotalScheduled > 0 
    ? Math.round((reportTotalCompleted / reportTotalScheduled) * 100) 
    : 0;
  const reportActiveStaffCount = filteredReportStaff.filter(
    s => s.plannedSessions > 0 || s.completedSessions > 0 || s.activeMinutes > 0
  ).length;
  const reportTotalActiveMinutes = filteredReportStaff.reduce((acc, s) => acc + s.activeMinutes, 0);

  const formatActiveTime = (mins: number) => {
    if (!mins || mins <= 0) return "0 mins";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs === 0) return `${remainingMins} mins`;
    return `${hrs}h ${remainingMins}m (${mins}m)`;
  };

  // Quick Preset Date Ranges for the Report
  const applyDatePreset = (preset: "today" | "last7" | "thisMonth" | "last30" | "last90") => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    switch (preset) {
      case "today":
        setReportStartDate(todayStr);
        setReportEndDate(todayStr);
        break;
      case "last7":
        setReportStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
        setReportEndDate(todayStr);
        break;
      case "thisMonth":
        setReportStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
        setReportEndDate(todayStr);
        break;
      case "last30":
        setReportStartDate(format(subDays(today, 30), "yyyy-MM-dd"));
        setReportEndDate(todayStr);
        break;
      case "last90":
        setReportStartDate(format(subDays(today, 90), "yyyy-MM-dd"));
        setReportEndDate(todayStr);
        break;
    }
  };

  // Export Daily Table to PDF
  const handleExportDailyPDF = async () => {
    const element = document.getElementById("activity-tracker-table-container");
    if (!element) return;

    try {
      setExportingDailyPDF(true);
      toast({ title: "Generating PDF Report...", description: "Preparing daily document download." });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("Center for Spine & Sports Health (CSSH)", 14, 15);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(13, 148, 136);
      pdf.text("Daily Staff Activity Tracker & Performance Report", 14, 22);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Activity Date: ${format(selectedDate, "EEEE, dd MMMM yyyy")}`, 14, 28);
      pdf.text(`Generated On: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 33);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 14, 38, imgWidth, imgHeight);
      pdf.save(`Staff_Daily_Activity_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF Report Saved ✓", description: "Downloaded Daily Activity Tracker PDF." });
    } catch (err: any) {
      console.error("Failed to export PDF:", err);
      toast({ title: "Export Error", description: "Could not generate PDF file.", variant: "destructive" });
    } finally {
      setExportingDailyPDF(false);
    }
  };

  // Export Time Frame Report to PDF
  const handleExportReportPDF = async () => {
    const element = document.getElementById("timeframe-report-container");
    if (!element) return;

    try {
      setExportingReportPDF(true);
      toast({ title: "Generating Report PDF...", description: "Preparing comprehensive session report download." });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("Center for Spine & Sports Health (CSSH)", 14, 15);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(13, 148, 136);
      pdf.text("Staff Session Performance & Activity Report", 14, 22);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Time Frame: ${reportStartDate} to ${reportEndDate}`, 14, 28);
      pdf.text(`Role Filter: ${reportRoleFilter === 'all' ? 'All Roles & Professions' : reportRoleFilter.toUpperCase()} | Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 33);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 14, 38, imgWidth, imgHeight);
      pdf.save(`Staff_Session_Report_${reportStartDate}_to_${reportEndDate}.pdf`);
      toast({ title: "PDF Report Saved ✓", description: "Downloaded Session Performance Report PDF." });
    } catch (err: any) {
      console.error("Failed to export report PDF:", err);
      toast({ title: "Export Error", description: "Could not generate report PDF.", variant: "destructive" });
    } finally {
      setExportingReportPDF(false);
    }
  };

  // Export Time Frame Report to CSV
  const handleExportCSV = () => {
    if (filteredReportStaff.length === 0) return;
    const headers = [
      "Staff Member", 
      "Email", 
      "Role", 
      "Profession", 
      "Planned Sessions", 
      "Completed Sessions", 
      "Total Scheduled", 
      "Completion Rate (%)", 
      "Active Time (Mins)"
    ];
    const rows = filteredReportStaff.map(s => [
      `"${s.name}"`,
      `"${s.email}"`,
      `"${s.role}"`,
      `"${s.profession || s.role}"`,
      s.plannedSessions,
      s.completedSessions,
      s.totalScheduled,
      `${s.completionRate}%`,
      s.activeMinutes
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Staff_Session_Report_${reportStartDate}_to_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported ✓", description: "Report downloaded as CSV spreadsheet." });
  };

  // Save Automation Configuration
  const handleSaveAutomation = async () => {
    try {
      setSavingAutomation(true);
      await apiFetch("/hr/activity-tracker/automation", {
        method: "POST",
        data: {
          is_enabled: isAutomationEnabled,
          recipient_emails: recipientEmails.trim(),
          scheduled_time: scheduledTime
        }
      });
      await refetchAutomation();
      toast({
        title: isAutomationEnabled ? "Automation Enabled ✓" : "Automation Turned Off",
        description: isAutomationEnabled 
          ? `Report will be emailed daily to ${recipientEmails || 'configured emails'} at ${scheduledTime}.`
          : "Daily email broadcast has been turned off."
      });
      setAutomationDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message || "Could not save automation settings.", variant: "destructive" });
    } finally {
      setSavingAutomation(false);
    }
  };

  // Trigger Instant Email Broadcast
  const handleSendInstantEmail = async () => {
    if (!recipientEmails.trim()) {
      return toast({ title: "Recipient Email Required", description: "Please enter at least one email address.", variant: "destructive" });
    }

    try {
      setSendingInstant(true);
      toast({ title: "Sending Report Email...", description: "Broadcasting daily activity report." });
      await apiFetch("/hr/activity-tracker/send-now", {
        method: "POST",
        data: {
          recipient_emails: recipientEmails.trim(),
          date: dateStr
        }
      });
      toast({ title: "Report Emailed Successfully ✓", description: `Report sent to ${recipientEmails}.` });
    } catch (err: any) {
      const errMsg = err.message || "";
      const description = errMsg.includes("PLAIN") || errMsg.includes("credentials")
        ? "SMTP credentials required. Please set valid SMTP_USER and SMTP_PASS in server/.env file."
        : errMsg || "Could not send report email.";
      toast({ title: "Email Broadcast Error", description, variant: "destructive" });
    } finally {
      setSendingInstant(false);
    }
  };

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-6xl mx-auto pb-32 sm:pb-12 px-2 sm:px-4">
        {/* Header with Title and Global Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Activity Tracker & Performance Reports
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              {activeTab === "daily" 
                ? "Daily staff console active time, sessions conducted, and client registrations."
                : "Comprehensive time frame report for planned vs completed sessions and staff productivity."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {activeTab === "daily" ? (
              <>
                {/* Automation Setup Button */}
                <Button
                  variant="outline"
                  onClick={() => setAutomationDialogOpen(true)}
                  className={cn(
                    "gap-2 font-bold rounded-xl h-10 px-3.5 text-xs sm:text-sm border-slate-200 shadow-sm transition-all",
                    isAutomationEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" : "bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Mail className="w-4 h-4 text-primary" />
                  <span>Automate Daily PDF</span>
                  {isAutomationEnabled && (
                    <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                      ON
                    </Badge>
                  )}
                </Button>

                {/* Export Daily PDF Button */}
                <Button
                  onClick={handleExportDailyPDF}
                  disabled={exportingDailyPDF || filteredDailyStaff.length === 0}
                  className="gap-2 font-bold rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm h-10 px-4"
                >
                  <Download className="w-4 h-4" />
                  {exportingDailyPDF ? "Generating PDF..." : "Export Daily PDF"}
                </Button>
              </>
            ) : (
              <>
                {/* Export CSV Button */}
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={filteredReportStaff.length === 0}
                  className="gap-2 font-bold rounded-xl h-10 px-3.5 text-xs sm:text-sm border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                  title="Export spreadsheet as CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export CSV</span>
                </Button>

                {/* Export Report PDF Button */}
                <Button
                  onClick={handleExportReportPDF}
                  disabled={exportingReportPDF || filteredReportStaff.length === 0}
                  className="gap-2 font-bold rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm h-10 px-4"
                >
                  <Download className="w-4 h-4" />
                  {exportingReportPDF ? "Generating PDF..." : "Export PDF Report"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* View Switcher: Daily Live Tracker vs Time Frame Report */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-fit shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all",
              activeTab === "daily"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Clock className="w-4 h-4 text-primary" />
            <span>Daily Live Tracker</span>
            {isToday(selectedDate) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all",
              activeTab === "report"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <CalendarRange className="w-4 h-4 text-purple-600" />
            <span>Time Frame Session Report</span>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px] px-1.5 py-0 rounded-md font-bold">
              Planned vs Completed
            </Badge>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DAILY LIVE TRACKER VIEW */}
        {/* ========================================================================= */}
        {activeTab === "daily" && (
          <div className="space-y-4">
            {/* Date Navigator, Search & Role Filter Bar */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white p-3 sm:p-4 space-y-3">
              {/* Date Switcher */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setSelectedDate(prev => subDays(prev, 1))}
                  className="h-9 w-9 rounded-xl flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="text-center flex-1">
                  <span className="text-xs sm:text-sm font-black text-slate-900 block uppercase tracking-tight">
                    {format(selectedDate, "EEEE, dd MMMM yyyy")}
                  </span>
                  {isToday(selectedDate) ? (
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 py-0.5 px-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Today's Live Activity
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                      Past Activity
                    </Badge>
                  )}
                </div>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                  className="h-9 w-9 rounded-xl flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchDailyMetrics()}
                    disabled={isDailyFetching}
                    className="text-xs font-bold rounded-xl h-9 px-2.5 sm:px-3 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 flex-shrink-0"
                    title="Refresh live activity"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isDailyFetching && "animate-spin")} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedDate(new Date())}
                    className="text-xs font-black rounded-xl h-9 px-3 hidden xs:flex flex-shrink-0"
                  >
                    Today
                  </Button>
                </div>
              </div>

              {/* Search & Role Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Search staff by name or profession..."
                    value={dailySearchQuery}
                    onChange={e => setDailySearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-xl font-medium"
                  />
                </div>

                <div className="sm:col-span-1">
                  <Select value={dailyRoleFilter} onValueChange={setDailyRoleFilter}>
                    <SelectTrigger className="h-10 rounded-xl font-medium">
                      <SelectValue placeholder="Filter by Role / Profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles & Professions (All Users)</SelectItem>
                      <SelectItem value="sports_scientist">Sports Scientist</SelectItem>
                      <SelectItem value="sports_physician">Sports Physician</SelectItem>
                      <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                      <SelectItem value="nutritionist">Nutritionist</SelectItem>
                      <SelectItem value="foe">Front Office (FOE)</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="hr_manager">HR Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Daily Activity Table Container */}
            <Card id="activity-tracker-table-container" className="border border-slate-200 shadow-md rounded-2xl bg-white overflow-hidden p-1">
              {isDailyLoading ? (
                <div className="p-12 text-center text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  Loading staff activity data...
                </div>
              ) : filteredDailyStaff.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium text-sm">
                  No staff members match the selected filter for {format(selectedDate, "dd MMM yyyy")}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4">Staff Member</th>
                        <th className="py-3.5 px-4 text-center">Active Time Spent on App</th>
                        <th className="py-3.5 px-4 text-center">Planned Sessions</th>
                        <th className="py-3.5 px-4 text-center">Sessions Conducted</th>
                        <th className="py-3.5 px-4 text-center">Registrations Done</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredDailyStaff.map(staff => (
                        <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Staff Member */}
                          <td className="py-4 px-4">
                            <div>
                              <span className="font-bold text-slate-900 block text-sm">{staff.name}</span>
                              <span className="text-xs text-slate-500 font-semibold block capitalize">
                                {staff.profession || staff.role}
                              </span>
                            </div>
                          </td>

                          {/* Active Time Spent on Application */}
                          <td className="py-4 px-4 text-center">
                            {staff.activeMinutes > 0 ? (
                              <Badge className="font-bold text-xs px-3 py-1 rounded-xl bg-emerald-500 text-white shadow-sm border-none">
                                {formatActiveTime(staff.activeMinutes)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-semibold text-xs px-3 py-1 rounded-xl bg-slate-50 text-slate-400 border-slate-200">
                                No Activity
                              </Badge>
                            )}
                          </td>

                          {/* Planned Sessions */}
                          <td className="py-4 px-4 text-center">
                            {(staff.plannedSessionsCount || 0) > 0 ? (
                              <Badge className="font-bold text-xs px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                                {staff.plannedSessionsCount} {staff.plannedSessionsCount === 1 ? "Planned" : "Planned"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">0</span>
                            )}
                          </td>

                          {/* Sessions Conducted (Completed) */}
                          <td className="py-4 px-4 text-center">
                            {staff.sessionsCount > 0 ? (
                              <Badge className="font-bold text-xs px-3 py-1 rounded-xl bg-purple-500 text-white shadow-sm border-none">
                                {staff.sessionsCount} {staff.sessionsCount === 1 ? "Session" : "Sessions"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-semibold text-xs px-3 py-1 rounded-xl bg-slate-50 text-slate-400 border-slate-200">
                                No Activity
                              </Badge>
                            )}
                          </td>

                          {/* Registrations Done */}
                          <td className="py-4 px-4 text-center">
                            {staff.registrationsCount > 0 ? (
                              <Badge className="font-bold text-xs px-3 py-1 rounded-xl bg-amber-500 text-white shadow-sm border-none">
                                {staff.registrationsCount} {staff.registrationsCount === 1 ? "Registration" : "Registrations"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-semibold text-xs px-3 py-1 rounded-xl bg-slate-50 text-slate-400 border-slate-200">
                                No Activity
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TIME FRAME SESSION REPORT (PLANNED VS COMPLETED) */}
        {/* ========================================================================= */}
        {activeTab === "report" && (
          <div className="space-y-6">
            {/* Filter Card: Date Range, Presets & Role Filter */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white p-4 space-y-4">
              {/* Presets and Quick Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Presets:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDatePreset("today")}
                    className="h-7 text-xs rounded-lg px-2.5 font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDatePreset("last7")}
                    className="h-7 text-xs rounded-lg px-2.5 font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDatePreset("thisMonth")}
                    className="h-7 text-xs rounded-lg px-2.5 font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    This Month
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDatePreset("last30")}
                    className="h-7 text-xs rounded-lg px-2.5 font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDatePreset("last90")}
                    className="h-7 text-xs rounded-lg px-2.5 font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    Last 90 Days
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchReport()}
                  disabled={isReportFetching}
                  className="h-8 text-xs font-bold rounded-xl px-3 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isReportFetching && "animate-spin")} />
                  <span>Update Report</span>
                </Button>
              </div>

              {/* Date Inputs, Role Filter & Search Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Start Date */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={reportStartDate}
                    onChange={e => setReportStartDate(e.target.value)}
                    className="h-10 rounded-xl font-medium border-slate-200 text-slate-800"
                  />
                </div>

                {/* End Date */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={reportEndDate}
                    onChange={e => setReportEndDate(e.target.value)}
                    className="h-10 rounded-xl font-medium border-slate-200 text-slate-800"
                  />
                </div>

                {/* Role Filter */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    Role Filter
                  </label>
                  <Select value={reportRoleFilter} onValueChange={setReportRoleFilter}>
                    <SelectTrigger className="h-10 rounded-xl font-medium border-slate-200">
                      <SelectValue placeholder="All Roles & Professions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles & Professions (All Users)</SelectItem>
                      <SelectItem value="sports_scientist">Sports Scientist</SelectItem>
                      <SelectItem value="sports_physician">Sports Physician</SelectItem>
                      <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                      <SelectItem value="nutritionist">Nutritionist</SelectItem>
                      <SelectItem value="foe">Front Office (FOE)</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="hr_manager">HR Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Staff Search */}
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    Search Staff
                  </label>
                  <Input
                    placeholder="Search name, email, role..."
                    value={reportSearchQuery}
                    onChange={e => setReportSearchQuery(e.target.value)}
                    className="h-10 rounded-xl font-medium border-slate-200"
                  />
                </div>
              </div>
            </Card>

            {/* Time Frame Report Summary KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Planned Sessions */}
              <Card className="p-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Planned Sessions</span>
                  <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {reportTotalPlanned}
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold block mt-0.5">
                    Scheduled in selected time frame
                  </span>
                </div>
              </Card>

              {/* Card 2: Completed Sessions */}
              <Card className="p-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Completed Sessions</span>
                  <div className="p-2 rounded-xl bg-purple-100/80 text-purple-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {reportTotalCompleted}
                  </div>
                  <span className="text-[11px] text-purple-600 font-semibold block mt-0.5">
                    Conducted & finalized
                  </span>
                </div>
              </Card>

              {/* Card 3: Overall Completion Rate */}
              <Card className="p-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completion Rate</span>
                  <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {reportOverallCompletionRate}%
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      ({reportTotalCompleted}/{reportTotalScheduled})
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(reportOverallCompletionRate, 100)}%` }} 
                    />
                  </div>
                </div>
              </Card>

              {/* Card 4: Staff Activity */}
              <Card className="p-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Staff & App Time</span>
                  <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {reportActiveStaffCount} <span className="text-xs font-bold text-slate-500 font-normal">/ {filteredReportStaff.length} active</span>
                  </div>
                  <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">
                    {formatActiveTime(reportTotalActiveMinutes)} total console time
                  </span>
                </div>
              </Card>
            </div>

            {/* Time Frame Report Table Container */}
            <Card id="timeframe-report-container" className="border border-slate-200 shadow-md rounded-2xl bg-white overflow-hidden p-1">
              <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    User Session Performance Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing planned and completed sessions from <span className="font-bold text-slate-700">{reportStartDate}</span> to <span className="font-bold text-slate-700">{reportEndDate}</span>
                    {reportRoleFilter !== 'all' && (
                      <span> • Filtered by <span className="font-bold text-primary capitalize">{reportRoleFilter.replace('_', ' ')}</span></span>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit text-slate-600 border-slate-200 font-bold text-[11px]">
                  {filteredReportStaff.length} Staff {filteredReportStaff.length === 1 ? "Member" : "Members"}
                </Badge>
              </div>

              {isReportLoading ? (
                <div className="p-16 text-center text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  Generating Time Frame Session Report...
                </div>
              ) : filteredReportStaff.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-medium text-sm">
                  No staff members match the selected criteria for the time frame ({reportStartDate} to {reportEndDate}).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4">Staff Member / Role</th>
                        <th className="py-3.5 px-4 text-center">Planned Sessions</th>
                        <th className="py-3.5 px-4 text-center">Completed Sessions</th>
                        <th className="py-3.5 px-4 text-center">Total Scheduled</th>
                        <th className="py-3.5 px-4 text-center">Completion Rate</th>
                        <th className="py-3.5 px-4 text-center">App Active Time</th>
                        <th className="py-3.5 px-4 text-center">Session Drill-Down</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredReportStaff.map(staff => (
                        <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Staff Member & Role */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm flex-shrink-0">
                                {staff.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-sm">{staff.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 capitalize bg-slate-50 text-slate-600 border-slate-200">
                                    {staff.profession || staff.role.replace('_', ' ')}
                                  </Badge>
                                  <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                                    {staff.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Planned Sessions */}
                          <td className="py-4 px-4 text-center">
                            {staff.plannedSessions > 0 ? (
                              <Badge className="font-bold text-xs px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                                {staff.plannedSessions} Planned
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold">0 Planned</span>
                            )}
                          </td>

                          {/* Completed Sessions */}
                          <td className="py-4 px-4 text-center">
                            {staff.completedSessions > 0 ? (
                              <Badge className="font-bold text-xs px-3 py-1 rounded-xl bg-purple-500 text-white shadow-sm border-none">
                                {staff.completedSessions} Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="font-semibold text-xs px-3 py-1 rounded-xl bg-slate-50 text-slate-400 border-slate-200">
                                0 Completed
                              </Badge>
                            )}
                          </td>

                          {/* Total Scheduled */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-black text-slate-900 text-sm">
                              {staff.totalScheduled}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-medium">sessions</span>
                          </td>

                          {/* Completion Rate with Progress Bar */}
                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex flex-col items-center min-w-[90px]">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "font-black text-xs",
                                  staff.completionRate >= 80 ? "text-emerald-600" :
                                  staff.completionRate >= 50 ? "text-amber-600" :
                                  staff.totalScheduled > 0 ? "text-rose-600" : "text-slate-400"
                                )}>
                                  {staff.completionRate}%
                                </span>
                              </div>
                              <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    staff.completionRate >= 80 ? "bg-emerald-500" :
                                    staff.completionRate >= 50 ? "bg-amber-500" :
                                    "bg-rose-500"
                                  )}
                                  style={{ width: `${Math.min(staff.completionRate, 100)}%` }} 
                                />
                              </div>
                            </div>
                          </td>

                          {/* Active Time on App */}
                          <td className="py-4 px-4 text-center">
                            {staff.activeMinutes > 0 ? (
                              <Badge className="font-bold text-xs px-2.5 py-0.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                {formatActiveTime(staff.activeMinutes)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400">0 mins</span>
                            )}
                          </td>

                          {/* Drill-Down Button */}
                          <td className="py-4 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedStaffForModal(staff)}
                              className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              <span>View ({staff.sessions?.length || 0})</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAFF SESSION DETAILS MODAL */}
        {/* ========================================================================= */}
        <Dialog open={Boolean(selectedStaffForModal)} onOpenChange={(open) => !open && setSelectedStaffForModal(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedStaffForModal && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-3">
                    <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                        {selectedStaffForModal.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{selectedStaffForModal.name}</span>
                    </DialogTitle>
                    <Badge className="capitalize font-bold text-xs bg-slate-100 text-slate-700 border-slate-200">
                      {selectedStaffForModal.profession || selectedStaffForModal.role}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-slate-500">
                    Sessions recorded between <span className="font-bold text-slate-700">{reportStartDate}</span> and <span className="font-bold text-slate-700">{reportEndDate}</span>.
                  </DialogDescription>
                </DialogHeader>

                {/* Staff KPI summary strip */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 my-2 text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Planned</span>
                    <span className="text-base font-black text-blue-600 block">{selectedStaffForModal.plannedSessions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Completed</span>
                    <span className="text-base font-black text-purple-600 block">{selectedStaffForModal.completedSessions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Completion Rate</span>
                    <span className="text-base font-black text-emerald-600 block">{selectedStaffForModal.completionRate}%</span>
                  </div>
                </div>

                {/* Session Entries List */}
                <div className="space-y-2 mt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Session Records ({selectedStaffForModal.sessions?.length || 0})
                  </h4>

                  {(!selectedStaffForModal.sessions || selectedStaffForModal.sessions.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-slate-100">
                      No individual calendar sessions recorded in this time frame.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {selectedStaffForModal.sessions.map((sess) => {
                        const isCompleted = sess.status === 'Completed';
                        const isPlanned = sess.status === 'Planned' || sess.status === 'Checked In';

                        return (
                          <div 
                            key={sess.id} 
                            className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {sess.clientName}
                                </span>
                                {sess.uhid && (
                                  <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 py-0 px-1">
                                    {sess.uhid}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                                <span>{sess.serviceType}</span>
                                <span>•</span>
                                <span>{sess.sessionMode}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                  <Clock4 className="w-3 h-3 text-slate-400" />
                                  {sess.scheduledStart ? format(new Date(sess.scheduledStart), "dd MMM yyyy, hh:mm a") : "Time N/A"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <Badge 
                                className={cn(
                                  "font-bold text-[11px] px-2.5 py-0.5 rounded-lg border",
                                  isCompleted ? "bg-purple-50 text-purple-700 border-purple-200" :
                                  isPlanned ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                )}
                              >
                                {sess.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStaffForModal(null)}
                    className="font-bold rounded-xl text-xs h-9"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* AUTOMATION SETTINGS DIALOG */}
        {/* ========================================================================= */}
        <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Mail className="w-5 h-5 text-primary" />
                Automated Daily PDF Email Broadcast
              </DialogTitle>
              <DialogDescription>
                Configure automated daily email delivery of the Activity Tracker report to specific recipients at a scheduled time.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-sm font-black text-slate-900 block">Enable Daily Email Broadcast</span>
                  <span className="text-xs text-slate-500 font-medium block">
                    Automatically send present day's PDF report every day
                  </span>
                </div>
                <Switch
                  checked={isAutomationEnabled}
                  onCheckedChange={setIsAutomationEnabled}
                />
              </div>

              {/* Recipient Emails Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-700">
                  Recipient Email Addresses
                </label>
                <Input
                  placeholder="e.g. hr.head@cssh.com, admin@cssh.com"
                  value={recipientEmails}
                  onChange={e => setRecipientEmails(e.target.value)}
                  className="h-10 rounded-xl font-medium"
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  Separate multiple recipient email addresses with commas.
                </p>
              </div>

              {/* Schedule Time Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-700">
                  Daily Delivery Schedule Time
                </label>
                <Select value={scheduledTime} onValueChange={setScheduledTime}>
                  <SelectTrigger className="h-10 rounded-xl font-medium">
                    <SelectValue placeholder="Select Delivery Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="17:00">05:00 PM (17:00)</SelectItem>
                    <SelectItem value="18:00">06:00 PM (18:00 - End of Shift)</SelectItem>
                    <SelectItem value="19:00">07:00 PM (19:00)</SelectItem>
                    <SelectItem value="20:00">08:00 PM (20:00)</SelectItem>
                    <SelectItem value="21:00">09:00 PM (21:00)</SelectItem>
                    <SelectItem value="22:00">10:00 PM (22:00)</SelectItem>
                    <SelectItem value="23:00">11:00 PM (23:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSendInstantEmail}
                disabled={sendingInstant || !recipientEmails.trim()}
                className="gap-2 font-bold rounded-xl text-xs h-10 border-slate-300"
              >
                <Send className="w-3.5 h-3.5 text-primary" />
                {sendingInstant ? "Sending..." : "Send Instant Email Now"}
              </Button>

              <Button
                type="button"
                onClick={handleSaveAutomation}
                disabled={savingAutomation}
                className="font-bold rounded-xl px-6 text-xs h-10 shadow-sm"
              >
                {savingAutomation ? "Saving..." : "Save Automation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
