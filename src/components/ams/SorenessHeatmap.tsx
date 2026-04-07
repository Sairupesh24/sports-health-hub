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
    { id: "neck_ant", label: "Neck", view: "front", path: "M92,55 L108,55 L106,68 L94,68 Z" },
    { id: "shoulder_l_ant", label: "Shoulder (L)", view: "front", path: "M75,72 C65,72 55,82 58,102 L76,102 L85,82 Z" },
    { id: "shoulder_r_ant", label: "Shoulder (R)", view: "front", path: "M125,72 C135,72 145,82 142,102 L124,102 L115,82 Z" },
    { id: "chest_l", label: "Chest (L)", view: "front", path: "M84,82 L100,82 L100,110 L78,112 C76,102 78,92 84,82 Z" },
    { id: "chest_r", label: "Chest (R)", view: "front", path: "M116,82 L100,82 L100,110 L122,112 C124,102 122,92 116,82 Z" },
    { id: "bicep_l", label: "Bicep (L)", view: "front", path: "M56,106 L72,108 L68,138 L50,133 Z" },
    { id: "bicep_r", label: "Bicep (R)", view: "front", path: "M144,106 L128,108 L132,138 L150,133 Z" },
    { id: "forearm_l_ant", label: "Forearm (L)", view: "front", path: "M48,145 L65,145 L62,185 L50,185 Z" },
    { id: "forearm_r_ant", label: "Forearm (R)", view: "front", path: "M152,145 L135,145 L138,185 L150,185 Z" },
    { id: "abs", label: "Abs", view: "front", path: "M86,115 L114,115 L112,150 L88,150 Z" },
    { id: "oblique_l", label: "Obliques (L)", view: "front", path: "M78,115 L84,115 L86,150 L75,150 Z" },
    { id: "oblique_r", label: "Obliques (R)", view: "front", path: "M122,115 L116,115 L114,150 L125,150 Z" },
    { id: "hip_flexor_l", label: "Hip Flexor (L)", view: "front", path: "M72,155 L85,155 L82,175 L70,170 Z" },
    { id: "hip_flexor_r", label: "Hip Flexor (R)", view: "front", path: "M128,155 L115,155 L118,175 L130,170 Z" },
    { id: "quad_l", label: "Quads (L)", view: "front", path: "M75,180 L98,180 L95,230 L70,230 Z" },
    { id: "quad_r", label: "Quads (R)", view: "front", path: "M125,180 L102,180 L105,230 L130,230 Z" },
    { id: "shin_l", label: "Shin (L)", view: "front", path: "M75,235 L95,235 L90,285 L80,285 Z" },
    { id: "shin_r", label: "Shin (R)", view: "front", path: "M125,235 L105,235 L110,285 L120,285 Z" },

    // BACK VIEW
    { id: "neck_post", label: "Neck", view: "back", path: "M92,55 L108,55 L106,68 L94,68 Z" },
    { id: "traps_l", label: "Traps (L)", view: "back", path: "M82,68 L100,58 L100,85 L85,85 Z" },
    { id: "traps_r", label: "Traps (R)", view: "back", path: "M118,68 L100,58 L100,85 L115,85 Z" },
    { id: "shoulder_l_post", label: "Shoulder (L)", view: "back", path: "M75,72 C65,72 55,82 58,102 L76,102 L85,82 Z" },
    { id: "shoulder_r_post", label: "Shoulder (R)", view: "back", path: "M125,72 C135,72 145,82 142,102 L124,102 L115,82 Z" },
    { id: "lats_l", label: "Lats (L)", view: "back", path: "M78,88 L100,88 L100,125 L75,120 Z" },
    { id: "lats_r", label: "Lats (R)", view: "back", path: "M122,88 L100,88 L100,125 L125,120 Z" },
    { id: "tricep_l", label: "Triceps (L)", view: "back", path: "M56,106 L72,108 L68,138 L50,133 Z" },
    { id: "tricep_r", label: "Triceps (R)", view: "back", path: "M144,106 L128,108 L132,138 L150,133 Z" },
    { id: "lower_back", label: "Lower Back", view: "back", path: "M85,128 L115,128 L112,150 L88,150 Z" },
    { id: "hip_abductor_l", label: "Hip Abductor (L)", view: "back", path: "M70,155 L78,155 L75,175 L68,170 Z" },
    { id: "hip_abductor_r", label: "Hip Abductor (R)", view: "back", path: "M130,155 L122,155 L125,175 L132,170 Z" },
    { id: "glute_l", label: "Glutes (L)", view: "back", path: "M78,155 L100,155 L100,185 L75,185 C72,175 72,165 78,155 Z" },
    { id: "glute_r", label: "Glutes (R)", view: "back", path: "M122,155 L100,155 L100,185 L125,185 C128,175 128,165 122,155 Z" },
    { id: "hip_adductor_l", label: "Hip Adductor (L)", view: "back", path: "M95,188 L100,188 L100,225 L92,225 Z" },
    { id: "hip_adductor_r", label: "Hip Adductor (R)", view: "back", path: "M105,188 L100,188 L100,225 L108,225 Z" },
    { id: "hamstring_l", label: "Hamstrings (L)", view: "back", path: "M72,188 L92,188 L88,235 L70,235 Z" },
    { id: "hamstring_r", label: "Hamstrings (R)", view: "back", path: "M128,188 L108,188 L112,235 L130,235 Z" },
    { id: "calf_l", label: "Calves (L)", view: "back", path: "M75,240 L95,240 L90,285 L80,285 Z" },
    { id: "calf_r", label: "Calves (R)", view: "back", path: "M125,240 L105,240 L110,285 L120,285 Z" },
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
        return [id];
    }).flat();

    const renderSilhouette = (view: "front" | "back") => (
        <svg viewBox="0 0 200 300" className="w-full h-auto drop-shadow-xl">
            {/* Base Body Silhouette - Refined for premium look */}
            <path
                d="M100,12 C115,12 125,22 125,38 C125,48 118,55 100,55 C82,55 75,48 75,38 C75,22 85,12 100,12 Z M80,55 C65,55 55,65 52,85 L48,140 C47,150 55,155 60,150 L65,115 L72,115 L68,155 C67,165 75,170 80,165 L100,155 L100,300 L110,300 L110,155 L120,165 C125,170 133,165 132,155 L128,115 L135,115 L140,150 C145,155 153,150 152,140 L148,85 C145,65 135,55 120,55 L80,55 Z"
                fill="currentColor"
                className="text-muted/20 hover:text-muted/30 transition-colors duration-500"
            />
            {/* Interactive Muscle Parts */}
            {bodyParts.filter(p => p.view === view).map((part) => {
                const isSelected = normalizedSelectedZones.includes(part.id);
                return (
                    <path
                        key={part.id}
                        d={part.path}
                        onClick={() => !readOnly && onZoneToggle?.(part.id)}
                        className={cn(
                            "cursor-pointer transition-all duration-300 stroke-[0.5] stroke-muted-foreground/20",
                            isSelected 
                                ? "fill-red-500 hover:fill-red-600 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]" 
                                : "fill-primary/5 hover:fill-primary/25",
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
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-6 border-2 border-slate-200/60 dark:border-slate-800 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none relative overflow-hidden group transition-all hover:scale-[1.02] hover:border-primary/30 duration-500">
                        <div className="absolute -inset-24 bg-gradient-to-br from-primary/5 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />
                        {renderSilhouette("front")}
                    </div>
                </div>
                <div className="flex-1 w-full text-center space-y-3">
                    <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase block">Posterior View</span>
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-6 border-2 border-slate-200/60 dark:border-slate-800 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none relative overflow-hidden group transition-all hover:scale-[1.02] hover:border-primary/30 duration-500">
                        <div className="absolute -inset-24 bg-gradient-to-br from-primary/5 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />
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


