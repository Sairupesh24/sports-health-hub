import React from "react";
import { ParsedAssessmentData, TestSession } from "./XlsParser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar, Layers, Ruler, Weight, User, LogOut, Check } from "lucide-react";

interface ReportHeaderProps {
  clientData: ParsedAssessmentData["client"];
  activeTestIndex: number;
  onActiveTestIndexChange: (index: number) => void;
  onReset: () => void;
  readOnly?: boolean;
}

export default function ReportHeader({
  clientData,
  activeTestIndex,
  onActiveTestIndexChange,
  onReset,
  readOnly = false,
}: ReportHeaderProps) {
  const currentTest = clientData.tests.find((t) => t.index === activeTestIndex) || clientData.latestTest;

  if (!currentTest) return null;

  return (
    <Card className="gradient-card border-border shadow-md">
      <CardContent className="pt-6 space-y-6">
        {/* Name, Birthdate, Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div className="space-y-1 text-left">
            <h1 className="text-2xl md:text-3xl font-black font-display text-foreground tracking-tight uppercase leading-none">
              {clientData.name}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Born: <span className="text-foreground">{clientData.birthdate}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>Active Test:</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                {currentTest.type} ({currentTest.date})
              </span>
            </p>
          </div>

          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="w-full md:w-auto self-start bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm rounded-xl font-medium h-9 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-2 text-slate-500" />
              Upload New File
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground font-display">
                {currentTest.height ? `${currentTest.height} cm` : "—"}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Height
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Weight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground font-display">
                {currentTest.weight ? `${currentTest.weight} kg` : "—"}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Weight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground font-display">
                {currentTest.bmi ? currentTest.bmi.toFixed(1) : "—"}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                BMI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground font-display">
                {clientData.tests.length} Assessment{clientData.tests.length !== 1 ? "s" : ""}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                On Record
              </p>
            </div>
          </div>
        </div>

        {/* Test History Selector Tabs */}
        {!readOnly && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Available Assessment Tests Series
            </Label>
            <div className="flex flex-wrap gap-2">
              {clientData.tests.map((t) => {
                const isActive = t.index === activeTestIndex;
                return (
                  <button
                    key={t.index}
                    type="button"
                    onClick={() => onActiveTestIndexChange(t.index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                        : "bg-white dark:bg-slate-900 border-slate-200 hover:border-primary/40 text-slate-600 hover:text-slate-850"
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    <span>Test {t.index} — {t.date}</span>
                    <span
                      className={`ml-1 text-[9px] uppercase px-2 py-0.5 rounded-full font-black ${
                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
