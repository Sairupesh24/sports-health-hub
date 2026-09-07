import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Flame, 
  Activity, 
  Zap, 
  RotateCcw, 
  Eraser, 
  Trash2, 
  Sparkles,
  Layers,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import RegionalPainScale from "./RegionalPainScale";

export type SensationTool = "pain" | "burning" | "weakness" | "numbness" | "erase";

export interface DrawingPoint {
  x: number; // 0.0 to 1.0 (normalized percentage)
  y: number; // 0.0 to 1.0 (normalized percentage)
}

export interface DrawingStroke {
  tool: SensationTool;
  color: string;
  points: DrawingPoint[];
  brushSize: number;
}

export interface PainAreaScores {
  shoulderAndArm: number;
  neck: number;
  back: number;
  hipAndLeg: number;
}

export interface PainMapData {
  gender?: "male" | "female";
  scores?: PainAreaScores;
  strokes?: DrawingStroke[];
  notes?: string;
  maxPainScore?: number;
  [key: string]: any;
}

export type MapData = PainMapData | Record<string, any>;

interface PainMapProps {
  value?: MapData;
  onChange?: (data: MapData) => void;
  readOnly?: boolean;
  clinicalNotes?: string;
  onClinicalNotesChange?: (notes: string) => void;
  gender?: "male" | "female";
  layout?: "side-by-side" | "stacked";
  numberedBadges?: Record<string, number>;
  hideScores?: boolean;
}

const SENSATION_TOOLS: Array<{
  id: SensationTool;
  label: string;
  sublabel?: string;
  color: string;
  badgeClass: string;
  icon: React.ElementType;
}> = [
  {
    id: "pain",
    label: "Pain",
    sublabel: "Focal pain / tenderness",
    color: "#DC2626", // Red
    badgeClass: "border-red-500 bg-red-500 text-white",
    icon: Flame,
  },
  {
    id: "burning",
    label: "Burning Sensation",
    sublabel: "Radiating pain",
    color: "#EA580C", // Orange
    badgeClass: "border-orange-500 bg-orange-500 text-white",
    icon: Zap,
  },
  {
    id: "weakness",
    label: "Muscle Weakness",
    sublabel: "Motor inhibition",
    color: "#9333EA", // Purple
    badgeClass: "border-purple-600 bg-purple-600 text-white",
    icon: Activity,
  },
  {
    id: "numbness",
    label: "Numbness / Tingling",
    sublabel: "Paresthesia / sensory loss",
    color: "#0284C7", // Cyan / Blue
    badgeClass: "border-sky-500 bg-sky-500 text-white",
    icon: Sparkles,
  },
];

export default function PainMap({
  value,
  onChange,
  readOnly = false,
  clinicalNotes = "",
  onClinicalNotesChange,
  gender: genderProp = "male",
  layout = "stacked",
  hideScores = true,
}: PainMapProps) {
  const [gender, setGender] = useState<"male" | "female">(genderProp || "male");

  useEffect(() => {
    if (genderProp) {
      setGender(genderProp);
    }
  }, [genderProp]);

  // Scores State
  const [scores, setScores] = useState<PainAreaScores>({
    shoulderAndArm: 0,
    neck: 0,
    back: 0,
    hipAndLeg: 0,
  });

  // Active Drawing Tool State
  const [activeTool, setActiveTool] = useState<SensationTool>("pain");
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const activeViewRef = useRef<"front" | "back" | null>(null);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  // Canvas Refs for dual-view stacked model
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontContainerRef = useRef<HTMLDivElement | null>(null);
  const backContainerRef = useRef<HTMLDivElement | null>(null);

  // Parse incoming value safely
  useEffect(() => {
    if (value) {
      if (value.scores) {
        setScores({
          shoulderAndArm: Number(value.scores.shoulderAndArm) || 0,
          neck: Number(value.scores.neck) || 0,
          back: Number(value.scores.back) || 0,
          hipAndLeg: Number(value.scores.hipAndLeg) || 0,
        });
      }

      if (Array.isArray(value.strokes)) {
        setStrokes(value.strokes);
      }
      if (value.gender) {
        setGender(value.gender);
      }
    }
  }, [value]);

  // Helper to emit updated state
  const notifyChange = (updatedScores: PainAreaScores, updatedStrokes: DrawingStroke[], updatedGender: "male" | "female") => {
    if (!onChange) return;

    const maxScore = Math.max(
      updatedScores.shoulderAndArm,
      updatedScores.neck,
      updatedScores.back,
      updatedScores.hipAndLeg
    );

    const payload: PainMapData = {
      gender: updatedGender,
      scores: updatedScores,
      strokes: updatedStrokes,
      maxPainScore: maxScore,
      notes: clinicalNotes,
    };

    onChange(payload);
  };

  const handleGenderChange = (newGender: "male" | "female") => {
    if (readOnly) return;
    setGender(newGender);
    notifyChange(scores, strokes, newGender);
  };

  const handleScoreChange = (region: keyof PainAreaScores, val: number) => {
    if (readOnly) return;
    const updatedScores = {
      ...scores,
      [region]: val,
    };
    setScores(updatedScores);
    notifyChange(updatedScores, strokes, gender);
  };

  // Redraw both canvases based on strokes
  const redrawCanvases = useCallback(() => {
    // 1. Redraw Front Canvas (strokes where x <= 0.55)
    const frontCanvas = frontCanvasRef.current;
    if (frontCanvas) {
      const ctx = frontCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
        strokes.forEach((stroke) => {
          const frontPoints = stroke.points
            .filter((p) => p.x <= 0.55)
            .map((p) => ({
              x: Math.min(1, Math.max(0, p.x / 0.5)),
              y: p.y,
            }));

          if (frontPoints.length === 0) return;

          ctx.save();
          if (stroke.tool === "erase") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.lineWidth = stroke.brushSize * 2;
          } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = stroke.color;
            ctx.fillStyle = stroke.color;
            ctx.lineWidth = stroke.brushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = 4;
          }

          if (frontPoints.length === 1) {
            const p = frontPoints[0];
            ctx.beginPath();
            ctx.arc(p.x * frontCanvas.width, p.y * frontCanvas.height, stroke.brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(frontPoints[0].x * frontCanvas.width, frontPoints[0].y * frontCanvas.height);
            for (let i = 1; i < frontPoints.length; i++) {
              ctx.lineTo(frontPoints[i].x * frontCanvas.width, frontPoints[i].y * frontCanvas.height);
            }
            ctx.stroke();
          }
          ctx.restore();
        });
      }
    }

    // 2. Redraw Back Canvas (strokes where x >= 0.45)
    const backCanvas = backCanvasRef.current;
    if (backCanvas) {
      const ctx = backCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, backCanvas.width, backCanvas.height);
        strokes.forEach((stroke) => {
          const backPoints = stroke.points
            .filter((p) => p.x >= 0.45)
            .map((p) => ({
              x: Math.min(1, Math.max(0, (p.x - 0.5) / 0.5)),
              y: p.y,
            }));

          if (backPoints.length === 0) return;

          ctx.save();
          if (stroke.tool === "erase") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
            ctx.lineWidth = stroke.brushSize * 2;
          } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = stroke.color;
            ctx.fillStyle = stroke.color;
            ctx.lineWidth = stroke.brushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = 4;
          }

          if (backPoints.length === 1) {
            const p = backPoints[0];
            ctx.beginPath();
            ctx.arc(p.x * backCanvas.width, p.y * backCanvas.height, stroke.brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(backPoints[0].x * backCanvas.width, backPoints[0].y * backCanvas.height);
            for (let i = 1; i < backPoints.length; i++) {
              ctx.lineTo(backPoints[i].x * backCanvas.width, backPoints[i].y * backCanvas.height);
            }
            ctx.stroke();
          }
          ctx.restore();
        });
      }
    }
  }, [strokes]);

  // Handle Resize and Initial Draw
  useEffect(() => {
    const updateSizes = () => {
      if (frontContainerRef.current && frontCanvasRef.current) {
        const rect = frontContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          frontCanvasRef.current.width = rect.width;
          frontCanvasRef.current.height = rect.height;
        }
      }
      if (backContainerRef.current && backCanvasRef.current) {
        const rect = backContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          backCanvasRef.current.width = rect.width;
          backCanvasRef.current.height = rect.height;
        }
      }
      redrawCanvases();
    };

    updateSizes();
    const observer = new ResizeObserver(updateSizes);
    if (frontContainerRef.current) observer.observe(frontContainerRef.current);
    if (backContainerRef.current) observer.observe(backContainerRef.current);

    return () => observer.disconnect();
  }, [redrawCanvases]);

  // Drawing event handlers for dual views
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): DrawingPoint | null => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { x, y };
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent, view: "front" | "back") => {
    if (readOnly) return;
    const canvas = view === "front" ? frontCanvasRef.current : backCanvasRef.current;
    if (!canvas) return;

    const localPt = getCoordinates(e, canvas);
    if (!localPt) return;

    // Convert local view coords to global [0..1] x space
    const globalX = view === "front" ? localPt.x * 0.5 : 0.5 + localPt.x * 0.5;
    const globalPt = { x: globalX, y: localPt.y };

    setIsDrawing(true);
    activeViewRef.current = view;

    const toolConfig = SENSATION_TOOLS.find((t) => t.id === activeTool);
    const color = toolConfig ? toolConfig.color : "#DC2626";
    const brushSize = activeTool === "erase" ? 22 : 12;

    const newStroke: DrawingStroke = {
      tool: activeTool,
      color,
      points: [globalPt],
      brushSize,
    };

    currentStrokeRef.current = newStroke;

    // Render immediate local dot
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      if (activeTool === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(localPt.x * canvas.width, localPt.y * canvas.height, brushSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(localPt.x * canvas.width, localPt.y * canvas.height, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent, view: "front" | "back") => {
    if (!isDrawing || activeViewRef.current !== view || !currentStrokeRef.current || readOnly) return;
    const canvas = view === "front" ? frontCanvasRef.current : backCanvasRef.current;
    if (!canvas) return;

    const localPt = getCoordinates(e, canvas);
    if (!localPt) return;

    const globalX = view === "front" ? localPt.x * 0.5 : 0.5 + localPt.x * 0.5;
    const globalPt = { x: globalX, y: localPt.y };

    const currentStroke = currentStrokeRef.current;
    currentStroke.points.push(globalPt);

    const ctx = canvas.getContext("2d");
    if (ctx && currentStroke.points.length >= 2) {
      const p1Global = currentStroke.points[currentStroke.points.length - 2];
      const p2Global = currentStroke.points[currentStroke.points.length - 1];

      const p1Local = {
        x: view === "front" ? p1Global.x / 0.5 : (p1Global.x - 0.5) / 0.5,
        y: p1Global.y,
      };
      const p2Local = {
        x: view === "front" ? p2Global.x / 0.5 : (p2Global.x - 0.5) / 0.5,
        y: p2Global.y,
      };

      ctx.save();
      if (currentStroke.tool === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = currentStroke.brushSize * 2;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = currentStroke.color;
        ctx.lineWidth = currentStroke.brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = currentStroke.color;
        ctx.shadowBlur = 4;
      }

      ctx.beginPath();
      ctx.moveTo(p1Local.x * canvas.width, p1Local.y * canvas.height);
      ctx.lineTo(p2Local.x * canvas.width, p2Local.y * canvas.height);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handleEndDraw = () => {
    if (!isDrawing || !currentStrokeRef.current) return;
    setIsDrawing(false);
    activeViewRef.current = null;

    const completedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (completedStroke && completedStroke.points.length > 0) {
      const updatedStrokes = [...strokes, completedStroke];
      setStrokes(updatedStrokes);
      notifyChange(scores, updatedStrokes, gender);
    }
  };

  const handleClearAll = () => {
    if (readOnly) return;
    setStrokes([]);
    notifyChange(scores, [], gender);
  };

  const handleUndo = () => {
    if (readOnly || strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    notifyChange(scores, updated, gender);
  };

  const frontImageSrc = gender === "female" ? "/body_female_front.jpg" : "/body_male_front.jpg";
  const backImageSrc = gender === "female" ? "/body_female_back.jpg" : "/body_male_back.jpg";

  return (
    <div className="space-y-4 w-full">
      {/* 0. 4-Region Pain Scale (Reference Image 2) */}
      {!hideScores && (
        <RegionalPainScale 
          scores={scores}
          onChange={handleScoreChange}
          readOnly={readOnly}
        />
      )}

      {/* 1. Colour Legend Above Views */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="w-3 h-3 rounded-full bg-red-600 shadow-xs inline-block shrink-0" />
          <span>Pain</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="w-3 h-3 rounded-full bg-orange-500 shadow-xs inline-block shrink-0" />
          <span>Burning Sensation</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="w-3 h-3 rounded-full bg-purple-600 shadow-xs inline-block shrink-0" />
          <span>Muscle Weakness</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="w-3 h-3 rounded-full bg-sky-600 shadow-xs inline-block shrink-0" />
          <span>Numbness / Tingling</span>
        </div>
      </div>

      {/* 2. Interactive Drawing Tools Toolbar (When Editing in SOAP / Consult) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Sensation Tool Selectors */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SENSATION_TOOLS.map((t) => {
              const isSelected = activeTool === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTool(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    isSelected
                      ? `${t.badgeClass} shadow-sm ring-2 ring-primary/20 scale-[1.02]`
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setActiveTool("erase")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                activeTool === "erase"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Gender & Undo / Clear actions */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleGenderChange("male")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  gender === "male"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ♂ Male
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange("female")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  gender === "female"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ♀ Female
              </button>
            </div>

            {strokes.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  className="h-8 px-2.5 text-[10px] font-bold rounded-xl border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 px-2.5 text-[10px] font-bold rounded-xl border-slate-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Views: Side-by-side in SOAP Modal, Stacked in Report */}
      <div className={cn(layout === "side-by-side" ? "grid grid-cols-1 sm:grid-cols-2 gap-4 items-start" : "space-y-4")}>
        
        {/* Anterior (Front) View Container */}
        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-between">
          <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mb-2">
            ANTERIOR VIEW
          </div>

          <div
            ref={frontContainerRef}
            className="relative w-full max-w-[340px] aspect-[600/896] bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden select-none touch-none flex items-center justify-center cursor-crosshair"
          >
            {/* Front Anatomy Image */}
            <img
              src={frontImageSrc}
              alt="Anterior View"
              className="w-full h-full object-contain pointer-events-none select-none"
            />

            {/* Front Interactive Drawing Canvas */}
            <canvas
              ref={frontCanvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair select-none touch-none z-10"
              onMouseDown={(e) => handleStartDraw(e, "front")}
              onMouseMove={(e) => handleMoveDraw(e, "front")}
              onMouseUp={handleEndDraw}
              onMouseLeave={handleEndDraw}
              onTouchStart={(e) => handleStartDraw(e, "front")}
              onTouchMove={(e) => handleMoveDraw(e, "front")}
              onTouchEnd={handleEndDraw}
            />
          </div>
        </div>

        {/* Posterior (Back) View Container */}
        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-between">
          <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mb-2">
            POSTERIOR VIEW
          </div>

          <div
            ref={backContainerRef}
            className="relative w-full max-w-[340px] aspect-[600/896] bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden select-none touch-none flex items-center justify-center cursor-crosshair"
          >
            {/* Back Anatomy Image */}
            <img
              src={backImageSrc}
              alt="Posterior View"
              className="w-full h-full object-contain pointer-events-none select-none"
            />

            {/* Back Interactive Drawing Canvas */}
            <canvas
              ref={backCanvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair select-none touch-none z-10"
              onMouseDown={(e) => handleStartDraw(e, "back")}
              onMouseMove={(e) => handleMoveDraw(e, "back")}
              onMouseUp={handleEndDraw}
              onMouseLeave={handleEndDraw}
              onTouchStart={(e) => handleStartDraw(e, "back")}
              onTouchMove={(e) => handleMoveDraw(e, "back")}
              onTouchEnd={handleEndDraw}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
