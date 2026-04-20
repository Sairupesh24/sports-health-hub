import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Send, 
  MoreVertical, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  UserCheck,
  Search,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BatchResponsesView from "./BatchResponsesView";
import { cn } from "@/lib/utils";

export default function BulkStatusDashboard() {
  const { profile, roles } = useAuth();
  const isClinical = roles.some(r => ["coach", "sports_scientist", "sports_physician", "physiotherapist", "nutritionist"].includes(r));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = React.useState<any>(null);
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["ams-bulk-assignments-full", profile?.organization_id],
    queryFn: async () => {
      const orgId = profile?.organization_id;
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("bulk_assignments" as any)
        .select(`
          *,
          questionnaire:questionnaires(name),
          specialist:profiles!specialist_id(full_name),
          responses:form_responses(id, status, client_id)
        `)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id
  });

  const reminderMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const assignment = assignments?.find(a => a.id === assignmentId);
      if (!assignment) return;

      const pendingClientIds = assignment.responses
        ?.filter((r: any) => r.status === 'pending')
        ?.map((r: any) => r.client_id);

      if (!pendingClientIds || pendingClientIds.length === 0) return;

      const notifications = pendingClientIds.map((clientId: string) => ({
        user_id: clientId,
        org_id: profile?.organization_id,
        title: "Reminder: Assessment Pending",
        message: `Please complete the ${assignment.questionnaire?.name} at your earliest convenience.`,
        type: 'questionnaire_reminder'
      }));

      const { error } = await supabase.from('notifications' as any).insert(notifications as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Reminders Sent",
        description: "Notification reminders have been sent to all pending clients."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reminders",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-slate-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
        <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-6 font-black italic">
          0
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase">No active distributions</h3>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Active bulk assignments will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assignments.map((assignment) => {
        const progress = Math.round((assignment.responded_count / assignment.total_clients) * 100) || 0;
        const isCompleted = progress === 100;
        
        return (
          <Card key={assignment.id} className="border-slate-200 rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all bg-white relative overflow-hidden group">
            {isCompleted && (
              <div className="absolute top-0 right-0 p-6 z-10">
                 <CheckCircle2 className="w-10 h-10 text-green-500 opacity-20 group-hover:opacity-40 transition-opacity" />
              </div>
            )}
            
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                    isCompleted ? "bg-green-500/10 text-green-600 shadow-green-500/10" : "bg-primary/10 text-primary shadow-primary/10"
                  )}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-1">
                      {assignment.questionnaire?.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {format(new Date(assignment.created_at), 'MMM d, h:mm a')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-primary"><UserCheck className="w-3 h-3" /> {assignment.specialist?.full_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-black italic text-slate-900">{progress}%</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Completion Rate</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-xl border border-slate-100 hover:bg-slate-50">
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-slate-200 rounded-xl">
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedBatch(assignment);
                          setBatchModalOpen(true);
                        }}
                        className="text-[11px] font-black uppercase text-slate-600 cursor-pointer"
                      >
                        View Detailed Report
                      </DropdownMenuItem>
                      {isClinical && (
                        <DropdownMenuItem className="text-[11px] font-black uppercase text-rose-600 cursor-pointer">Cancel Assignment</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between font-black uppercase text-[10px] tracking-widest px-1">
                   <div className="flex items-center gap-6">
                     <span className="text-slate-600">{assignment.responded_count} Completed</span>
                     <span className="text-slate-400">{assignment.total_clients - assignment.responded_count} Pending</span>
                   </div>
                   <span className="text-slate-400">Total: {assignment.total_clients}</span>
                </div>
                
                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 relative rounded-full",
                      isCompleted ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedBatch(assignment);
                      setBatchModalOpen(true);
                    }}
                    className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-50"
                  >
                    View Specific Responses
                  </Button>
                  {!isCompleted && isClinical && (
                    <Button 
                      onClick={() => reminderMutation.mutate(assignment.id)}
                      disabled={reminderMutation.isPending}
                      className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-slate-900/10"
                    >
                      {reminderMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Push Reminders
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {selectedBatch && (
        <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                    <Users className="w-6 h-6" />
                 </div>
                 <div>
                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">
                      Distribution <span className="text-primary">Intelligence</span>
                    </DialogTitle>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                      {selectedBatch.questionnaire?.name} • Tracking {selectedBatch.total_clients} Recipients
                    </p>
                 </div>
               </div>
            </DialogHeader>
            <div className="p-8">
              <BatchResponsesView 
                assignmentId={selectedBatch.id} 
                assignmentName={selectedBatch.questionnaire?.name} 
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
