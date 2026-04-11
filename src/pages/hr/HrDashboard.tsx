import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Users, 
  ClipboardList, 
  Calendar, 
  UserCheck,
  TrendingUp,
  Clock,
  Briefcase
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HrDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();


  const { data: stats } = useQuery({
    queryKey: ["hr-dashboard-stats", profile?.organization_id],
    queryFn: async () => {
      const [empCount, pendingLeaves, approvalCount] = await Promise.all([
        supabase.from("hr_employees").select("*", { count: "exact", head: true }).eq("organization_id", profile?.organization_id),
        supabase.from("hr_leaves").select("*", { count: "exact", head: true }).eq("organization_id", profile?.organization_id).eq("status", "Requested"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", profile?.organization_id).eq("is_approved", false)
      ]);

      return {
        totalEmployees: empCount.count || 0,
        pendingLeaves: pendingLeaves.count || 0,
        pendingApprovals: approvalCount.count || 0,
      };
    },
    enabled: !!profile?.organization_id,
  });

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">HRMS Console</h1>
            <p className="text-slate-500 mt-1">Unified human resource management and staff operations.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">HR System Online</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
             <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Total Staff</CardTitle>
             </CardHeader>
             <CardContent className="relative z-10">
                <div className="text-3xl font-display font-bold text-slate-900">{stats?.totalEmployees || 0}</div>
                <div className="flex items-center gap-2 mt-1">
                   <Users className="w-4 h-4 text-blue-400" />
                   <span className="text-xs font-semibold text-slate-500">Active Employees</span>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
             <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">Pending Leaves</CardTitle>
             </CardHeader>
             <CardContent className="relative z-10">
                <div className="text-3xl font-display font-bold text-slate-900">{stats?.pendingLeaves || 0}</div>
                <div className="flex items-center gap-2 mt-1">
                   <Clock className="w-4 h-4 text-orange-400" />
                   <span className="text-xs font-semibold text-slate-500">Awaiting Approval</span>
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
             <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-600">User Approvals</CardTitle>
             </CardHeader>
             <CardContent className="relative z-10">
                <div className="text-3xl font-display font-bold text-slate-900">{stats?.pendingApprovals || 0}</div>
                <div className="flex items-center gap-2 mt-1">
                   <UserCheck className="w-4 h-4 text-purple-400" />
                   <span className="text-xs font-semibold text-slate-500">New Onboarding Tasks</span>
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
             <CardHeader className="p-8 border-b border-slate-50">
               <CardTitle className="text-xl font-display font-bold text-slate-900">Recent Employee Activities</CardTitle>
               <CardDescription>Latest joinings and contract updates</CardDescription>
             </CardHeader>
             <CardContent className="p-0 h-[400px] flex items-center justify-center bg-slate-50/50">
                 <div className="text-center space-y-3">
                   <Briefcase className="w-10 h-10 text-slate-200 mx-auto" />
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Recent Activity Logged</p>
                 </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-2xl overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
             <CardHeader className="p-8 relative z-10">
               <CardTitle className="text-xl font-display font-bold">HR Management Hub</CardTitle>
               <CardDescription className="text-slate-400">Quick access to essential HR tools</CardDescription>
             </CardHeader>
             <CardContent className="p-8 pt-0 relative z-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: 'Add Employee', icon: UserCheck, color: 'bg-emerald-500/20 text-emerald-400' },
                     { label: 'Attendance Logs', icon: Clock, color: 'bg-indigo-500/20 text-indigo-400', path: '/hr/attendance-logs' },
                     { label: 'Issue Contract', icon: ClipboardList, color: 'bg-blue-500/20 text-blue-400' },
                     { label: 'Holiday Calendar', icon: Calendar, color: 'bg-orange-500/20 text-orange-400' },
                     { label: 'Org Chart', icon: TrendingUp, color: 'bg-purple-500/20 text-purple-400' },
                   ].map((tool, idx) => (
                     <div 
                       key={idx} 
                       className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                       onClick={() => (tool as any).path && navigate((tool as any).path)}
                     >
                        <tool.icon className={cn("w-6 h-6 mb-3 transition-transform group-hover:scale-110", tool.color)} />
                        <span className="text-sm font-bold block">{tool.label}</span>
                     </div>
                   ))}
                </div>
                <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
                   <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                     "Employee engagement is the art and science of winning over the hearts and minds of your employees to get them to deliver peak performance."
                   </p>
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
