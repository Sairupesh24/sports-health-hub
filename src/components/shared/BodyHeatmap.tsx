import React, { useState } from "react";

interface Region {
  id: string;
  label: string;
  view: "front" | "back";
  path: string;
}

const REGIONS: Region[] = [
  // FRONT VIEW
  { id: "neck", label: "Neck", view: "front", path: "M 88,74 L 112,74 L 115,90 L 85,90 Z" },
  { id: "shoulder-left", label: "Left Shoulder", view: "front", path: "M 80,90 C 70,90 60,95 60,110 C 60,122 72,122 80,115 Z" },
  { id: "shoulder-right", label: "Right Shoulder", view: "front", path: "M 120,90 C 130,90 140,95 140,110 C 140,122 128,122 120,115 Z" },
  { id: "chest", label: "Chest", view: "front", path: "M 80,90 L 120,90 L 122,140 L 78,140 Z" },
  { id: "core", label: "Core / Abdomen", view: "front", path: "M 78,140 L 122,140 L 120,220 L 80,220 Z" },
  { id: "hip-left", label: "Left Hip", view: "front", path: "M 80,220 L 100,220 L 100,260 L 72,260 Z" },
  { id: "hip-right", label: "Right Hip", view: "front", path: "M 100,220 L 120,220 L 128,260 L 100,260 Z" },
  { id: "quad-left", label: "Left Quad", view: "front", path: "M 72,260 L 100,260 L 98,360 L 68,360 Z" },
  { id: "quad-right", label: "Right Quad", view: "front", path: "M 100,260 L 128,260 L 132,360 L 102,360 Z" },
  { id: "knee-left", label: "Left Knee", view: "front", path: "M 68,360 L 98,360 L 96,390 L 72,390 Z" },
  { id: "knee-right", label: "Right Knee", view: "front", path: "M 102,360 L 132,360 L 128,390 L 104,390 Z" },
  { id: "calf-left", label: "Left Calf", view: "front", path: "M 72,390 L 96,390 L 92,470 L 78,470 Z" },
  { id: "calf-right", label: "Right Calf", view: "front", path: "M 104,390 L 128,390 L 122,470 L 108,470 Z" },
  { id: "elbow-left", label: "Left Elbow", view: "front", path: "M 52,175 C 45,175 42,190 45,205 C 50,205 55,190 52,175 Z" },
  { id: "elbow-right", label: "Right Elbow", view: "front", path: "M 148,175 C 155,175 158,190 155,205 C 150,205 145,190 148,175 Z" },

  // BACK VIEW
  { id: "neck", label: "Neck", view: "back", path: "M 88,74 L 112,74 L 115,90 L 85,90 Z" },
  { id: "shoulder-left", label: "Left Shoulder", view: "back", path: "M 80,90 C 70,90 60,95 60,110 C 60,122 72,122 80,115 Z" },
  { id: "shoulder-right", label: "Right Shoulder", view: "back", path: "M 120,90 C 130,90 140,95 140,110 C 140,122 128,122 120,115 Z" },
  { id: "upper-back", label: "Upper Back", view: "back", path: "M 80,90 L 120,90 L 122,150 L 78,150 Z" },
  { id: "lower-back", label: "Lower Back", view: "back", path: "M 78,150 L 122,150 L 120,220 L 80,220 Z" },
  { id: "glute-left", label: "Left Glute", view: "back", path: "M 80,220 L 100,220 L 100,265 L 72,265 Z" },
  { id: "glute-right", label: "Right Glute", view: "back", path: "M 100,220 L 120,220 L 128,265 L 100,265 Z" },
  { id: "hamstring-left", label: "Left Hamstring", view: "back", path: "M 72,265 L 100,265 L 98,360 L 68,360 Z" },
  { id: "hamstring-right", label: "Right Hamstring", view: "back", path: "M 100,265 L 128,265 L 132,360 L 102,360 Z" },
  { id: "knee-left", label: "Left Knee", view: "back", path: "M 68,360 L 98,360 L 96,390 L 72,390 Z" },
  { id: "knee-right", label: "Right Knee", view: "back", path: "M 102,360 L 132,360 L 128,390 L 104,390 Z" },
  { id: "calf-left", label: "Left Calf", view: "back", path: "M 72,390 L 96,390 L 92,470 L 78,470 Z" },
  { id: "calf-right", label: "Right Calf", view: "back", path: "M 104,390 L 128,390 L 122,470 L 108,470 Z" },
  { id: "elbow-left", label: "Left Elbow", view: "back", path: "M 52,175 C 45,175 42,190 45,205 C 50,205 55,190 52,175 Z" },
  { id: "elbow-right", label: "Right Elbow", view: "back", path: "M 148,175 C 155,175 158,190 155,205 C 150,205 145,190 148,175 Z" },
];

interface BodyHeatmapProps {
  selectedRegions: string[];
  onToggleRegion: (regionId: string) => void;
  readOnly?: boolean;
}

export default function BodyHeatmap({
  selectedRegions,
  onToggleRegion,
  readOnly = false,
}: BodyHeatmapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<{ id: string; label: string; x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, regionId: string, label: string) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgEl = e.currentTarget.ownerSVGElement;
    if (svgEl) {
      const svgRect = svgEl.getBoundingClientRect();
      // Position tooltip near cursor relative to the SVG container
      setHoveredRegion({
        id: regionId,
        label,
        x: e.clientX - svgRect.left + 15,
        y: e.clientY - svgRect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredRegion(null);
  };

  const renderFigure = (view: "front" | "back") => {
    return (
      <div className="relative w-full max-w-[280px] bg-slate-950/45 dark:bg-slate-900/30 border border-slate-800/80 rounded-[2.5rem] p-6 shadow-inner transition-all hover:border-primary/20 duration-500 flex flex-col items-center">
        <span className="text-[10px] font-black tracking-[0.25em] text-slate-500 uppercase mb-4">
          {view === "front" ? "Anterior (Front)" : "Posterior (Back)"}
        </span>

        <svg viewBox="0 0 200 480" className="w-full h-auto drop-shadow-2xl select-none">
          {/* Head & Neck Guide (Visual Only) */}
          <ellipse
            cx="100"
            cy="40"
            rx="28"
            ry="34"
            className="fill-slate-100/5 dark:fill-slate-800/20 stroke-slate-800/50 stroke-[0.8]"
          />

          {/* Visual Guides: Arm connectors (Visual Only) */}
          {/* Left Upper Arm */}
          <path
            d="M 60,110 L 52,175 L 62,175 L 75,115 Z"
            className="fill-slate-100/5 dark:fill-slate-800/20 stroke-slate-800/50 stroke-[0.8]"
          />
          {/* Left Forearm */}
          <path
            d="M 52,205 L 48,270 L 58,270 L 62,205 Z"
            className="fill-slate-100/5 dark:fill-slate-800/20 stroke-slate-800/50 stroke-[0.8]"
          />
          {/* Right Upper Arm */}
          <path
            d="M 140,110 L 148,175 L 138,175 L 125,115 Z"
            className="fill-slate-100/5 dark:fill-slate-800/20 stroke-slate-800/50 stroke-[0.8]"
          />
          {/* Right Forearm */}
          <path
            d="M 148,205 L 152,270 L 142,270 L 138,205 Z"
            className="fill-slate-100/5 dark:fill-slate-800/20 stroke-slate-800/50 stroke-[0.8]"
          />

          {/* Interactive Regions */}
          {REGIONS.filter((r) => r.view === view).map((region) => {
            const isSelected = selectedRegions.includes(region.id);

            // Compute classes / inline styles based on selection/hover state
            let fill = "rgba(255, 255, 255, 0.08)";
            let stroke = "#334155";
            let strokeWidth = "1";

            if (isSelected) {
              fill = "rgba(239, 68, 68, 0.7)"; // Red heat overlay
              stroke = "#EF4444";
            }

            return (
              <path
                key={`${region.view}-${region.id}`}
                d={region.path}
                onClick={() => !readOnly && onToggleRegion(region.id)}
                onMouseMove={(e) => handleMouseMove(e, region.id, region.label)}
                onMouseLeave={handleMouseLeave}
                className={`transition-all duration-300 ${
                  readOnly ? "pointer-events-none" : "cursor-pointer"
                }`}
                style={{
                  fill,
                  stroke,
                  strokeWidth: isSelected ? "1.5" : strokeWidth,
                }}
                // Hover effect handled via CSS style attributes for inline consistency
                onMouseEnter={(e) => {
                  if (readOnly) return;
                  if (!isSelected) {
                    e.currentTarget.style.fill = "rgba(200, 241, 53, 0.3)"; // Volt green hover hint
                    e.currentTarget.style.stroke = "#C8F135"; // Volt green outline
                    e.currentTarget.style.strokeWidth = "1.5";
                  }
                }}
                onMouseOut={(e) => {
                  if (readOnly) return;
                  if (!isSelected) {
                    e.currentTarget.style.fill = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.stroke = "#334155";
                    e.currentTarget.style.strokeWidth = "1";
                  }
                }}
              />
            );
          })}
        </svg>

        {/* Custom SVG-Relative Tooltip */}
        {hoveredRegion && !readOnly && (
          <div
            className="absolute pointer-events-none bg-slate-950 border border-primary/40 text-slate-100 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl z-50 backdrop-blur-md"
            style={{
              left: hoveredRegion.x,
              top: hoveredRegion.y,
            }}
          >
            {hoveredRegion.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
      {renderFigure("front")}
      {renderFigure("back")}
    </div>
  );
}
