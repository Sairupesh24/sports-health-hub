import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardList, 
  User, 
  FileDown, 
  Save, 
  MessageSquare,
  CheckCircle2,
  Calendar,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportQuestionnairePDF } from "@/utils/QuestionnaireExport";
import { useAuth } from "@/contexts/AuthContext";

interface ResponseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: any;
  assignmentName: string;
}

export default function ResponseReviewModal({ isOpen, onClose, response, assignmentName }: ResponseReviewModalProps) {
  const { profile } = useAuth();
  const [interpretation, setInterpretation] = useState(response.clinical_interpretation || "");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("form_responses")
        .update({ clinical_interpretation: interpretation })
        .eq("id", response.id);
        
      if (error) throw error;
      
      toast({
        title: "Interpretation Saved",
        description: "Clinical notes have been successfully updated."
      });
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!profile?.organization_id) return;
    
    try {
      setExporting(true);
      toast({
        title: "Generating Export",
        description: "Preparing your branded clinical report..."
      });

      await exportQuestionnairePDF({
        clientName: response.client?.full_name,
        uhid: response.client?.uhid,
        questionnaireName: assignmentName,
        specialistName: profile.full_name || "Specialist",
        respondedAt: response.responded_at,
        answers: response.answers,
        interpretation: interpretation,
        orgId: profile.organization_id
      });

      toast({
        title: "Report Downloaded",
        description: "Your clinical report is ready."
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const questions = response.answers || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-[#F8FAFC] border-none overflow-hidden flex flex-col shadow-2xl">
        <DialogHeader className="p-8 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">
                  Clinical <span className="text-primary">Review</span>
                </DialogTitle>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                  {assignmentName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleExport}
                disabled={exporting}
                variant="outline"
                className="h-11 rounded-xl bg-white border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-slate-50 transition-all"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Export PDF
              </Button>
      <Button 
                onClick={handleSave}
                disabled={saving}
                className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-slate-900/10 transition-all"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Interpretation
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left panel: Responses */}
          <div className="lg:w-2/3 border-r border-slate-100 bg-white/50">
            <ScrollArea className="h-full">
              <div className="p-8 space-y-8">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-4 mb-6">
                     <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                     </div>
                     <div>
                       <h6 className="font-black text-slate-900 uppercase italic text-[16px]">{response.client?.full_name}</h6>
                       <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>UHID: {response.client?.uhid}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Submitted: {new Date(response.responded_at).toLocaleDateString()}</span>
                       </div>
                     </div>
                   </div>
                </div>

                <div className="space-y-6">
                  {questions.map((q: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h6 className="text-[13px] font-black text-slate-900 uppercase tracking-tight mb-4 leading-relaxed">
                            {q.question}
                          </h6>
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                             <p className="text-[12px] font-bold text-slate-600 leading-relaxed italic">
                               {Array.isArray(q.answer) ? q.answer.join(", ") : q.answer || "No response recorded."}
                             </p>
                          </div>
                          {q.score !== undefined && (
                            <div className="mt-4 flex justify-end">
                              <Badge className="bg-primary/5 text-primary border-primary/20 rounded-lg px-3 py-1 font-black text-[10px]">
                                SCORE: {q.score}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right panel: Interpretation */}
          <div className="lg:w-1/3 p-8 bg-slate-900 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <MessageSquare className="w-48 h-48" />
             </div>
             
             <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h6 className="font-black uppercase tracking-widest text-[11px]">Clinical Interpretation</h6>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Notes & Recommendations</Label>
                  <Textarea 
                    placeholder="Enter clinical observations, risk factors, or follow-up actions..."
                    className="min-h-[400px] bg-white/5 border-white/10 rounded-2xl p-6 text-[12px] font-bold placeholder:text-white/10 focus-visible:ring-primary/20 resize-none leading-relaxed"
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                  />
                </div>
                
                <p className="text-[9px] font-bold italic text-white/30 text-center uppercase tracking-widest">
                  Saved notes will be included in the exported PDF report.
                </p>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
