import React from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import LogSessionForm from "@/components/ams/LogSessionForm";
import { Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MobileLogActivity() {
  const navigate = useNavigate();

  return (
    <MobileLayout showBack>
      <div className="space-y-4 pb-24 animate-in fade-in duration-300">
        <header className="flex items-center gap-3 pt-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Log <span className="text-primary">Activity</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manual session entry & RPE tracking</p>
          </div>
        </header>

        {/* Form card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm">
           <LogSessionForm onComplete={() => navigate(-1)} />
        </div>
      </div>
    </MobileLayout>
  );
}

