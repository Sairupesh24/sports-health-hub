import React, { useState } from "react";
import { cn } from "@/lib/utils";
import BodySvg from "@/components/consultant/BodySvg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit3, Trash2, Info, Layers, CheckCircle, RotateCcw } from "lucide-react";

export interface PathologyRegionData {
  marked?: boolean;
  name?: string;
  notes?: string;
  [key: string]: any;
}

export type AssessmentPathologyData = Record<string, PathologyRegionData>;

interface AssessmentPathologyMapProps {
  gender?: "male" | "female";
  value: AssessmentPathologyData;
  onChange: (value: AssessmentPathologyData) => void;
  readOnly?: boolean;
  layout?: "stacked" | "side-by-side";
}

export default function AssessmentPathologyMap({
  gender = "male",
  value = {},
  onChange,
  readOnly = false,
  layout = "stacked",
}: AssessmentPathologyMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [editingRegion, setEditingRegion] = useState<{ id: string; name: string; notes: string } | null>(null);

  // Extract marked regions in stable order
  const markedEntries = Object.entries(value).filter(([_, data]) => {
    if (!data) return false;
    return data.marked !== false;
  });

  const numberedBadges: Record<string, number> = {};
  markedEntries.forEach(([regId], idx) => {
    numberedBadges[regId] = idx + 1;
  });

  const handleRegionClick = (regionId: string, regionName: string) => {
    if (readOnly) return;

    const current = value[regionId];
    if (!current || current.marked === false) {
      // Toggle mark ON immediately without blocking modal
      const updated = {
        ...value,
        [regionId]: {
          marked: true,
          name: regionName,
          notes: current?.notes || "",
        },
      };
      onChange(updated);
    } else {
      // Toggle mark OFF
      const updated = { ...value };
      delete updated[regionId];
      onChange(updated);
      if (editingRegion?.id === regionId) {
        setEditingRegion(null);
      }
    }
  };

  const handleSaveNote = () => {
    if (!editingRegion) return;
    const updated = {
      ...value,
      [editingRegion.id]: {
        ...value[editingRegion.id],
        marked: true,
        name: editingRegion.name,
        notes: editingRegion.notes.trim(),
      },
    };
    onChange(updated);
    setEditingRegion(null);
  };

  const handleUnmarkRegion = (regionId: string) => {
    if (readOnly) return;
    const updated = { ...value };
    delete updated[regionId];
    onChange(updated);
    if (editingRegion?.id === regionId) {
      setEditingRegion(null);
    }
  };

  const handleClearAll = () => {
    if (readOnly) return;
    onChange({});
  };

  return (
    <div className="space-y-4 w-full">
      {/* Top Banner / Instructions */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-[11px] text-indigo-900 dark:text-indigo-300">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Click any muscle group to mark it on the body map and optionally add clinical notes.</span>
          </div>
          {markedEntries.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-red-600 dark:text-slate-400"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Marks ({markedEntries.length})
            </Button>
          )}
        </div>
      )}

      {/* SVG Anatomical Map */}
      <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
        <BodySvg
          gender={gender}
          painData={value}
          onRegionClick={handleRegionClick}
          hoveredRegion={hoveredRegion}
          setHoveredRegion={setHoveredRegion}
          layout={layout}
          numberedBadges={numberedBadges}
        />
      </div>

      {/* Marked Muscles & Remarks List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Marked Muscles & Region Remarks
            </h4>
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono font-bold">
            {markedEntries.length} {markedEntries.length === 1 ? "Region" : "Regions"} Marked
          </Badge>
        </div>

        {markedEntries.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50/60 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No muscle groups marked yet. Click on the body anatomy map above to mark a region.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {markedEntries.map(([regId, data], idx) => {
              const badgeNum = idx + 1;
              return (
                <div
                  key={regId}
                  className="group flex items-start justify-between gap-3 p-3 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {badgeNum}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        {data.name || regId.replace(/_/g, " ")}
                      </div>
                      {data.notes ? (
                        <p
                          className={cn(
                            "text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium",
                            !readOnly && "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                          )}
                          onClick={() =>
                            !readOnly &&
                            setEditingRegion({
                              id: regId,
                              name: data.name || regId.replace(/_/g, " "),
                              notes: data.notes || "",
                            })
                          }
                        >
                          {data.notes}
                        </p>
                      ) : (
                        !readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRegion({
                                id: regId,
                                name: data.name || regId.replace(/_/g, " "),
                                notes: "",
                              })
                            }
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Edit3 className="w-3 h-3" />
                            + Add remarks (optional)
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingRegion({
                            id: regId,
                            name: data.name || regId.replace(/_/g, " "),
                            notes: data.notes || "",
                          })
                        }
                        className="h-7 px-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        title={data.notes ? "Edit Comment" : "Add Comment"}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        {data.notes ? "Edit" : "Remark"}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUnmarkRegion(regId)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Unmark Region"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Note Modal */}
      {editingRegion && (
        <Dialog open={!!editingRegion} onOpenChange={(open) => !open && setEditingRegion(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                    {numberedBadges[editingRegion.id] || "•"}
                  </span>
                  <span>{editingRegion.name}</span>
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] font-bold uppercase border-red-200 text-red-600 dark:border-red-900 dark:text-red-400">
                  Marked
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Add clinical tissue notes or remarks for this muscle region (optional).
              </p>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Clinician Tissue Remarks / Notes
                  </Label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {editingRegion.notes.length}/200
                  </span>
                </div>
                <Textarea
                  value={editingRegion.notes}
                  maxLength={200}
                  onChange={(e) =>
                    setEditingRegion((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder="e.g. Mild spasm observed in upper fibers, restricted range during lateral flexion..."
                  rows={4}
                  className="rounded-2xl resize-none text-xs border-slate-200 dark:border-slate-800"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Remarks are limited to 200 characters to fit cleanly on the exported clinical report.
                </p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleUnmarkRegion(editingRegion.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Unmark Region
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRegion(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNote}
                  className="rounded-xl bg-primary text-white text-xs font-bold shadow-md"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Save Remarks
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
