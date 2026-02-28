import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { Users, Calendar, ClipboardList, TrendingUp } from "lucide-react";

const stats = [
  { title: "Assigned Clients", value: 24, change: "+3 this week", changeType: "positive" as const, icon: Users },
  { title: "Today's Sessions", value: 6, change: "2 remaining", changeType: "neutral" as const, icon: Calendar },
  { title: "Sessions This Month", value: 42, change: "+15% vs last month", changeType: "positive" as const, icon: ClipboardList },
  { title: "Avg. Improvement", value: "18%", change: "Pain score reduction", changeType: "positive" as const, icon: TrendingUp },
];

const schedule = [
  { id: "1", time: "09:00", clientName: "Rahul Sharma", type: "ACL Rehab — Week 6", status: "completed" as const },
  { id: "2", time: "10:00", clientName: "Ananya Iyer", type: "Shoulder ROM Follow-up", status: "completed" as const },
  { id: "3", time: "11:30", clientName: "Vikram Singh", type: "Performance Testing", status: "confirmed" as const },
  { id: "4", time: "14:00", clientName: "Priya Menon", type: "Initial Assessment", status: "confirmed" as const },
  { id: "5", time: "15:30", clientName: "Arjun Reddy", type: "ROM Assessment", status: "pending" as const },
  { id: "6", time: "16:30", clientName: "Meera Das", type: "Rehab Session", status: "pending" as const },
];

const activities = [
  { id: "1", title: "SOAP note completed", description: "Rahul Sharma — Pain reduced to 3/10", time: "10m ago", type: "session" as const },
  { id: "2", title: "Program updated", description: "Ananya Iyer — Phase 3 exercises added", time: "30m ago", type: "session" as const },
  { id: "3", title: "New client assigned", description: "Priya Menon — Ankle sprain rehab", time: "1h ago", type: "client" as const },
  { id: "4", title: "Appointment confirmed", description: "Vikram Singh — Performance test", time: "2h ago", type: "appointment" as const },
];

export default function ConsultantDashboard() {
  return (
    <DashboardLayout role="consultant">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Good Morning, Dr. Patel</h1>
          <p className="text-muted-foreground mt-1">You have 4 sessions remaining today</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ScheduleCard items={schedule} title="My Schedule Today" />
          </div>
          <RecentActivity items={activities} />
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5 gradient-card">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Start Session", icon: ClipboardList },
              { label: "Add SOAP Note", icon: ClipboardList },
              { label: "View Schedule", icon: Calendar },
              { label: "Client List", icon: Users },
            ].map((action) => (
              <button
                key={action.label}
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all text-center group"
              >
                <action.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium text-card-foreground">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
