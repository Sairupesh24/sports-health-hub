import { useState, useEffect, useRef } from "react";
import { format, isToday, subDays } from "date-fns";
import { AlertCircle, CheckCircle2, User, Activity as ActivityIcon, FileText } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { calculateACWR, calculateAcuteLoad, calculateChronicLoad } from "@/lib/ams-math";
import WorkloadChart from "@/components/ams/charts/WorkloadChart";
import WellnessRadarChart from "@/components/ams/charts/WellnessRadarChart";
import ReturnToPlayChart from "@/components/ams/charts/ReturnToPlayChart";
import SorenessHeatmap from "@/components/ams/SorenessHeatmap";
import { DocumentManager } from "@/components/admin/documents/DocumentManager";
import { useAuth } from "@/contexts/AuthContext";



interface AthleteListProps {
  athletes: any[];
  dateRange: DateRange | undefined;
}

export default function AthleteList({ athletes, dateRange }: AthleteListProps) {
  const { roles, profile: currentUserProfile } = useAuth();
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const toastedRef = useRef<Set<string>>(new Set());

  const isAdmin = roles.includes('admin');
  const isClinicalSpecialist = currentUserProfile?.profession === 'Sports Physician' || 
                                 currentUserProfile?.profession === 'Physiotherapist' ||
                                 roles.includes('sports_physician') || 
                                 roles.includes('physiotherapist') ||
                                 roles.includes('consultant');
  const canAccessDocuments = isAdmin || isClinicalSpecialist;

  useEffect(() => {
    if (!athletes) return;
    athletes.forEach(athlete => {
      const acute = calculateAcuteLoad(athlete.training_sessions || [], new Date());
      const chronic = calculateChronicLoad(athlete.training_sessions || [], new Date());
      const acwr = calculateACWR(acute, chronic);
      
      if (acwr > 1.5 && !toastedRef.current.has(athlete.id)) {
        toast.error(`High Workload Warning: ${athlete.full_name} (ACWR: ${acwr})`, {
          description: "Athlete is in the Danger Zone (> 1.5). Please adjust training load.",
          duration: Number.POSITIVE_INFINITY, // Important enough to remain
          action: {
            label: "Review",
            onClick: () => setSelectedAthlete(athlete)
          }
        });
        toastedRef.current.add(athlete.id);
      }
    });
  }, [athletes]);

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-[200px] font-black text-[10px] uppercase tracking-widest py-6 pl-8">Name</TableHead>
              <TableHead className="text-center font-black text-[10px] uppercase tracking-widest py-6">
                <div className="mb-2 text-slate-800">Exercises Completed</div>
                <div className="grid grid-cols-4 gap-2 text-[8px] text-muted-foreground font-medium">
                  <span>Mar 2-8</span>
                  <span>Mar 9-15</span>
                  <span>Mar 16-22</span>
                  <span>Mar 23-29</span>
                </div>
              </TableHead>
              <TableHead className="text-center font-black text-[10px] uppercase tracking-widest py-6">
                 <div className="mb-2 text-slate-800">Days Left</div>
                 <div className="text-[8px] text-muted-foreground font-medium uppercase">To last workout</div>
              </TableHead>
              <TableHead className="text-center font-black text-[10px] uppercase tracking-widest py-6 pr-8">
                <div className="mb-2 text-slate-800">Questionnaire Alerts</div>
                <div className="grid grid-cols-2 gap-2 text-[8px] text-muted-foreground font-medium px-8 uppercase">
                  <span>Yesterday</span>
                  <span>Today</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes?.map((athlete: any) => {
              const today = new Date();
              const yesterday = subDays(today, 1);
              
              const todayLog = athlete.wellness_logs?.find((log: any) => isToday(new Date(log.created_at)));
              const yesterdayLog = athlete.wellness_logs?.find((log: any) => 
                format(new Date(log.created_at), 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')
              );
 
              // Calculate Days Left since last workout
              const lastSession = athlete.training_sessions?.length > 0 
                ? new Date(Math.max(...athlete.training_sessions.map((s: any) => new Date(s.created_at).getTime())))
                : null;
              
              const daysLeft = lastSession 
                ? Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
 
              return (
                <TableRow 
                  key={athlete.id} 
                  className="group cursor-pointer hover:bg-slate-50/80 transition-all border-slate-100"
                  onClick={() => setSelectedAthlete(athlete)}
                >
                  <TableCell className="py-4 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary border-2 border-white shadow-sm ring-1 ring-primary/5">
                        {athlete.first_name?.[0]}{athlete.last_name?.[0] || athlete.full_name?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{athlete.full_name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{athlete.position}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="grid grid-cols-4 gap-2 px-4">
                       <CompletionBubble count={Math.floor(Math.random() * 15)} /> {/* Mock data for week view */}
                       <CompletionBubble count={0} />
                       <CompletionBubble count={Math.floor(Math.random() * 10)} />
                       <CompletionBubble count={athlete.training_sessions?.length || 0} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-4 font-bold text-slate-600">
                    {daysLeft}
                  </TableCell>
                  <TableCell className="py-4 pr-8">
                     <div className="grid grid-cols-2 gap-2 px-8">
                        <div className="flex justify-center">
                          {yesterdayLog ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border border-dashed border-slate-300" />}
                        </div>
                        <div className="flex justify-center">
                          {todayLog ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-amber-500/30 animate-pulse" />}
                        </div>
                     </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {(!athletes || athletes.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                    <ActivityIcon className="w-8 h-8 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="font-bold uppercase tracking-widest text-muted-foreground/40 text-xs">No Athletes Assigned to this Environment</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
 
      {/* Individual Athlete Drill-down Modal */}
      <Dialog open={!!selectedAthlete} onOpenChange={(open) => !open && setSelectedAthlete(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full md:w-[90vw] glass border-none">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-primary" />
              {selectedAthlete?.full_name}'s Analytics
            </DialogTitle>
          </DialogHeader>
          
          {selectedAthlete && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              <div className="lg:col-span-2">
                <ReturnToPlayChart athleteId={selectedAthlete.id} />
              </div>
              
              {/* Soreness Heatmap Section */}
              {selectedAthlete.wellness_logs?.[0]?.soreness_data && (selectedAthlete.wellness_logs[0].soreness_data as string[]).length > 0 && (
                <Card className="lg:col-span-2 border-red-100 bg-red-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" /> Active Soreness Hotspots
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-full max-w-[150px]">
                      <SorenessHeatmap selectedZones={selectedAthlete.wellness_logs[0].soreness_data as string[]} readOnly />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">Affected Zones</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedAthlete.wellness_logs[0].soreness_data as string[]).map(zone => (
                          <Badge key={zone} variant="outline" className="bg-white border-red-200 text-red-700 capitalize">
                            {zone.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-red-600 italic mt-2">
                        Reported on {format(new Date(selectedAthlete.wellness_logs[0].created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
 
              <div className="space-y-4">
                <WorkloadChart sessions={selectedAthlete.training_sessions || []} />
              </div>
              <div className="space-y-4">
                <WellnessRadarChart logs={selectedAthlete.wellness_logs || []} />
              </div>

              {/* MEDICAL DOCUMENTS SECTION */}
              {canAccessDocuments && (
                <Card className="lg:col-span-2 border-primary/10 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="w-5 h-5 text-primary" />
                       </div>
                       Patient Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentManager clientId={selectedAthlete.id} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


function CompletionBubble({ count }: { count: number }) {
  if (count === 0) return <div className="h-6 w-full rounded-sm bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-300">-</div>;
  
  return (
    <div className="h-6 w-full rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 shadow-sm">
      {count}
    </div>
  );
}
