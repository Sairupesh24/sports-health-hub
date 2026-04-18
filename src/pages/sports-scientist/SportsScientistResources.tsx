import DashboardLayout from "@/components/layout/DashboardLayout";
import { ScientificResourcesManager } from "@/components/sports-scientist/resources/ScientificResourcesManager";
import { format } from "date-fns";
import { FileStack, Activity } from "lucide-react";

export default function SportsScientistResources() {
  return (
    <DashboardLayout role="sports_scientist">
      <div className="min-h-screen bg-[#f8fafc]">
        <main className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1600px] animate-in fade-in duration-700">
          
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </p>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/10 shrink-0">
                  <FileStack className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Documents & Links</h1>
              </div>
              <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Scientific Knowledge Base & Athlete Records
              </p>
            </div>
          </header>

          <div className="glass-card rounded-[40px] p-8 border-none shadow-xl shadow-slate-200/50 bg-white/60 backdrop-blur-md">
            <ScientificResourcesManager />
          </div>

          <footer className="pt-8 border-t border-slate-200 mt-12 pb-12">
            <div className="bg-slate-900 rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <FileStack className="w-48 h-48 -mr-20 -mt-20" />
                </div>
                <div className="space-y-3 relative z-10 flex-1">
                    <h3 className="text-xl font-black text-white">Private Scientist Repository</h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl">
                        This section is strictly restricted to Sports Scientists. Any documents uploaded here are isolated from the general clinical medical records and are intended for scientific analysis, research references, and tactical planning.
                    </p>
                </div>
                <div className="shrink-0 relative z-10">
                    <div className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                        <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Confidentiality Active</span>
                    </div>
                </div>
            </div>
          </footer>
        </main>
      </div>
    </DashboardLayout>
  );
}
