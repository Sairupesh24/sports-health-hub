import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Calendar, Activity, TrendingDown, CreditCard, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { title: "Next Appointment", value: "Today", change: "2:00 PM — Dr. Patel", changeType: "neutral" as const, icon: Calendar },
  { title: "Pain Score", value: "3/10", change: "-4 since intake", changeType: "positive" as const, icon: TrendingDown },
  { title: "Sessions Completed", value: 12, change: "6 remaining in plan", changeType: "neutral" as const, icon: Activity },
  { title: "Outstanding Balance", value: "₹3,500", change: "1 pending invoice", changeType: "negative" as const, icon: CreditCard },
];

const upcomingAppointments = [
  { id: "1", date: "Today", time: "2:00 PM", consultant: "Dr. Aarav Patel", type: "Rehab Session" },
  { id: "2", date: "Thu, 6 Mar", time: "10:00 AM", consultant: "Dr. Aarav Patel", type: "ROM Assessment" },
  { id: "3", date: "Mon, 10 Mar", time: "11:00 AM", consultant: "Dr. Sneha Rao", type: "Performance Test" },
];

const recentSessions = [
  { id: "1", date: "25 Feb", consultant: "Dr. Patel", notes: "Pain reduced. Added resistance band exercises.", painScore: 3 },
  { id: "2", date: "20 Feb", consultant: "Dr. Patel", notes: "Good progress on ROM. Continue stretching protocol.", painScore: 4 },
  { id: "3", date: "15 Feb", consultant: "Dr. Rao", notes: "Initial assessment. Moderate ACL strain confirmed.", painScore: 7 },
];

export default function ClientDashboard() {
  return (
    <DashboardLayout role="client">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Welcome, Rahul</h1>
            <p className="text-muted-foreground mt-1">Your recovery is progressing well — keep it up!</p>
          </div>
          <Button className="gradient-primary text-primary-foreground font-semibold">
            <Calendar className="w-4 h-4 mr-2" />
            Book Appointment
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <div className="rounded-xl border border-border bg-card p-5 gradient-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-card-foreground">Upcoming Appointments</h3>
              <button className="text-xs text-primary font-medium hover:underline">View all</button>
            </div>
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-fade-in group hover:bg-primary/5 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{apt.date} at {apt.time}</p>
                    <p className="text-xs text-muted-foreground">{apt.consultant} — {apt.type}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="rounded-xl border border-border bg-card p-5 gradient-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-card-foreground">Recent Sessions</h3>
              <button className="text-xs text-primary font-medium hover:underline">View all</button>
            </div>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div key={session.id} className="p-3 rounded-lg bg-muted/30 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-card-foreground">{session.date} — {session.consultant}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Pain: {session.painScore}/10
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{session.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pain Trend Placeholder */}
        <div className="rounded-xl border border-border bg-card p-5 gradient-card">
          <h3 className="font-display font-semibold text-card-foreground mb-4">Pain Score Trend</h3>
          <div className="h-40 flex items-center justify-center rounded-lg bg-muted/30">
            <div className="text-center text-muted-foreground">
              <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Your pain trend chart will appear here</p>
              <p className="text-xs">Tracking your recovery progress over time</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
