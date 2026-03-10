import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import { Users, Calendar, CreditCard, TrendingUp, Activity, AlertTriangle } from "lucide-react";

const stats = [
  { title: "Active Clients", value: 284, change: "+12 this month", changeType: "positive" as const, icon: Users },
  { title: "Today's Appointments", value: 18, change: "3 pending", changeType: "neutral" as const, icon: Calendar },
  { title: "Monthly Revenue", value: "₹4.2L", change: "+8.2% vs last month", changeType: "positive" as const, icon: CreditCard },
  { title: "No-Show Rate", value: "4.2%", change: "-1.1% improvement", changeType: "positive" as const, icon: AlertTriangle },
];

const activities = [
  { id: "1", title: "New client registered", description: "Rahul Sharma — ACL rehab program", time: "5m ago", type: "client" as const },
  { id: "2", title: "Session completed", description: "Dr. Patel with Ananya — Shoulder ROM", time: "15m ago", type: "session" as const },
  { id: "3", title: "Payment received", description: "₹3,500 — Invoice #1042", time: "1h ago", type: "payment" as const },
  { id: "4", title: "Appointment booked", description: "Vikram Singh — Performance testing", time: "2h ago", type: "appointment" as const },
  { id: "5", title: "New client registered", description: "Priya Menon — Sports physiotherapy", time: "3h ago", type: "client" as const },
];

const schedule = [
  { id: "1", time: "09:00", clientName: "Rahul Sharma", type: "Initial Assessment", status: "confirmed" as const },
  { id: "2", time: "10:00", clientName: "Ananya Iyer", type: "Follow-up Session", status: "confirmed" as const },
  { id: "3", time: "11:30", clientName: "Vikram Singh", type: "Performance Test", status: "pending" as const },
  { id: "4", time: "14:00", clientName: "Priya Menon", type: "Rehab Session", status: "confirmed" as const },
  { id: "5", time: "15:30", clientName: "Arjun Reddy", type: "ROM Assessment", status: "pending" as const },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your organization's performance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Revenue Chart Placeholder */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 gradient-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-card-foreground">Revenue Trend</h3>
              <div className="flex items-center gap-1 text-xs text-success font-medium">
                <TrendingUp className="w-3 h-3" />
                +8.2%
              </div>
            </div>
            <div className="h-48 flex items-center justify-center rounded-lg bg-muted/30">
              <div className="text-center text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Revenue chart will appear here</p>
                <p className="text-xs">Connect data to visualize trends</p>
              </div>
            </div>
          </div>

          {/* Consultant Productivity */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 gradient-card">
            <h3 className="font-display font-semibold text-card-foreground mb-4">Top Consultants</h3>
            <div className="space-y-3">
              {[
                { name: "Dr. Aarav Patel", sessions: 42, rating: 4.9 },
                { name: "Dr. Sneha Rao", sessions: 38, rating: 4.8 },
                { name: "Dr. Karan Mehta", sessions: 35, rating: 4.7 },
                { name: "Dr. Neha Gupta", sessions: 31, rating: 4.9 },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.sessions} sessions this month</p>
                  </div>
                  <span className="text-xs font-medium text-primary">★ {c.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScheduleCard items={schedule} title="Today's Appointments" />
          <RecentActivity items={activities} />
        </div>
      </div>
    </DashboardLayout>
  );
}
