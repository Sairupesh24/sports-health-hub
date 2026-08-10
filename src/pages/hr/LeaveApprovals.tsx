import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PostNoticeModal from "@/components/shared/PostNoticeModal";
import {
  CheckCircle2, XCircle, Clock, Calendar, Loader2,
  User, ChevronDown, Filter, AlertTriangle, Edit3, Settings, ShieldAlert, Megaphone, Search
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual_leave: "Casual Leave",
  sick_leave: "Sick / Medical Leave",
  annual_leave: "Annual Leave",
  personal: "Personal Leave",
  maternity_leave: "Maternity / Paternity",
  bereavement: "Bereavement Leave",
  compensation_off: "Comp-Off",
};

const STATUS_FILTERS = ["All", "Requested", "Approved", "Rejected"] as const;

export default function LeaveApprovals() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"requests" | "quotas">("requests");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("Requested");
  const [postNoticeOpen, setPostNoticeOpen] = useState(false);
  const orgId = profile?.organization_id;

  // Edit Quota state
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [casualInput, setCasualInput] = useState<number>(12);
  const [sickInput, setSickInput] = useState<number>(4);
  const [paidInput, setPaidInput] = useState<number>(0);
  const [emergencyInput, setEmergencyInput] = useState<number>(0);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);

  // Search & Role Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch leave requests with employee profile
  const { data: leaves, isLoading: leavesLoading } = useQuery({
    queryKey: ["hr-leave-requests", orgId, statusFilter],
    queryFn: async () => {
      const status = statusFilter === "All" ? "" : statusFilter;
      const response = await apiFetch<any>(`/hr/leaves?status=${status}`);
      const data = response.data || [];

      return data.map((leave: any) => ({
        ...leave,
        employee: { first_name: leave.first_name, last_name: leave.last_name, profession: leave.profession },
      }));
    },
    enabled: !!orgId,
  });

  // Fetch all employee leave balances for HR
  const { data: employeeBalances, isLoading: balancesLoading } = useQuery({
    queryKey: ["hr-all-leave-balances", orgId],
    queryFn: async () => {
      const response = await apiFetch<any>('/hr/leave-balances?all=true');
      return response.data || [];
    },
    enabled: !!orgId && activeTab === "quotas",
  });

  // Filtered Leave Requests
  const filteredLeaves = leaves?.filter((leave: any) => {
    const empName = `${leave.employee?.first_name || ""} ${leave.employee?.last_name || ""}`.toLowerCase();
    const profession = (leave.employee?.profession || "").toLowerCase();
    const reason = (leave.reason || "").toLowerCase();

    const matchesSearch = 
      empName.includes(searchQuery.toLowerCase()) ||
      profession.includes(searchQuery.toLowerCase()) ||
      reason.includes(searchQuery.toLowerCase());

    const matchesRole = 
      roleFilter === "all" ||
      profession.includes(roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Filtered Employee Leave Balances
  const filteredEmployeeBalances = employeeBalances?.filter((emp: any) => {
    const empName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
    const email = (emp.email || "").toLowerCase();
    const profession = (emp.profession || emp.role || "").toLowerCase();

    const matchesSearch = 
      empName.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase()) ||
      profession.includes(searchQuery.toLowerCase());

    const matchesRole = 
      roleFilter === "all" ||
      (emp.role || "").toLowerCase() === roleFilter.toLowerCase() ||
      profession.includes(roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Approve / Reject mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "Approved" | "Rejected" }) => {
      await apiFetch(`/hr/leaves/${id}`, {
        method: 'PATCH',
        data: { status }
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hr-all-leave-balances"] });
      toast({
        title: status === "Approved" ? "Leave Approved ✓" : "Leave Rejected",
        description: status === "Approved"
          ? "The request has been approved and leave balance updated."
          : "The request has been rejected.",
      });
    },
    onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  // Save employee leave quota mutation
  const saveQuotaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmp) return;
      await apiFetch(`/hr/leave-balances/${selectedEmp.employee_id}`, {
        method: 'PUT',
        data: {
          casual_leave: casualInput,
          sick_leave: sickInput,
          paid_leave: paidInput,
          emergency_leave: emergencyInput
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-all-leave-balances"] });
      toast({
        title: "Leave Quotas Updated",
        description: `Successfully updated leave allocations for ${selectedEmp?.first_name} ${selectedEmp?.last_name}.`
      });
      setQuotaModalOpen(false);
    },
    onError: (err: any) => toast({ title: "Failed to Update Quotas", description: err.message, variant: "destructive" }),
  });

  const handleOpenEditQuota = (emp: any) => {
    setSelectedEmp(emp);
    setCasualInput(emp.casual_leave ?? 12);
    setSickInput(emp.sick_leave ?? 4);
    setPaidInput(emp.paid_leave ?? 0);
    setEmergencyInput(emp.emergency_leave ?? 0);
    setQuotaModalOpen(true);
  };

  const leaveDays = (leave: any) =>
    differenceInCalendarDays(parseISO(leave.end_date), parseISO(leave.start_date)) + 1;

  const pendingCount = leaves?.filter((l: any) => l.status === "Requested").length || 0;

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Leave & Quota Management</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Review leave requests, configure employee quotas, track LOP, and post official notices
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setPostNoticeOpen(true)}
              className="font-bold rounded-xl gap-2 shadow-md bg-primary hover:bg-primary/90 text-xs sm:text-sm h-10"
            >
              <Megaphone className="w-4 h-4" />
              Post Employee Notice
            </Button>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="font-black text-xs sm:text-sm">{pendingCount} Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="requests" className="font-bold rounded-lg gap-2">
              <Calendar className="w-4 h-4" />
              Leave Requests
              {pendingCount > 0 && (
                <span className="ml-1 bg-amber-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="quotas" className="font-bold rounded-lg gap-2">
              <Settings className="w-4 h-4" />
              Employee Leave Quotas & LOP
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: LEAVE REQUESTS */}
          <TabsContent value="requests" className="mt-4 space-y-4">
            {/* Status Filter buttons */}
            <div className="flex gap-2">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                    statusFilter === f
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {leavesLoading ? (
              <div className="flex justify-center p-16">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            ) : filteredLeaves?.length === 0 ? (
              <div className="text-center p-16 rounded-2xl border border-dashed bg-white">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-200 mb-4" />
                <p className="font-black text-slate-600 text-lg">No Matching Requests</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {statusFilter === "Requested" ? "No pending leave requests found." : "No requests found matching your filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeaves?.map((leave: any) => (
                  <div
                    key={leave.id}
                    className={cn(
                      "rounded-2xl border bg-white p-5 transition-all hover:shadow-md",
                      leave.status === "Requested" && "border-amber-200 bg-amber-50/30"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Employee Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                          {leave.employee?.first_name?.[0]}{leave.employee?.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900">
                            {leave.employee?.first_name} {leave.employee?.last_name}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                            {leave.employee?.profession || "Staff"}
                          </p>
                        </div>
                      </div>

                      {/* Leave Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-bold capitalize">
                            {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type?.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs font-bold text-slate-500">
                            {format(parseISO(leave.start_date), "dd MMM")}
                            {leave.end_date !== leave.start_date
                              ? ` – ${format(parseISO(leave.end_date), "dd MMM yyyy")}`
                              : `, ${format(parseISO(leave.start_date), "yyyy")}`}
                          </span>
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {leaveDays(leave)} day{leaveDays(leave) !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {leave.reason && (
                          <p className="text-xs text-slate-500 italic mt-1.5">"{leave.reason}"</p>
                        )}
                      </div>

                      {/* Status / Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {leave.status === "Requested" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: leave.id, status: "Rejected" })}
                              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 font-bold rounded-xl"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: leave.id, status: "Approved" })}
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200"
                            >
                              {updateMutation.isPending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Approve
                            </Button>
                          </>
                        ) : (
                          <Badge className={cn(
                            "font-black px-3 py-1 text-xs capitalize rounded-xl",
                            leave.status === "Approved"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {leave.status === "Approved" ? "✓ Approved" : "✗ Rejected"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: EMPLOYEE LEAVE QUOTAS & LOP */}
          <TabsContent value="quotas" className="mt-4 space-y-4">
            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900">Annual Employee Leave Allocations</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure annual leave quotas per employee. Default rules: Casual (12/yr - 1/mo), Sick (4/yr - 1/3mo), Paid (0), Emergency (0). Extra leaves taken are calculated as <b>Loss of Pay (LOP)</b>.
                    </p>
                  </div>
                </div>

                {/* Search Bar & Role Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="relative sm:col-span-2">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input
                      placeholder="Search employee by name, email, or profession..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 rounded-xl font-medium bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-10 rounded-xl font-medium bg-white">
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
              </CardHeader>
              <CardContent className="p-0">
                {balancesLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredEmployeeBalances?.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium text-sm">
                    No staff members match the selected search or role filter.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredEmployeeBalances?.map((emp: any) => (
                      <div key={emp.employee_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-sm">
                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.profession || emp.email}</p>
                          </div>
                        </div>

                        {/* Quota & Used Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center text-xs">
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 text-center">
                            <p className="text-[10px] font-black uppercase text-blue-600">Casual</p>
                            <p className="font-black text-blue-900 text-sm">{emp.used?.casual || 0} / {emp.casual_leave}</p>
                            <p className="text-[9px] text-blue-500 font-medium">1 / mo default</p>
                          </div>

                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-center">
                            <p className="text-[10px] font-black uppercase text-emerald-600">Sick</p>
                            <p className="font-black text-emerald-900 text-sm">{emp.used?.sick || 0} / {emp.sick_leave}</p>
                            <p className="text-[9px] text-emerald-500 font-medium">1 / 3mo default</p>
                          </div>

                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-2 text-center">
                            <p className="text-[10px] font-black uppercase text-purple-600">Paid</p>
                            <p className="font-black text-purple-900 text-sm">{emp.used?.paid || 0} / {emp.paid_leave}</p>
                          </div>

                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2 text-center">
                            <p className="text-[10px] font-black uppercase text-amber-600">Emergency</p>
                            <p className="font-black text-amber-900 text-sm">{emp.used?.emergency || 0} / {emp.emergency_leave}</p>
                          </div>

                          <div className={cn(
                            "rounded-xl p-2 text-center border font-bold",
                            (emp.used?.lop || 0) > 0
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          )}>
                            <div className="flex items-center justify-center gap-1">
                              {(emp.used?.lop || 0) > 0 && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                              <p className="text-[10px] font-black uppercase">LOP Days</p>
                            </div>
                            <p className="font-black text-sm">{emp.used?.lop || 0} days</p>
                          </div>
                        </div>

                        {/* Edit Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditQuota(emp)}
                          className="gap-1.5 rounded-xl font-bold border-slate-200 hover:border-slate-400"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-primary" />
                          Set Quota
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Quota Dialog */}
        <Dialog open={quotaModalOpen} onOpenChange={setQuotaModalOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="font-black text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Set Annual Leave Quotas
              </DialogTitle>
              <DialogDescription>
                Configure yearly leave allocations for <b>{selectedEmp?.first_name} {selectedEmp?.last_name}</b>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Casual Leave (Days/Yr)</label>
                <Input
                  type="number"
                  min="0"
                  value={casualInput}
                  onChange={e => setCasualInput(parseInt(e.target.value) || 0)}
                  className="rounded-xl font-bold"
                />
                <p className="text-[10px] text-muted-foreground">Default: 12 days (1/mo)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Sick Leave (Days/Yr)</label>
                <Input
                  type="number"
                  min="0"
                  value={sickInput}
                  onChange={e => setSickInput(parseInt(e.target.value) || 0)}
                  className="rounded-xl font-bold"
                />
                <p className="text-[10px] text-muted-foreground">Default: 4 days (1/3mo)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Paid Leave (Days/Yr)</label>
                <Input
                  type="number"
                  min="0"
                  value={paidInput}
                  onChange={e => setPaidInput(parseInt(e.target.value) || 0)}
                  className="rounded-xl font-bold"
                />
                <p className="text-[10px] text-muted-foreground">Default: 0 days</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Emergency Leave (Days/Yr)</label>
                <Input
                  type="number"
                  min="0"
                  value={emergencyInput}
                  onChange={e => setEmergencyInput(parseInt(e.target.value) || 0)}
                  className="rounded-xl font-bold"
                />
                <p className="text-[10px] text-muted-foreground">Default: 0 days</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setQuotaModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => saveQuotaMutation.mutate()}
                disabled={saveQuotaMutation.isPending}
                className="font-bold gap-2 px-5"
              >
                {saveQuotaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Allocations
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PostNoticeModal
          open={postNoticeOpen}
          onOpenChange={setPostNoticeOpen}
        />
      </div>
    </DashboardLayout>
  );
}
