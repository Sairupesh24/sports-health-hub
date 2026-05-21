import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Camera, FileText, CheckCircle2, Stethoscope, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { haptic } from "@/utils/haptic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function MobilePhysicianView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState("");
  const [injections, setInjections] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [uploadedReports, setUploadedReports] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      haptic.light();
      setUploadedReports(prev => [...prev, e.target.files![0].name]);
      toast({ title: "Report Attached", description: `${e.target.files[0].name} added to timeline.` });
    }
  };

  const handleFinalize = () => {
    haptic.heavy();
    toast({
      title: "Session Finalized",
      description: "PDF Report generated and sent to Athlete Portal.",
    });
    setTimeout(() => navigate("/mobile/consultant"), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] pb-24 selection:bg-primary/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 h-16">
          <button 
            onClick={() => { haptic.light(); navigate(-1); }}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-[16px] font-black tracking-tight">Physician Consult</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Session #{id?.substring(0,6)}</p>
          </div>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="w-full bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl h-14">
            <TabsTrigger value="log" onClick={() => haptic.light()} className="flex-1 rounded-xl font-bold tracking-wide min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              Consult Log
            </TabsTrigger>
            <TabsTrigger value="forms" onClick={() => haptic.light()} className="flex-1 rounded-xl font-bold tracking-wide min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
              Questionnaires
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Quick Attachments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" /> Diagnostics
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform min-h-[80px]">
                  <Camera className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">Scan Report</span>
                  {/* Native Camera input */}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                </label>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-center">
                  <h4 className="font-black text-2xl text-slate-900 dark:text-white leading-none mb-1">{uploadedReports.length}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attached</p>
                </div>
              </div>
            </section>

            {/* Core Logging */}
            <section className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Clinical Diagnosis</label>
                <AutoResizeTextarea 
                  minRows={2} 
                  placeholder="Enter primary and secondary diagnoses..." 
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl px-4 py-4 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Prescribed Medications</label>
                <AutoResizeTextarea 
                  minRows={2} 
                  placeholder="Rx Details..." 
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl px-4 py-4 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Injection Tracking (PRP/Cortisone)</label>
                <AutoResizeTextarea 
                  minRows={2} 
                  placeholder="Site, dosage, outcome..." 
                  value={injections}
                  onChange={(e) => setInjections(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl px-4 py-4 focus-visible:ring-primary"
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="forms" className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {/* Questionnaire Desk */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[15px]">Pre-Consultation Form</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Submitted 2h ago</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">Pain Level (1-10)</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-[70%] w-5 h-5 bg-white border-2 border-slate-900 rounded-full shadow-md" />
                    </div>
                    <span className="font-black text-xl w-6 text-center">7</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                    <span>No Pain</span>
                    <span>Severe</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Primary Complaint</p>
                  <p className="text-[14px] font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    Sharp pain in the right knee during deceleration. Swelling started yesterday evening.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Clinical Interpretation Gateway */}
        <section className="bg-primary/5 border border-primary/20 p-5 rounded-3xl mt-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Clinical Interpretation</h3>
          <AutoResizeTextarea 
            minRows={3} 
            placeholder="Final notes for the generated report..." 
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            className="bg-white dark:bg-slate-900 border-primary/20 shadow-sm rounded-2xl px-4 py-4 focus-visible:ring-primary mb-4"
          />

          <Button 
            onClick={handleFinalize}
            className="w-full h-14 rounded-2xl font-black tracking-widest uppercase text-[11px] gap-2 shadow-lg shadow-primary/20"
          >
            <Share className="w-4 h-4" /> Finalize & Generate PDF
          </Button>
        </section>

      </main>
    </div>
  );
}
