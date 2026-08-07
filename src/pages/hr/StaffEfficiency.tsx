import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
  Users, UserCheck, Search, Filter, Sparkles, CheckCircle2, FileText, UserPlus
} from "lucide-react";
import { format, addDays, subDays, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

interface StaffMetric {
  id: string;
  name: string;
  email: string;
  role: string;
  profession: string;
  activeMinutes: number;
  clockInTime: string | null;
  clockOutTime: string | null;
  status: string;
  sessionsCount: number;
  registrationsCount: number;
}

export default function StaffEfficiency() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: response, isLoading } = useQuery<{ date: string; data: StaffMetric[] }>({
    queryKey: ["staff-efficiency-metrics", dateStr, profile?.organization_id],
    queryFn: async () => {
      return await apiFetch<{ date: string; data: StaffMetric[] }>(`/hr/staff-efficiency?date=${dateStr}`);
    },
  });

  const staffMetrics = response?.data || [];

  // Filter staff members
  const filteredStaff = staffMetrics.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.profession.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = 
      roleFilter === "all" ||
      staff.role.toLowerCase() === roleFilter.toLowerCase() ||
      staff.profession.toLowerCase().includes(roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Calculate Aggregates
  const totalActiveMinutes = staffMetrics.reduce((sum, s) => sum + (s.activeMinutes || 0), 0);
  const totalActiveHours = (totalActiveMinutes / 60).toFixed(1);
  const totalSessions = staffMetrics.reduce((sum, s) => sum + (s.sessionsCount || 0), 0);
  const totalRegistrations = staffMetrics.reduce((sum, s) => sum + (s.registrationsCount || 0), 0);
  const activeStaffCount = staffMetrics.filter(s => s.status === 'Present' || s.activeMinutes > 0).length;

  const formatMinutes = (mins: number) => {
    if (!mins || mins <= 0) return "0 mins";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs === 0) return `${remainingMins} mins`;
    return `${hrs}h ${remainingMins}m (${mins} mins)`;
  };

  const getRoleBadgeStyle = (role: string, profession: string) => {
    const p = (profession || role).toLowerCase();
    if (p.includes("scientist")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (p.includes("physician") || p.includes("doctor")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (p.includes("physio")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (p.includes("nutrition")) return "bg-teal-50 text-teal-700 border-teal-200";
    if (p.includes("foe") || p.includes("front")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (p.includes("admin")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-7xl mx-auto pb-32 sm:pb-12 px-2 sm:px-4">
        {/* Header & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Staff Console Activity & Performance Analytics
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Track console active time in minutes, sessions conducted, and client registrations per staff member.
            </p>
          </div>
        </div>

        {/* Date Navigator Bar */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white p-3 sm:p-4">
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
                  Today's Live Analytics
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
        </Card>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-100 shadow-sm rounded-2xl p-4 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Active Console Time</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{totalActiveMinutes} <span className="text-xs font-bold text-slate-500">mins</span></h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium pt-1">
              Equivalent to {totalActiveHours} total staff hours
            </p>
          </Card>

          <Card className="border border-slate-100 shadow-sm rounded-2xl p-4 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sessions & Entries Done</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{totalSessions} <span className="text-xs font-bold text-slate-500">entries</span></h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium pt-1">
              By Sports Scientists, Physios & Physicians
            </p>
          </Card>

          <Card className="border border-slate-100 shadow-sm rounded-2xl p-4 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Registrations Processed</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{totalRegistrations} <span className="text-xs font-bold text-slate-500">users</span></h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium pt-1">
              Client & athlete registrations by FOE & Admin
            </p>
          </Card>

          <Card className="border border-slate-100 shadow-sm rounded-2xl p-4 bg-white space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">On-Duty Active Staff</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{activeStaffCount} <span className="text-xs font-bold text-slate-500">staff</span></h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold pt-1">
              Clocked in or logged console activity
            </p>
          </Card>
        </div>

        {/* Search & Filter Control Bar */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search staff by name, email, or profession..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl font-medium"
              />
            </div>

            <div className="w-full sm:w-56">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Filter by Profession" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Professions & Roles</SelectItem>
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

        {/* Staff Metrics Table */}
        <Card className="border border-slate-200 shadow-md rounded-2xl bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Staff Console Performance Table ({filteredStaff.length} Members)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Date: {format(selectedDate, "dd MMM yyyy")}</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-medium text-sm">
              Loading staff activity metrics...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium text-sm">
              No staff metrics found matching search/filter for {format(selectedDate, "dd MMM yyyy")}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role / Profession</th>
                    <th className="py-3 px-4">Console Active Time</th>
                    <th className="py-3 px-4 text-center">Sessions Done</th>
                    <th className="py-3 px-4 text-center">Registrations Done</th>
                    <th className="py-3 px-4 text-right">Duty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredStaff.map(staff => {
                    const shiftProgressPercent = Math.min(100, Math.round((staff.activeMinutes / 480) * 100));

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Staff Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs flex-shrink-0">
                              {staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block text-xs sm:text-sm">{staff.name}</span>
                              <span className="text-[11px] text-slate-400 block">{staff.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role / Profession Badge */}
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg border", getRoleBadgeStyle(staff.role, staff.profession))}>
                            {staff.profession || staff.role}
                          </Badge>
                        </td>

                        {/* Console Active Time */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-slate-900">{formatMinutes(staff.activeMinutes)}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{shiftProgressPercent}% of 8h shift</span>
                            </div>
                            <Progress value={shiftProgressPercent} className="h-1.5 rounded-full" />
                          </div>
                        </td>

                        {/* Sessions Done */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge className={cn("font-black text-xs px-3 py-1 rounded-xl border-none", staff.sessionsCount > 0 ? "bg-purple-500 text-white shadow-sm" : "bg-slate-100 text-slate-400")}>
                            {staff.sessionsCount} Sessions
                          </Badge>
                        </td>

                        {/* Registrations Done */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge className={cn("font-black text-xs px-3 py-1 rounded-xl border-none", staff.registrationsCount > 0 ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-400")}>
                            {staff.registrationsCount} Registrations
                          </Badge>
                        </td>

                        {/* Duty Status & Clock In/Out */}
                        <td className="py-3.5 px-4 text-right">
                          {staff.clockInTime ? (
                            <div>
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-none font-bold text-[10px] uppercase px-2 py-0.5">
                                Clocked In: {format(new Date(staff.clockInTime), "hh:mm a")}
                              </Badge>
                              {staff.clockOutTime && (
                                <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">
                                  Out: {format(new Date(staff.clockOutTime), "hh:mm a")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 font-semibold text-[10px] uppercase">
                              Not Clocked In
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
