import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  Activity, 
  ChevronRight,
  Star,
  Zap,
  Flame,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AmsFeed() {
  const feedItems = [
    {
      id: 1,
      user: "Rahul S.",
      action: "recorded a new PR in Back Squat",
      value: "145 KG",
      time: "10 mins ago",
      type: "pr",
      avatar: "RS"
    },
    {
      id: 2,
      user: "Sairupesh",
      action: "completed Day 4 of Explosive Power",
      value: "95% Compliance",
      time: "25 mins ago",
      type: "completion",
      avatar: "SR"
    },
    {
      id: 3,
      user: "Badminton Squad",
      action: "average readiness peaking",
      value: "8.4 / 10",
      time: "1 hour ago",
      type: "team",
      avatar: "BS"
    }
  ];

  const leaderboard = [
    { name: "Rahul S.", points: 1250, streak: 14, rank: 1, trend: "up" },
    { name: "Priya K.", points: 1120, streak: 8, rank: 2, trend: "up" },
    { name: "Sairupesh", points: 980, streak: 12, rank: 3, trend: "down" },
    { name: "Amit B.", points: 850, streak: 5, rank: 4, trend: "neutral" },
  ];

  return (
    <DashboardLayout role="coach">
      <AmsStaffNav />
      
      <main className="container mx-auto py-8 space-y-8 max-w-7xl px-4 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">AMS Community Feed</h1>
            <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mt-1">Real-time performance stream & squad rankings</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1.5 h-8 px-3">
              <Flame className="w-3.5 h-3.5 fill-current" /> 12 Active Streaks
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Feed Column */}
          <div className="lg:col-span-8 space-y-6">
            {feedItems.map((item) => (
              <Card key={item.id} className="group overflow-hidden glass-card border-none shadow-sm hover:shadow-md transition-all rounded-[32px]">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                      <AvatarImage src="" />
                      <AvatarFallback className="font-black bg-slate-50 text-slate-400">{item.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-900">
                          {item.user} <span className="text-muted-foreground font-medium">{item.action}</span>
                        </p>
                        <span className="text-[10px] uppercase font-black text-muted-foreground/40">{item.time}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3">
                        <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                          {item.type === 'pr' ? (
                            <Trophy className="w-4 h-4 text-amber-500" />
                          ) : item.type === 'completion' ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <Users className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className="font-black text-sm italic">{item.value}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-xl h-10 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
                           <MessageSquare className="w-4 h-4" /> 2
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-xl h-10 gap-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5">
                           <Heart className="w-4 h-4" /> 15
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button variant="ghost" className="w-full h-16 rounded-[24px] border-2 border-dashed border-slate-200 font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all">
              Load More Activity
            </Button>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">
            {/* Squad Leaderboard */}
            <Card className="rounded-[32px] border-none shadow-xl shadow-primary/5 overflow-hidden">
               <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                       <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Top Performers</CardTitle>
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase opacity-60 italic">Weekly Rankings</p>
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {leaderboard.map((athlete, i) => (
                      <div key={i} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                           <span className={cn(
                             "w-6 text-center font-black italic text-lg",
                             athlete.rank === 1 ? "text-amber-500" : "text-slate-300"
                           )}>
                             {athlete.rank}
                           </span>
                           <div>
                              <p className="font-bold text-slate-800">{athlete.name}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{athlete.streak} Day Streak</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="font-black italic text-slate-900">{athlete.points}</p>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase">XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4">
                    <Button variant="ghost" className="w-full text-xs font-black uppercase tracking-widest hover:text-primary">
                       View All Standings <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
               </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="glass-card rounded-[32px] p-6 space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2 px-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Squad Insights
               </h3>
               <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
                     <span className="text-xs font-bold text-slate-600">Total Volume (Week)</span>
                     <span className="font-black italic">42.5 T</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
                     <span className="text-xs font-bold text-slate-600">Avg Compliance</span>
                     <span className="font-black italic text-primary">88%</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}

function Heart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
