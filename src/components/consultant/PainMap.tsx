import React, { useState } from "react";
import BodySvg from "./BodySvg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Activity, CheckCircle, Sparkles } from "lucide-react";

export interface PainAssessment {
  painLevel: number;
  notes: string;
  qualities: string[];
}

export type MapData = Record<string, PainAssessment>;

interface PainMapProps {
  value?: MapData;
  onChange?: (data: MapData) => void;
  readOnly?: boolean;
  clinicalNotes?: string;
  onClinicalNotesChange?: (notes: string) => void;
  gender?: "male" | "female";
  layout?: "side-by-side" | "stacked";
  numberedBadges?: Record<string, number>;
}

const QUALITY_OPTIONS = ["Sharp", "Dull Ache", "Burning", "Throbbing", "Numb"];

export default function PainMap({
  value,
  onChange,
  readOnly = false,
  clinicalNotes = "",
  onClinicalNotesChange,
  gender: genderProp,
  layout,
  numberedBadges,
}: PainMapProps) {
  // Support both controlled and uncontrolled states
  const [localData, setLocalData] = useState<MapData>({});
  const activeData = value !== undefined ? value : localData;

  const updateActiveData = (newData: MapData) => {
    if (onChange) {
      onChange(newData);
    } else {
      setLocalData(newData);
    }
  };

  const [gender, setGender] = useState<"male" | "female">("male");

  React.useEffect(() => {
    if (genderProp) {
      setGender(genderProp);
    }
  }, [genderProp]);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  
  // Modal State
  const [activeRegion, setActiveRegion] = useState<{ id: string; name: string } | null>(null);
  const [painLevel, setPainLevel] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);

  const handleRegionClick = (regionId: string, regionName: string) => {
    if (readOnly) return;
    
    // Load existing data if available
    const existing = activeData[regionId];
    setActiveRegion({ id: regionId, name: regionName });
    setPainLevel(existing?.painLevel ?? 3);
    setNotes(existing?.notes ?? "");
    setSelectedQualities(existing?.qualities ?? []);
  };

  const handleSaveAssessment = () => {
    if (!activeRegion) return;

    const updated = { ...activeData };
    updated[activeRegion.id] = {
      painLevel,
      notes,
      qualities: selectedQualities
    };

    updateActiveData(updated);
    setActiveRegion(null);
  };

  const handleDeleteAssessment = (regionId: string) => {
    if (readOnly) return;
    const updated = { ...activeData };
    delete updated[regionId];
    updateActiveData(updated);
  };

  const handleQualityToggle = (quality: string) => {
    setSelectedQualities((prev) =>
      prev.includes(quality) ? prev.filter((q) => q !== quality) : [...prev, quality]
    );
  };

  // Helper to style badge based on pain severity
  const getSeverityBadge = (level: number) => {
    if (level <= 2) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Mild ({level})</Badge>;
    if (level <= 4) return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Mod ({level})</Badge>;
    return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 font-bold">Severe ({level})</Badge>;
  };

  const activeRegionsCount = Object.keys(activeData).length;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Full-Width Body Map — maximum real estate for heatmaps */}
      <Card className="w-full bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Compact Gender Toggle — top-right corner */}
        <div className="w-full flex items-center justify-end px-4 pt-3 pb-2">
          <div className="inline-flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-full p-0.5 border border-slate-200/40 dark:border-slate-700/40 shadow-sm">
            <button
              type="button"
              onClick={() => setGender("male")}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                gender === "male"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              ♂ Male
            </button>
            <button
              type="button"
              onClick={() => setGender("female")}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                gender === "female"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              ♀ Female
            </button>
          </div>
        </div>

        {/* SVG Heatmap — full width, large */}
        <div className="w-full px-2 pb-3">
          <BodySvg
            gender={gender}
            painData={activeData}
            onRegionClick={handleRegionClick}
            hoveredRegion={hoveredRegion}
            setHoveredRegion={setHoveredRegion}
            layout={layout}
            numberedBadges={numberedBadges}
          />
        </div>
      </Card>

      {/* 2. Clinical Summary — Below the heatmaps */}
      <Card className="w-full bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl overflow-hidden p-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase italic flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Clinical Summary
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {activeRegionsCount} Active region{activeRegionsCount !== 1 && "s"} assessed
            </p>
          </div>
          {activeRegionsCount > 0 && !readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateActiveData({})}
              className="text-slate-400 hover:text-red-500 text-[9px] font-black uppercase tracking-wider h-7 px-2"
            >
              Clear All
            </Button>
          )}
        </div>

        {activeRegionsCount === 0 ? (
          <div className="flex items-center justify-center py-6 text-center">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 stroke-[1.5] mr-3 animate-bounce" />
            <div className="text-left">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">No Regions Mapped</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Click on muscle groups above to log pain indicators.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(activeData).map(([id, item]) => (
              <div
                key={id}
                className="group relative border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 p-3 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-200"
                onMouseEnter={() => setHoveredRegion(id)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight italic truncate">
                      {id.replace(/_/g, " ").replace("back", "(Back)")}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {getSeverityBadge(item.painLevel)}
                      {item.qualities.map((q) => (
                        <Badge key={q} variant="outline" className="text-[8px] uppercase font-bold tracking-tighter">
                          {q}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAssessment(id)}
                      className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {item.notes && (
                  <div className="mt-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                    <p className="text-[10px] text-slate-500 italic font-semibold leading-relaxed line-clamp-2">
                      &ldquo;{item.notes}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Subjective Notes — Below the clinical summary */}
      {onClinicalNotesChange && (
        <Card className="w-full bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl overflow-hidden p-4">
          <Label className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">
            Subjective Notes / Patient Feedback
          </Label>
          <Textarea
            value={clinicalNotes}
            onChange={(e) => onClinicalNotesChange(e.target.value)}
            disabled={readOnly}
            placeholder="How is the patient feeling? Enter general feedback..."
            className="min-h-[50px] h-[50px] rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-850/60 focus:bg-white dark:focus:bg-slate-900 resize-none text-xs"
          />
        </Card>
      )}

      {/* 4. Clinician Assessment Modal Dialog */}
      <Dialog open={activeRegion !== null} onOpenChange={(open) => !open && setActiveRegion(null)}>
        {activeRegion && (
          <DialogContent className="sm:max-w-[460px] max-h-[90vh] flex flex-col gap-0 bg-white dark:bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] p-6 shadow-2xl border-none">
            <DialogHeader className="border-b pb-4 flex-shrink-0">
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Assess: {activeRegion.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Log pain characteristics and clinical observations for the selected region.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-1.5 -mr-1.5">
              {/* Slider for Pain Intensity (1-7) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Pain Intensity</Label>
                  <span className="text-2xl font-black text-red-500 font-display italic">
                    {painLevel}
                    <span className="text-xs font-bold text-slate-400 not-italic ml-1">/ 7</span>
                  </span>
                </div>
                <Slider
                  value={[painLevel]}
                  onValueChange={(val) => setPainLevel(val[0])}
                  min={1}
                  max={7}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Mild (1)</span>
                  <span>Moderate (4)</span>
                  <span>Severe (7)</span>
                </div>
              </div>

              {/* Qualities Multiselect checkboxes */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Pain Quality Descriptors</Label>
                <div className="grid grid-cols-2 gap-3">
                  {QUALITY_OPTIONS.map((quality) => (
                    <div
                      key={quality}
                      onClick={() => handleQualityToggle(quality)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        selectedQualities.includes(quality)
                          ? "bg-slate-900 border-slate-900 text-white dark:bg-primary dark:border-primary"
                          : "bg-slate-50/50 hover:bg-slate-50 border-slate-200/60 text-slate-700"
                      }`}
                    >
                      <Checkbox
                        id={`quality-${quality}`}
                        checked={selectedQualities.includes(quality)}
                        onCheckedChange={() => {}} // Controlled by card click
                        className={selectedQualities.includes(quality) ? "border-white text-white" : "border-slate-300"}
                      />
                      <label
                        htmlFor={`quality-${quality}`}
                        className="text-xs font-bold uppercase tracking-tight cursor-pointer"
                      >
                        {quality}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinician Notes */}
              <div className="space-y-2.5">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Clinical Observations</Label>
                <Textarea
                  placeholder="Record muscle tightness, range limitations, tenderness on palpation, or trigger points..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200/60 focus:bg-white resize-none"
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4 flex gap-3 flex-shrink-0">
              <Button variant="ghost" onClick={() => setActiveRegion(null)} className="rounded-xl font-bold uppercase text-[10px] tracking-wider">
                Cancel
              </Button>
              <Button onClick={handleSaveAssessment} className="rounded-xl font-black uppercase text-[10px] tracking-[0.15em] px-6 shadow-md shadow-primary/20">
                Save Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
