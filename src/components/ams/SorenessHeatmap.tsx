import React from "react";
import { cn } from "@/lib/utils";

interface BodyPart {
    id: string;
    label: string;
    path: string;
    view: "front" | "back";
}

const bodyParts: BodyPart[] = [
    // FRONT VIEW
    { id: "neck_ant", label: "Neck", view: "front", path: "M92,55 C92,55 94,68 100,68 C106,68 108,55 108,55 L104,50 L96,50 Z" },
    { id: "shoulder_l_ant", label: "Shoulder (L)", view: "front", path: "M78,75 C68,75 58,85 62,105 L80,105 L88,85 Z" },
    { id: "shoulder_r_ant", label: "Shoulder (R)", view: "front", path: "M122,75 C132,75 142,85 138,105 L120,105 L112,85 Z" },
    { id: "chest_l", label: "Pectorals (L)", view: "front", path: "M86,85 C92,85 100,85 100,85 L100,115 L78,118 C75,108 78,95 86,85 Z" },
    { id: "chest_r", label: "Pectorals (R)", view: "front", path: "M114,85 C108,85 100,85 100,85 L100,115 L122,118 C125,108 122,95 114,85 Z" },
    { id: "bicep_l", label: "Bicep (L)", view: "front", path: "M60,108 L76,110 L72,140 L54,135 C52,125 55,115 60,108 Z" },
    { id: "bicep_r", label: "Bicep (R)", view: "front", path: "M140,108 L124,110 L128,140 L146,135 C148,125 145,115 140,108 Z" },
    { id: "forearm_l_ant", label: "Forearm (L)", view: "front", path: "M52,148 L68,148 L65,190 L52,190 C48,175 48,160 52,148 Z" },
    { id: "forearm_r_ant", label: "Forearm (R)", view: "front", path: "M148,148 L132,148 L135,190 L148,190 C152,175 152,160 148,148 Z" },
    { id: "abs", label: "Abdominals", view: "front", path: "M88,118 L112,118 C115,135 115,145 112,155 L88,155 C85,145 85,135 88,118 Z" },
    { id: "oblique_l", label: "Obliques (L)", view: "front", path: "M76,120 L86,120 C85,135 85,145 86,155 L74,155 C72,140 73,130 76,120 Z" },
    { id: "oblique_r", label: "Obliques (R)", view: "front", path: "M124,120 L114,120 C115,135 115,145 114,155 L126,155 C128,140 127,130 124,120 Z" },
    { id: "hip_flexor_l", label: "Hip Flexor (L)", view: "front", path: "M72,158 L88,160 L85,180 L70,175 Z" },
    { id: "hip_flexor_r", label: "Hip Flexor (R)", view: "front", path: "M128,158 L112,160 L115,180 L130,175 Z" },
    { id: "quad_l", label: "Quadriceps (L)", view: "front", path: "M74,185 C85,185 98,185 98,185 L95,240 L68,235 C65,215 68,195 74,185 Z" },
    { id: "quad_r", label: "Quadriceps (R)", view: "front", path: "M126,185 C115,185 102,185 102,185 L105,240 L132,235 C135,215 132,195 126,185 Z" },
    { id: "groin_l", label: "Groin (L)", view: "front", path: "M90,160 L100,160 L100,185 L92,185 Z" },
    { id: "groin_r", label: "Groin (R)", view: "front", path: "M110,160 L100,160 L100,185 L108,185 Z" },
    { id: "shin_l", label: "Shin (L)", view: "front", path: "M78,245 L95,245 L90,295 L82,295 Z" },
    { id: "shin_r", label: "Shin (R)", view: "front", path: "M122,245 L105,245 L110,295 L118,295 Z" },

    // BACK VIEW
    { id: "neck_post", label: "Neck", view: "back", path: "M92,55 C92,55 94,68 100,68 C106,68 108,55 108,55 L104,50 L96,50 Z" },
    { id: "traps_l", label: "Traps (L)", view: "back", path: "M85,70 C92,65 100,60 100,60 L100,90 L85,90 Z" },
    { id: "traps_r", label: "Traps (R)", view: "back", path: "M115,70 C108,65 100,60 100,60 L100,90 L115,90 Z" },
    { id: "shoulder_l_post", label: "Shoulder (L)", view: "back", path: "M78,75 C68,75 58,85 62,105 L80,105 L88,85 Z" },
    { id: "shoulder_r_post", label: "Shoulder (R)", view: "back", path: "M122,75 C132,75 142,85 138,105 L120,105 L112,85 Z" },
    { id: "lats_l", label: "Lats (L)", view: "back", path: "M78,92 L100,92 L100,135 L72,125 C70,110 72,100 78,92 Z" },
    { id: "lats_r", label: "Lats (R)", view: "back", path: "M122,92 L100,92 L100,135 L128,125 C130,110 128,100 122,92 Z" },
    { id: "tricep_l", label: "Triceps (L)", view: "back", path: "M60,108 L76,110 L72,140 L54,135 C52,125 55,115 60,108 Z" },
    { id: "tricep_r", label: "Triceps (R)", view: "back", path: "M140,108 L124,110 L128,140 L146,135 C148,125 145,115 140,108 Z" },
    { id: "lower_back", label: "Lower Back", view: "back", path: "M85,135 L115,135 L112,158 L88,158 Z" },
    { id: "glute_l", label: "Gluteus (L)", view: "back", path: "M75,160 C72,175 72,190 75,195 L100,195 L100,160 Z" },
    { id: "glute_r", label: "Gluteus (R)", view: "back", path: "M125,160 C128,175 128,190 125,195 L100,195 L100,160 Z" },
    { id: "hamstring_l", label: "Hamstrings (L)", view: "back", path: "M72,200 L95,200 L90,250 L70,250 C68,230 68,215 72,200 Z" },
    { id: "hamstring_r", label: "Hamstrings (R)", view: "back", path: "M128,200 L105,200 L110,250 L130,250 C132,230 132,215 128,200 Z" },
    { id: "calf_l", label: "Calf (L)", view: "back", path: "M78,255 L95,255 L90,300 L82,300 Z" },
    { id: "calf_r", label: "Calf (R)", view: "back", path: "M122,255 L105,255 L110,300 L118,300 Z" },
];


interface SorenessHeatmapProps {
    onZoneToggle?: (zoneId: string) => void;
    selectedZones: string[];
    readOnly?: boolean;
}

export default function SorenessHeatmap({ onZoneToggle, selectedZones, readOnly = false }: SorenessHeatmapProps) {
    // Map old IDs to new ones for backward compatibility
    // Map old/database IDs to current ones for maximum compatibility
    const zones = Array.isArray(selectedZones) ? selectedZones : [];
    const normalizedSelectedZones = zones.map(id => {
        // Universal normalization: remove _ant/_post for checking existence if needed
        // but since we render both views, it's better to map specifically
        if (id === "left_shoulder" || id === "shoulder_l") return ["shoulder_l_ant", "shoulder_l_post"];
        if (id === "right_shoulder" || id === "shoulder_r") return ["shoulder_r_ant", "shoulder_r_post"];
        if (id === "left_quad" || id === "quad_l") return ["quad_l"];
        if (id === "right_quad" || id === "quad_r") return ["quad_r"];
        if (id === "left_hamstring" || id === "hamstring_l") return ["hamstring_l"];
        if (id === "right_hamstring" || id === "hamstring_r") return ["hamstring_r"];
        if (id === "neck") return ["neck_ant", "neck_post"];
        if (id === "shin_l" || id === "left_shin") return ["shin_l"];
        if (id === "shin_r" || id === "right_shin") return ["shin_r"];
        if (id === "hip_adductor_l" || id === "left_groin") return ["groin_l"];
        if (id === "hip_adductor_r" || id === "right_groin") return ["groin_r"];
        return [id];
    }).flat();

    const renderSilhouette = (view: "front" | "back") => (
        <svg viewBox="0 0 200 300" className="w-full h-auto drop-shadow-2xl">
            <defs>
                <linearGradient id="painGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            {/* Base Body Silhouette - Refined for premium look */}
            <path
                d="M100,12 C115,12 125,22 125,38 C125,48 118,55 100,55 C82,55 75,48 75,38 C75,22 85,12 100,12 Z M80,55 C65,55 55,65 52,85 L48,140 C47,150 55,155 60,150 L65,115 L72,115 L68,155 C67,165 75,170 80,165 L100,155 L100,300 L110,300 L110,155 L120,165 C125,170 133,165 132,155 L128,115 L135,115 L140,150 C145,155 153,150 152,140 L148,85 C145,65 135,55 120,55 L80,55 Z"
                fill="currentColor"
                className="text-slate-200 dark:text-slate-800 transition-colors duration-500 stroke-slate-300 dark:stroke-slate-700 stroke-[1]"
            />
            {/* Skeleton Layer - More visible markers */}
            <g className="opacity-40 stroke-slate-400 dark:stroke-slate-500 stroke-[0.8] fill-none pointer-events-none">
                <path d="M100,55 L100,155" /> {/* Spine */}
                <path d="M85,85 Q100,75 115,85" /> {/* Ribcage top */}
                <path d="M80,105 Q100,95 120,105" /> {/* Ribcage mid */}
                <path d="M78,125 Q100,115 122,125" /> {/* Ribcage bottom */}
                <path d="M100,155 L85,175 M100,155 L115,175" /> {/* Pelvis */}
            </g>
            {/* Interactive Muscle Parts */}
            {bodyParts.filter(p => p.view === view).map((part) => {
                const isSelected = normalizedSelectedZones.includes(part.id);
                return (
                    <path
                        key={part.id}
                        d={part.path}
                        onClick={() => !readOnly && onZoneToggle?.(part.id)}
                        className={cn(
                            "cursor-pointer transition-all duration-300",
                            isSelected 
                                ? "fill-[url(#painGradient)] filter-[url(#glow)] stroke-red-800 stroke-[0.5]" 
                                : "fill-white/80 dark:fill-slate-700/80 hover:fill-primary/30 stroke-slate-400/50 dark:stroke-slate-500/50 stroke-[0.5]",
                            readOnly && "pointer-events-none"
                        )}
                    >
                        <title>{part.label}</title>
                    </path>
                );
            })}
        </svg>
    );

    return (
        <div className={cn("w-full transition-all duration-700 ease-in-out", readOnly ? "max-w-md mx-auto" : "max-w-2xl mx-auto p-2")}>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-6 md:gap-10">
                <div className="flex-1 w-full text-center space-y-3">
                    <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase block">Anterior View</span>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden group transition-all hover:border-primary/30 duration-500">
                        {renderSilhouette("front")}
                    </div>
                </div>
                <div className="flex-1 w-full text-center space-y-3">
                    <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase block">Posterior View</span>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden group transition-all hover:border-primary/30 duration-500">
                        {renderSilhouette("back")}
                    </div>
                </div>
            </div>


            {!readOnly && normalizedSelectedZones.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2 justify-center animate-in fade-in zoom-in-95 duration-700">
                    {normalizedSelectedZones.map(id => {
                        const part = bodyParts.find(p => p.id === id);
                        if (!part) return null;
                        return (
                            <div key={id} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 text-[11px] font-bold shadow-sm backdrop-blur-md">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                                {part.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


