import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, X, Activity, Award, ShieldAlert } from 'lucide-react';
import { PerformanceAssessmentPayload } from './performanceTypes';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: Partial<PerformanceAssessmentPayload>;
}

export function AssessmentReportModal({ open, onOpenChange, assessment }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const fms = assessment.fms_data || {};
  const anthro = assessment.anthropometrics || {};
  const power = assessment.power_speed_data || {};
  const ybt = assessment.stability_data || {};
  const aerobic = assessment.aerobic_data || {};
  const biomotor = assessment.biomotor_ratings || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-slate-100">
        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between sticky top-0 z-20">
          <div>
            <DialogTitle className="text-base font-black uppercase text-slate-900 tracking-tight">
              Diagnostic Assessment Report
            </DialogTitle>
            <p className="text-xs text-slate-500">Official ISHPO Performance Testing Diagnostic Sheet</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print Sheet
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div ref={printRef} className="p-4 sm:p-8 bg-white m-2 sm:m-4 rounded-xl shadow-sm border border-slate-200 text-slate-900 space-y-6 print:m-0 print:p-0 print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-primary">ISHPO</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-sm text-slate-600">Integrated Sports Health & Physio OS</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 mt-2">
                {assessment.template_name || 'Athlete Performance Assessment Report'}
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Sport Battery: <strong className="text-slate-900">{assessment.sport_name || 'Multi-Sport'}</strong>
                {assessment.batch_or_squad ? ` • Squad: ${assessment.batch_or_squad}` : ''}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs space-y-1">
              <Badge variant="outline" className="font-bold text-slate-700">Official Report</Badge>
              <p className="text-slate-500">Date: <strong className="text-slate-900">{String(assessment.assessment_date || '').split('T')[0]}</strong></p>
              <p className="text-slate-500">Assessor: <strong className="text-slate-900">{assessment.assessor_name || 'Staff Specialist'}</strong></p>
            </div>
          </div>

          {/* Demographic Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Athlete Name</span>
              <p className="font-black text-sm text-slate-900">{assessment.athlete_name || 'Athlete'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">UHID / Client ID</span>
              <p className="font-bold text-slate-800">{assessment.athlete_uhid || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</span>
              <p className="font-bold text-slate-800">{assessment.athlete_age || '—'} yrs • {assessment.athlete_gender || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Body Mass / Height</span>
              <p className="font-bold text-slate-800">
                {anthro.weight ? `${anthro.weight} kg` : '—'} • {anthro.standing_height ? `${anthro.standing_height} cm` : '—'}
              </p>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border">
              <span className="text-[10px] font-black uppercase text-slate-500">FMS Total Score</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{fms.total_score ?? '—'} / 21</p>
              <span className="text-[9px] text-slate-400">Target ≥ 15</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border">
              <span className="text-[10px] font-black uppercase text-slate-500">Vertical Jump</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{power.vertical_jump ? `${power.vertical_jump} cm` : '—'}</p>
              <span className="text-[9px] text-slate-400">Peak Power: {power.vertical_jump_power_watts || '—'} W</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border">
              <span className="text-[10px] font-black uppercase text-slate-500">10m Sprint Gate</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{power.sprint_10m ? `${power.sprint_10m} s` : '—'}</p>
              <span className="text-[9px] text-slate-400">Linear Acceleration</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border">
              <span className="text-[10px] font-black uppercase text-slate-500">Estimated VO2 Max</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{aerobic.vo2_max_calculated ? `${aerobic.vo2_max_calculated}` : '—'}</p>
              <span className="text-[9px] text-slate-400">mL/kg/min</span>
            </div>
          </div>

          {/* FMS Screen Breakdown */}
          <div className="space-y-2">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">Functional Movement Screen Sub-Scores</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">OHS</span>
                <strong className="text-sm">{fms.ohs?.final ?? '—'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">Hurdle</span>
                <strong className="text-sm">R:{fms.hurdle_step?.right ?? '—'} L:{fms.hurdle_step?.left ?? '—'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">In-Line</span>
                <strong className="text-sm">R:{fms.inline_lunge?.right ?? '—'} L:{fms.inline_lunge?.left ?? '—'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">Shoulder</span>
                <strong className="text-sm">R:{fms.shoulder_mobility?.right ?? '—'} L:{fms.shoulder_mobility?.left ?? '—'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">ASLR</span>
                <strong className="text-sm">R:{fms.aslr?.right ?? '—'} L:{fms.aslr?.left ?? '—'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">Push-Up</span>
                <strong className="text-sm">{fms.trunk_pushup?.right ?? '—'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[9px] text-slate-500 block">Rotary</span>
                <strong className="text-sm">R:{fms.rotary_stability?.right ?? '—'} L:{fms.rotary_stability?.left ?? '—'}</strong>
              </div>
            </div>
          </div>

          {/* YBT Dynamic Balance */}
          <div className="space-y-2">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">Y-Balance Test Reaches & Asymmetry</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border">
                <span className="text-[10px] text-slate-400 block">Lower Anterior Diff</span>
                <strong className={`text-sm ${parseFloat(String(ybt.ybt_lq_diff_anterior || 0)) >= 4 ? 'text-rose-600 font-black' : ''}`}>
                  {ybt.ybt_lq_diff_anterior ? `${ybt.ybt_lq_diff_anterior} cm` : '—'}
                </strong>
                {parseFloat(String(ybt.ybt_lq_diff_anterior || 0)) >= 4 && <span className="text-[9px] text-rose-500 block">⚠ High Asymmetry</span>}
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border">
                <span className="text-[10px] text-slate-400 block">LQ Composite Right</span>
                <strong className="text-sm">{ybt.ybt_lq_composite_r ? `${ybt.ybt_lq_composite_r} %` : '—'}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border">
                <span className="text-[10px] text-slate-400 block">LQ Composite Left</span>
                <strong className="text-sm">{ybt.ybt_lq_composite_l ? `${ybt.ybt_lq_composite_l} %` : '—'}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border">
                <span className="text-[10px] text-slate-400 block">UQ Composite (Upper)</span>
                <strong className="text-sm">{ybt.ybt_uq_composite_r ? `R:${ybt.ybt_uq_composite_r}% L:${ybt.ybt_uq_composite_l}%` : '—'}</strong>
              </div>
            </div>
          </div>

          {/* Bio-Motor Ratings */}
          <div className="space-y-2">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">Bio-Motor Abilities Assessment</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(biomotor).map(([quality, tier]) => (
                <div key={quality} className="px-3 py-1.5 rounded-lg border bg-slate-50 text-xs flex items-center gap-2">
                  <span className="font-bold text-slate-700">{quality}:</span>
                  <Badge variant="outline" className="text-[10px] font-black uppercase">{tier as string}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Impressions & Plans */}
          <div className="space-y-3 pt-2 border-t text-xs">
            {assessment.overall_impression && (
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px]">Specialist Impression</h4>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{assessment.overall_impression}</p>
              </div>
            )}
            {assessment.corrective_plan && (
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px]">Corrective Exercise Plan</h4>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{assessment.corrective_plan}</p>
              </div>
            )}
            {assessment.plan_of_action && (
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px]">S&C Plan of Action & Retesting</h4>
                <p className="text-slate-700 mt-0.5 leading-relaxed">{assessment.plan_of_action}</p>
              </div>
            )}
          </div>

          {/* Signoff footer */}
          <div className="pt-8 border-t flex justify-between items-end text-xs text-slate-400">
            <div>
              <p>Generated by ISHPO Performance Engine</p>
              <p className="text-[10px]">Confidential Medical & Athletic Record</p>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-300 w-44 mb-1"></div>
              <p className="font-bold text-slate-800">{assessment.assessor_name || 'Assessor Signature'}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssessmentReportModal;

