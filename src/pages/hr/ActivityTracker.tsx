import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Activity, ChevronLeft, ChevronRight, Search, Download, Mail, Send, Clock, Sparkles } from "lucide-react";
import { format, addDays, subDays, isToday } from "date-fns";
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
  registrationsCount: number;
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  // Automation Modal State
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState("");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [sendingInstant, setSendingInstant] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch Activity Metrics
  const { data: response, isLoading } = useQuery<{ date: string; data: StaffActivity[] }>({
    queryKey: ["activity-tracker-metrics", dateStr, profile?.organization_id],
    queryFn: async () => {
      return await apiFetch<{ date: string; data: StaffActivity[] }>(`/hr/activity-tracker?date=${dateStr}`);
    },
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

  const staffActivities = response?.data || [];

  // Filter staff members by search query and role filter
  const filteredStaff = staffActivities.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.profession || "").toLowerCase().includes(searchQuery.toLowerCase());

    const p = (staff.profession || staff.role || "").toLowerCase();
    const matchesRole = 
      roleFilter === "all" ||
      staff.role.toLowerCase() === roleFilter.toLowerCase() ||
      p.includes(roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  const formatActiveTime = (mins: number) => {
    if (!mins || mins <= 0) return "0 mins";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs === 0) return `${remainingMins} mins`;
    return `${hrs}h ${remainingMins}m (${mins} mins)`;
  };

  // Export Table to PDF
  const handleExportPDF = async () => {
    const element = document.getElementById("activity-tracker-table-container");
    if (!element) return;

    try {
      setExporting(true);
      toast({ title: "Generating PDF Report...", description: "Preparing document download." });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Add Document Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("Center for Spine & Sports Health (CSSH)", 14, 15);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(13, 148, 136);
      pdf.text("Staff Activity Tracker & Performance Report", 14, 22);

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
      pdf.save(`Staff_Activity_Tracker_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF Report Saved ✓", description: "Downloaded Activity Tracker PDF file." });
    } catch (err: any) {
      console.error("Failed to export PDF:", err);
      toast({ title: "Export Error", description: "Could not generate PDF file.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
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
        {/* Header with Automation & Export Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Activity Tracker
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Daily staff application active time, sessions conducted, and client registrations.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

            {/* Export PDF Button */}
            <Button
              onClick={handleExportPDF}
              disabled={exporting || filteredStaff.length === 0}
              className="gap-2 font-bold rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm h-10 px-4"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Generating PDF..." : "Export PDF Report"}
            </Button>
          </div>
        </div>

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
              {isToday(selectedDate) && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest mt-0.5">
                  Today's Live Activity
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

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs font-black rounded-xl h-9 px-3 hidden xs:flex flex-shrink-0"
            >
              Today
            </Button>
          </div>

          {/* Search & Role Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search staff by name or profession..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl font-medium"
              />
            </div>

            <div className="sm:col-span-1">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 rounded-xl font-medium">
                  <SelectValue placeholder="Filter by Role / Profession" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles & Professions</SelectItem>
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

        {/* Simple Activity Table Container */}
        <Card id="activity-tracker-table-container" className="border border-slate-200 shadow-md rounded-2xl bg-white overflow-hidden p-1">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-medium text-sm">
              Loading staff activity data...
            </div>
          ) : filteredStaff.length === 0 ? (
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
                    <th className="py-3.5 px-4 text-center">Sessions Conducted</th>
                    <th className="py-3.5 px-4 text-center">Registrations Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredStaff.map(staff => (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Column 1: Staff Member */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{staff.name}</span>
                          <span className="text-xs text-slate-500 font-semibold block capitalize">
                            {staff.profession || staff.role}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Active Time Spent on Application */}
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

                      {/* Column 3: Sessions Conducted */}
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

                      {/* Column 4: Registrations Done */}
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

        {/* Automation Settings Dialog */}
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
