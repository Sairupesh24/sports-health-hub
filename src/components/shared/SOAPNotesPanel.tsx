import React, { useState } from "react";
import BodyHeatmap from "./BodyHeatmap";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { X, Save, RotateCcw, AlertCircle } from "lucide-react";

// Human-readable labels lookup mapping region ID to display name
const REGION_LABELS: Record<string, string> = {
  neck: "Neck",
  "shoulder-left": "Left Shoulder",
  "shoulder-right": "Right Shoulder",
  chest: "Chest",
  core: "Core / Abdomen",
  "hip-left": "Left Hip",
  "hip-right": "Right Hip",
  "quad-left": "Left Quad",
  "quad-right": "Right Quad",
  "knee-left": "Left Knee",
  "knee-right": "Right Knee",
  "calf-left": "Left Calf",
  "calf-right": "Right Calf",
  "elbow-left": "Left Elbow",
  "elbow-right": "Right Elbow",
  "upper-back": "Upper Back",
  "lower-back": "Lower Back",
  "glute-left": "Left Glute",
  "glute-right": "Right Glute",
  "hamstring-left": "Left Hamstring",
  "hamstring-right": "Right Hamstring",
};

interface SOAPNotesPanelProps {
  initialSelectedRegions?: string[];
}

export default function SOAPNotesPanel({
  initialSelectedRegions = [],
}: SOAPNotesPanelProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialSelectedRegions);
  const [painScores, setPainScores] = useState<Record<string, number>>({});
  
  // SOAP textareas
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");

  // Update selected regions from outer link (like assessment auto-linking)
  React.useEffect(() => {
    if (initialSelectedRegions.length > 0) {
      setSelectedRegions((prev) => {
        // Merge without duplicates
        const merged = [...new Set([...prev, ...initialSelectedRegions])];
        return merged;
      });
    }
  }, [initialSelectedRegions]);

  const handleToggleRegion = (regionId: string) => {
    setSelectedRegions((prev) => {
      if (prev.includes(regionId)) {
        // Remove region and its pain score
        const nextScores = { ...painScores };
        delete nextScores[regionId];
        setPainScores(nextScores);
        return prev.filter((r) => r !== regionId);
      } else {
        // Add region with default pain score of 0
        setPainScores((prevScores) => ({ ...prevScores, [regionId]: 0 }));
        return [...prev, regionId];
      }
    });
  };

  const handleRemoveRegion = (regionId: string) => {
    handleToggleRegion(regionId);
  };

  const handlePainChange = (regionId: string, value: number) => {
    setPainScores((prev) => ({
      ...prev,
      [regionId]: value,
    }));
  };

  const handleClearAll = () => {
    setSelectedRegions([]);
    setPainScores({});
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
    toast({
      title: "Workspace Cleared",
      description: "All selected regions, pain scores, and clinical notes have been reset.",
    });
  };

  const handleSave = () => {
    // Format pain scores for saved regions
    const regionsPayload = selectedRegions.map((r) => ({
      id: r,
      label: REGION_LABELS[r] || r,
      painScore: painScores[r] ?? 0,
    }));

    const soapNote = {
      regions: regionsPayload,
      subjective,
      objective,
      assessment,
      plan,
      timestamp: new Date().toISOString(),
    };

    // Console logging as backend placeholder
    console.log("=== SOAP NOTE SAVED ===", JSON.stringify(soapNote, null, 2));

    toast({
      title: "SOAP Note Saved",
      description: `${selectedRegions.length} region(s) saved successfully. Clinical note logged to console.`,
    });
  };

  return (
    <div className="space-y-8">
      {/* SOAP Notes Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-5 border border-slate-800/80 rounded-3xl">
        <div>
          <h2 className="text-base font-black text-slate-100 uppercase tracking-widest">
            Clinical SOAP Notes Annotation
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Toggle body map regions to mark pain/soreness, then rate severity using the NRS scale.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={handleClearAll}
            className="gap-2 border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-100 hover:bg-slate-900"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2 bg-primary text-slate-950 hover:bg-primary/90 shadow-lg shadow-primary/10 font-bold"
          >
            <Save className="w-4 h-4" />
            Save Note
          </Button>
        </div>
      </div>

      {/* Main SVG Heatmaps */}
      <div className="flex flex-col items-center justify-center py-6 bg-slate-950/20 border border-slate-900 rounded-[2.5rem] p-6">
        <BodyHeatmap
          selectedRegions={selectedRegions}
          onToggleRegion={handleToggleRegion}
        />
      </div>

      {/* Selected regions display & pain NRS sliders */}
      {selectedRegions.length > 0 && (
        <div className="space-y-5 bg-slate-900/40 p-6 border border-slate-800/80 rounded-3xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
              Selected Affected Regions
            </span>
            <span className="text-xs font-bold text-primary">
              {selectedRegions.length} region(s) flagged for attention.
            </span>
          </div>

          {/* Dismissible Tags */}
          <div className="flex flex-wrap gap-2">
            {selectedRegions.map((regionId) => (
              <span
                key={regionId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-red-500/30 bg-red-500/10 text-red-400 backdrop-blur-md"
              >
                {REGION_LABELS[regionId] || regionId}
                <button
                  onClick={() => handleRemoveRegion(regionId)}
                  className="p-0.5 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* NRS Pain Intensity Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
            {selectedRegions.map((regionId) => {
              const currentScore = painScores[regionId] ?? 0;
              return (
                <div
                  key={`pain-${regionId}`}
                  className="bg-slate-950/50 p-4 border border-slate-800/60 rounded-2xl flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      {REGION_LABELS[regionId] || regionId} — Pain Severity
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded ${
                        currentScore >= 7
                          ? "bg-red-500/10 text-red-500"
                          : currentScore >= 4
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      NRS {currentScore}/10
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-500">Mild</span>
                    <Slider
                      value={[currentScore]}
                      min={0}
                      max={10}
                      step={1}
                      onValueChange={(val) => handlePainChange(regionId, val[0])}
                      className="flex-1"
                    />
                    <span className="text-[10px] font-bold text-slate-500">Severe</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SOAP Note Textareas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subjective */}
        <div className="space-y-2">
          <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
            Subjective Notes (S)
          </label>
          <Textarea
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
            placeholder="Patient complaints, description of symptoms, pain onset, and mechanism of injury in their own words..."
            className="min-h-[140px] bg-slate-950/30 border-slate-800 focus:border-primary/50 rounded-2xl placeholder:text-slate-600 text-slate-200"
          />
        </div>

        {/* Objective */}
        <div className="space-y-2">
          <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
            Objective Findings (O)
          </label>
          <Textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Clinical observations, range of motion tests, swelling, palpation tenderness, posture analysis, palpation..."
            className="min-h-[140px] bg-slate-950/30 border-slate-800 focus:border-primary/50 rounded-2xl placeholder:text-slate-600 text-slate-200"
          />
        </div>

        {/* Assessment */}
        <div className="space-y-2">
          <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
            Assessment (A)
          </label>
          <Textarea
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder="Clinical impression, diagnosis, differential diagnosis, status updates on existing injuries..."
            className="min-h-[140px] bg-slate-950/30 border-slate-800 focus:border-primary/50 rounded-2xl placeholder:text-slate-600 text-slate-200"
          />
        </div>

        {/* Plan */}
        <div className="space-y-2">
          <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
            Plan (P)
          </label>
          <Textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Treatment plan, modalities used, manual techniques, exercise progression, home exercise program (HEP)..."
            className="min-h-[140px] bg-slate-950/30 border-slate-800 focus:border-primary/50 rounded-2xl placeholder:text-slate-600 text-slate-200"
          />
        </div>
      </div>
    </div>
  );
}
