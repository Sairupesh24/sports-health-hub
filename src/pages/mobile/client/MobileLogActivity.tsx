import React from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import LogSessionForm from "@/components/ams/LogSessionForm";
import { Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MobileLogActivity() {
  const navigate = useNavigate();

  return (
    <MobileLayout showBack>
      <div className="space-y-6 pb-24 animate-in fade-in duration-500">
        <header className="flex flex-col gap-2">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-tight">
                  Log <span className="text-primary">Activity</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manual Session Entry</p>
              </div>
           </div>
        </header>

        {/* Form card — dark themed for mobile consistency */}
        <div className="bg-slate-900 rounded-[28px] overflow-visible shadow-2xl border border-white/5
          [&_label]:!text-slate-300
          [&_.glass-card]:!bg-white/5 [&_.glass-card]:!border-white/5
          [&_input]:!text-white [&_input]:placeholder:!text-slate-500
          [&_.text-slate-800]:!text-slate-300
          [&_.text-slate-700]:!text-slate-400
          [&_.text-slate-500]:!text-slate-400
          [&_.text-muted-foreground]:!text-slate-400
          [&_.border-slate-200]:!border-white/10
          [&_.text-primary-foreground]:!text-white
        ">
           <LogSessionForm onComplete={() => navigate(-1)} />
        </div>
      </div>
    </MobileLayout>
  );
}

