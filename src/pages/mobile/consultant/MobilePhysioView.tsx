import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Mic, MicOff, Share, Activity, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { haptic } from "@/utils/haptic";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const MODALITIES = ["Dry Needling", "IASTM", "Manual Therapy", "TENS", "Exercise Rehab", "Cupping", "Laser Therapy"];

export default function MobilePhysioView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [progressNote, setProgressNote] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition if available
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            }
          }
          if (finalTranscript) {
            setProgressNote((prev) => (prev + " " + finalTranscript).trim());
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          toast({ variant: "destructive", title: "Dictation Error", description: "Could not record audio." });
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({ variant: "destructive", title: "Unsupported", description: "Voice dictation is not supported on this browser." });
      return;
    }

    if (isRecording) {
      haptic.light();
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      haptic.heavy();
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast({ title: "Listening...", description: "Speak now to dictate your notes." });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleModality = (modality: string) => {
    haptic.light();
    setSelectedModalities(prev => 
      prev.includes(modality) ? prev.filter(m => m !== modality) : [...prev, modality]
    );
  };

  const handleFinalize = () => {
    haptic.heavy();
    toast({
      title: "Rehab Session Finalized",
      description: "PDF Report generated and sent to Athlete Portal.",
    });
    setTimeout(() => navigate("/mobile/consultant"), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] pb-24 selection:bg-primary/30">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 h-16">
          <button 
            onClick={() => { haptic.light(); navigate(-1); }}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-[16px] font-black tracking-tight">Physio Rehab</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Session #{id?.substring(0,6)}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-8">
        
        {/* Treatment Logger - Modality Pills */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Modalities Applied
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground">{selectedModalities.length} Selected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {MODALITIES.map(mod => (
              <button
                key={mod}
                onClick={() => toggleModality(mod)}
                className={cn(
                  "px-4 py-3 rounded-2xl border font-bold text-xs tracking-wide transition-all active:scale-95 min-h-[44px]",
                  selectedModalities.includes(mod) 
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {mod}
              </button>
            ))}
          </div>
        </section>

        {/* David/EVE Spine Integration Widget */}
        <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm">David Spine Metrics</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Latest Assessment</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] font-black uppercase text-emerald-500 border-emerald-200 bg-emerald-50">Sync OK</Badge>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Flexion Mobility</span>
                <span className="text-slate-900 dark:text-white">85°</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-[70%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Extension Strength</span>
                <span className="text-slate-900 dark:text-white">120 Nm</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
              </div>
            </div>
          </div>
        </section>

        {/* Progress Note with Voice Dictation */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Progress Notes</h3>
            <button 
              onClick={toggleRecording}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm border",
                isRecording 
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
                  : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
              )}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          
          <AutoResizeTextarea 
            minRows={4} 
            placeholder={isRecording ? "Listening..." : "Tap the mic icon to dictate, or type manually..."} 
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            className={cn(
              "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl px-4 py-4 focus-visible:ring-primary transition-all",
              isRecording && "border-rose-400 ring-2 ring-rose-400/20"
            )}
          />
        </section>

        {/* Clinical Interpretation Gateway */}
        <section className="bg-primary/5 border border-primary/20 p-5 rounded-3xl mt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-3">Clinical Interpretation</h3>
          <AutoResizeTextarea 
            minRows={3} 
            placeholder="Final assessment for the PDF report..." 
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
