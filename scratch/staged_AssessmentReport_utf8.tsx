import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
    FileSpreadsheet, FileUp, Activity, User, Calendar, Printer, Save, 
    Search, CheckCircle2, ChevronRight, AlertCircle, TrendingUp,
    RefreshCw, Clock, Heart, Scale, Ruler, FileText, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Schema Definitions
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export interface BalanceRatioMetric {
    name: string;
    leftDev: number;
    rightDev: number;
    hasLeft: boolean;
    hasRight: boolean;
}

export interface AssessmentReportData {
  reportMetadata: {
    clientName: string;
    birthDate: string;
    bmi: number;
    testDate: string;
    testType: string;
    weight?: string;
    height?: string;
  };
  anatomicalDeficits: {
    [muscleRegionKey: string]: {
      mobilityPercentDeviation: number; // Sheet 2
      strengthPercentDeviation: number; // Sheet 3
      balancePercentDeviation: number;  // Sheet 4
    };
  };
  balanceRatios?: BalanceRatioMetric[]; // Strength balance sliders
}

interface SVGBodyPart {
    id: string;
    label: string;
    path: string;
    view: "front" | "back";
    mappedKey: string;
}

const bodyParts: SVGBodyPart[] = [
    // FRONT VIEW (ANTERIOR) - Center Axis X = 265
    { id: "neck_ant", label: "Neck", view: "front", mappedKey: "cervical_spine", path: "M235,160 C235,175 250,215 265,220 C280,215 295,175 295,160 C280,165 250,165 235,160 Z" },
    { id: "shoulder_l_ant", label: "Shoulder (L)", view: "front", mappedKey: "shoulder_left", path: "M180,205 C150,210 135,230 123,285 C145,295 170,285 180,280 C182,250 182,220 180,205 Z" },
    { id: "shoulder_r_ant", label: "Shoulder (R)", view: "front", mappedKey: "shoulder_right", path: "M350,205 C380,210 395,230 407,285 C385,295 360,285 350,280 C348,250 348,220 350,205 Z" },
    { id: "chest_l", label: "Pectorals (L)", view: "front", mappedKey: "chest_left", path: "M185,215 C175,250 180,300 215,310 C240,312 260,300 265,290 L265,222 C240,222 210,215 185,215 Z" },
    { id: "chest_r", label: "Pectorals (R)", view: "front", mappedKey: "chest_right", path: "M345,215 C355,250 350,300 315,310 C290,312 270,300 265,290 L265,222 C290,222 320,215 345,215 Z" },
    { id: "bicep_l", label: "Bicep (L)", view: "front", mappedKey: "arm_left", path: "M123,285 C115,320 118,360 132,375 C145,370 160,350 165,330 C170,310 175,295 175,285 Z" },
    { id: "bicep_r", label: "Bicep (R)", view: "front", mappedKey: "arm_right", path: "M407,285 C415,320 412,360 398,375 C385,370 370,350 365,330 C360,310 355,295 355,285 Z" },
    { id: "forearm_l_ant", label: "Forearm (L)", view: "front", mappedKey: "arm_left", path: "M132,375 C110,400 80,450 78,505 C95,510 115,480 130,440 L165,375 Z" },
    { id: "forearm_r_ant", label: "Forearm (R)", view: "front", mappedKey: "arm_right", path: "M398,375 C420,400 450,450 452,505 C435,510 415,480 400,440 L365,375 Z" },
    { id: "abs", label: "Abdominals", view: "front", mappedKey: "abs", path: "M215,310 L315,310 C315,360 305,400 295,430 L235,430 C225,400 215,360 215,310 Z" },
    { id: "oblique_l", label: "Obliques (L)", view: "front", mappedKey: "oblique_left", path: "M185,310 C185,350 190,400 200,430 L235,430 C225,400 215,360 215,310 Z" },
    { id: "oblique_r", label: "Obliques (R)", view: "front", mappedKey: "oblique_right", path: "M345,310 C345,350 340,400 330,430 L295,430 C305,400 315,360 315,310 Z" },
    { id: "groin_l", label: "Groin (L)", view: "front", mappedKey: "groin_left", path: "M235,430 L265,430 L265,500 L230,490 Z" },
    { id: "groin_r", label: "Groin (R)", view: "front", mappedKey: "groin_right", path: "M295,430 L265,430 L265,500 L300,490 Z" },
    { id: "hip_flexor_l", label: "Hip Flexor (L)", view: "front", mappedKey: "hip_left", path: "M200,430 L235,430 L230,490 L190,480 Z" },
    { id: "hip_flexor_r", label: "Hip Flexor (R)", view: "front", mappedKey: "hip_right", path: "M330,430 L295,430 L300,490 L340,480 Z" },
    { id: "quad_l", label: "Quadriceps (L)", view: "front", mappedKey: "knee_left", path: "M190,480 C185,550 185,620 195,680 L255,680 C260,620 260,550 230,490 Z" },
    { id: "quad_r", label: "Quadriceps (R)", view: "front", mappedKey: "knee_right", path: "M340,480 C345,550 345,620 335,680 L275,680 C270,620 270,550 300,490 Z" },
    { id: "shin_l", label: "Shin (L)", view: "front", mappedKey: "shin_left", path: "M195,700 C190,750 195,850 210,910 L245,910 C245,850 240,750 245,700 Z" },
    { id: "shin_r", label: "Shin (R)", view: "front", mappedKey: "shin_right", path: "M335,700 C340,750 335,850 320,910 L285,910 C285,850 290,750 285,700 Z" },

    // BACK VIEW (POSTERIOR) - Center Axis X = 763
    { id: "neck_post", label: "Neck", view: "back", mappedKey: "cervical_spine", path: "M733,160 C733,175 748,215 763,220 C778,215 793,175 793,160 C778,165 748,165 733,160 Z" },
    { id: "traps_l", label: "Traps (L)", view: "back", mappedKey: "traps_left", path: "M733,180 C713,185 688,200 673,220 C703,240 743,260 763,280 L763,180 Z" },
    { id: "traps_r", label: "Traps (R)", view: "back", mappedKey: "traps_right", path: "M793,180 C813,185 838,200 853,220 C823,240 783,260 763,280 L763,180 Z" },
    { id: "shoulder_l_post", label: "Shoulder (L)", view: "back", mappedKey: "shoulder_left", path: "M678,205 C648,210 633,230 621,285 C643,295 668,285 678,280 C680,250 680,220 678,205 Z" },
    { id: "shoulder_r_post", label: "Shoulder (R)", view: "back", mappedKey: "shoulder_right", path: "M848,205 C878,210 893,230 905,285 C883,295 858,285 848,280 C846,250 846,220 848,205 Z" },
    { id: "lats_l", label: "Lats (L)", view: "back", mappedKey: "lats_left", path: "M673,280 C693,290 743,300 763,300 L763,400 L698,400 C688,360 683,320 673,280 Z" },
    { id: "lats_r", label: "Lats (R)", view: "back", mappedKey: "lats_right", path: "M853,280 C833,290 783,300 763,300 L763,400 L828,400 C838,360 843,320 853,280 Z" },
    { id: "tricep_l", label: "Triceps (L)", view: "back", mappedKey: "arm_left", path: "M621,285 C613,320 616,360 630,375 C643,370 658,350 663,330 C668,310 673,295 673,285 Z" },
    { id: "tricep_r", label: "Triceps (R)", view: "back", mappedKey: "arm_right", path: "M905,285 C913,320 910,360 896,375 C883,370 868,350 863,330 C858,310 853,295 853,285 Z" },
    { id: "forearm_l_post", label: "Forearm (L)", view: "back", mappedKey: "arm_left", path: "M630,375 C608,400 578,450 576,505 C593,510 613,480 628,440 L663,375 Z" },
    { id: "forearm_r_post", label: "Forearm (R)", view: "back", mappedKey: "arm_right", path: "M896,375 C918,400 948,450 950,505 C933,510 913,480 898,440 L863,375 Z" },
    { id: "lower_back", label: "Lower Back", view: "back", mappedKey: "lumbar_spine", path: "M713,400 L813,400 L808,470 L718,470 Z" },
    { id: "glute_l", label: "Gluteus (L)", view: "back", mappedKey: "hip_left", path: "M688,470 L763,470 L763,580 L688,560 C678,530 681,500 688,470 Z" },
    { id: "glute_r", label: "Gluteus (R)", view: "back", mappedKey: "hip_right", path: "M838,470 L763,470 L763,580 L838,560 C848,530 845,500 838,470 Z" },
    { id: "hamstring_l", label: "Hamstrings (L)", view: "back", mappedKey: "knee_left", path: "M688,580 L758,580 L753,740 L698,740 Z" },
    { id: "hamstring_r", label: "Hamstrings (R)", view: "back", mappedKey: "knee_right", path: "M838,580 L768,580 L773,740 L828,740 Z" },
    { id: "calf_l", label: "Calf (L)", view: "back", mappedKey: "calf_left", path: "M698,740 C693,780 698,860 713,920 L753,920 C753,860 748,780 753,740 Z" },
    { id: "calf_r", label: "Calf (R)", view: "back", mappedKey: "calf_right", path: "M828,740 C833,780 828,860 813,920 L773,920 C773,860 778,780 773,740 Z" }
];


// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function normalizeMeasurement(key: string): string {
    let normalized = key
        .replace(/^\d+[\s\-_]*/, '') // strip all leading numeric machine codes (e.g., 110, 130, 460) and following spaces/dashes/underscores
        .replace(/^(mobility|strengthBalance|strength|balance)/i, '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/__+/g, '_');

    const mappings: Record<string, string> = {
        'cervical_sagittal_extension': 'cervical_spine_extension',
        'cervical_sagittal_flexion': 'cervical_spine_flexion',
        'cervical_lateral_left': 'cervical_spine_lateral_left',
        'cervical_lateral_right': 'cervical_spine_lateral_right',
        'cervical_rotation_left': 'cervical_spine_rotation_left',
        'cervical_rotation_right': 'cervical_spine_rotation_right',
        'lumbar_sagittal_extension': 'lumbar_spine_extension',
        'lumbar_sagittal_flexion': 'lumbar_spine_flexion',
        'lumbar_lateral_left': 'lumbar_spine_lateral_left',
        'lumbar_lateral_right': 'lumbar_spine_lateral_right',
        'lumbar_rotation_left': 'lumbar_spine_rotation_left',
        'lumbar_rotation_right': 'lumbar_spine_rotation_right',
    };

    return mappings[normalized] || normalized;
}

function getMuscleRegionFromParam(param: string): string | null {
    const p = normalizeMeasurement(param);
    if (p.includes("cervical") || p.includes("neck")) return "cervical_spine";
    if (p.includes("lumbar") || p.includes("lower_back") || p.includes("erector")) return "lumbar_spine";
    if (p.includes("shoulder_left") || p.includes("deltoid_left") || (p.includes("shoulder") && p.includes("left"))) return "shoulder_left";
    if (p.includes("shoulder_right") || p.includes("deltoid_right") || (p.includes("shoulder") && p.includes("right"))) return "shoulder_right";
    
    if (p.includes("bicep_left") || p.includes("tricep_left") || p.includes("forearm_left") || (p.includes("arm") && p.includes("left")) || p.includes("elbow_flexion_left") || p.includes("elbow_extension_left") || p.includes("wrist_flexion_left") || p.includes("wrist_extension_left")) return "arm_left";
    if (p.includes("bicep_right") || p.includes("tricep_right") || p.includes("forearm_right") || (p.includes("arm") && p.includes("right")) || p.includes("elbow_flexion_right") || p.includes("elbow_extension_right") || p.includes("wrist_flexion_right") || p.includes("wrist_extension_right")) return "arm_right";
    
    if (p.includes("hip_flexor_left") || p.includes("glute_left") || (p.includes("hip") && p.includes("left")) || p.includes("gluteus_left") || p.includes("hip_flexion_left") || p.includes("hip_extension_left")) return "hip_left";
    if (p.includes("hip_flexor_right") || p.includes("glute_right") || (p.includes("hip") && p.includes("right")) || p.includes("gluteus_right") || p.includes("hip_flexion_right") || p.includes("hip_extension_right")) return "hip_right";
    
    if (p.includes("quad_left") || p.includes("hamstring_left") || p.includes("knee_flexion_left") || p.includes("knee_extension_left") || (p.includes("knee") && p.includes("left"))) return "knee_left";
    if (p.includes("quad_right") || p.includes("hamstring_right") || p.includes("knee_flexion_right") || p.includes("knee_extension_right") || (p.includes("knee") && p.includes("right"))) return "knee_right";
    
    if (p.includes("shin_left") || p.includes("tibialis_left") || (p.includes("shin") && p.includes("left")) || p.includes("dorsiflexion_left")) return "shin_left";
    if (p.includes("shin_right") || p.includes("tibialis_right") || (p.includes("shin") && p.includes("right")) || p.includes("dorsiflexion_right")) return "shin_right";
    
    if (p.includes("calf_left") || p.includes("gastrocnemius_left") || (p.includes("calf") && p.includes("left")) || p.includes("plantarflexion_left") || p.includes("ankle_left")) return "calf_left";
    if (p.includes("calf_right") || p.includes("gastrocnemius_right") || (p.includes("calf") && p.includes("right")) || p.includes("plantarflexion_right") || p.includes("ankle_right")) return "calf_right";
    
    if (p.includes("traps_left") || p.includes("trapezius_left")) return "traps_left";
    if (p.includes("traps_right") || p.includes("trapezius_right")) return "traps_right";
    
    if (p.includes("lats_left") || p.includes("latissimus_left")) return "lats_left";
    if (p.includes("lats_right") || p.includes("latissimus_right")) return "lats_right";
    
    if (p.includes("abs") || p.includes("abdominals") || p.includes("rectus")) return "abs";
    if (p.includes("oblique_left")) return "oblique_left";
    if (p.includes("oblique_right")) return "oblique_right";
    if (p.includes("groin_left") || p.includes("adductor_left") || (p.includes("groin") && p.includes("left"))) return "groin_left";
    if (p.includes("groin_right") || p.includes("adductor_right") || (p.includes("groin") && p.includes("right"))) return "groin_right";
    
    if (p.includes("chest_left") || p.includes("pectoral_left")) return "chest_left";
    if (p.includes("chest_right") || p.includes("pectoral_right")) return "chest_right";
 
    return null;
}

function convertExcelDate(serial: any): string {
    if (!serial) return "";
    if (typeof serial === "number") {
        try {
            const date = XLSX.SSF.parse_date_code(serial);
            return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        } catch (e) {
            return String(serial).trim();
        }
    }
    return String(serial).trim();
}

const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "N/A";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Main Workspace Component
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export default function AssessmentReport() {
    const { profile } = useAuth();
    const isMobile = useIsMobile();

    // Refs for captures
    const page1Ref = useRef<HTMLDivElement>(null);
    const page2Ref = useRef<HTMLDivElement>(null);

    // States
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [reportData, setReportData] = useState<AssessmentReportData | null>(null);
    const [clinicalNotes, setClinicalNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Visualisation toggle: 'mobility' | 'strength' | 'balance' | 'combined'
    const [visualMode, setVisualMode] = useState<"mobility" | "strength" | "balance" | "combined">("combined");

    // Client Selector
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [clientSearch, setClientSearch] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Mobile specific tab switcher: 'client_info' | 'anterior' | 'posterior' | 'balance'
    const [mobileTab, setMobileTab] = useState<"anterior" | "posterior">("anterior");

    // History list
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historyVisible, setHistoryVisible] = useState(false);

    // Hover state for interactive anatomical body map zones
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    // Clients list filtered by search query
    const filteredClients = clients.filter((c: any) =>
        `${c.first_name || ''} ${c.last_name || ''} ${c.uhid || ''}`
            .toLowerCase()
            .includes(clientSearch.toLowerCase())
    );

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const data = await apiFetch<any[]>('/clients');
            setClients(data || []);
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    };

    const fetchHistory = async (uhid: string) => {
        if (!uhid) return;
        setIsLoadingHistory(true);
        try {
            const data = await apiFetch<any[]>(`/reports/excel-diagnostic/history/${uhid}`);
            setHistoryRecords(data || []);
        } catch (err: any) {
            console.error("History fetch error:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // 4-Sheet Excel Parser Hook
    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const processExcelFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        try {
            const buffer = await file.arrayBuffer();
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });

            if (workbook.SheetNames.length < 4) {
                throw new Error("Invalid testing file template. Diagnostic Excel must contain at least 4 sheets (Customer Info, Mobility, Strength, Strength balance).");
            }

            // Sheet 1: Customer information
            let clientName = "";
            let birthDate = "";
            let weight = "";
            let height = "";
            let bmi = 0;
            let testDate = new Date().toISOString().split('T')[0];
            let testType = "Musculoskeletal Profiling";

            const sheet1 = workbook.Sheets[workbook.SheetNames[0]];
            if (sheet1) {
                const rows = XLSX.utils.sheet_to_json<any[]>(sheet1, { header: 1 });
                rows.slice(0, 5).forEach((row: any) => {
                    if (!Array.isArray(row)) return;
                    row.forEach((cell, idx) => {
                        const cellStr = String(cell || '').toLowerCase().trim();
                        if (cellStr.includes("name") && row[idx + 1]) {
                            clientName = String(row[idx + 1]).trim();
                        }
                        if ((cellStr.includes("dob") || cellStr.includes("birth")) && row[idx + 1]) {
                            birthDate = convertExcelDate(row[idx + 1]);
                        }
                        if (cellStr.includes("weight") && row[idx + 1]) {
                            weight = String(row[idx + 1]).trim();
                        }
                        if (cellStr.includes("height") && row[idx + 1]) {
                            height = String(row[idx + 1]).trim();
                        }
                        if (cellStr.includes("bmi") && row[idx + 1]) {
                            bmi = parseFloat(parseFloat(String(row[idx + 1])).toFixed(1)) || 0;
                        }
                        if (cellStr.includes("date") && !cellStr.includes("birth") && row[idx + 1]) {
                            testDate = convertExcelDate(row[idx + 1]);
                        }
                        if (cellStr.includes("type") && row[idx + 1]) {
                            testType = String(row[idx + 1]).trim();
                        }
                    });
                });
            }

            // Helper to initialize deficit mapping
            const anatomicalDeficits: AssessmentReportData["anatomicalDeficits"] = {};
            const initializeRegion = (region: string) => {
                if (!anatomicalDeficits[region]) {
                    anatomicalDeficits[region] = {
                        mobilityPercentDeviation: 0,
                        strengthPercentDeviation: 0,
                        balancePercentDeviation: 0
                    };
                }
            };

            // Sheet 2: Mobility
            const sheet2 = workbook.Sheets[workbook.SheetNames[1]];
            if (sheet2) {
                const rows = XLSX.utils.sheet_to_json<any[]>(sheet2, { header: 1 });
                // We parse rows sequentially. Row 0 contains headers, subsequent rows contain parameters.
                let headers = (rows[0] as any[] || []).map(h => String(h || '').trim().toLowerCase());
                let valColIdx = -1;
                let refColIdx = -1;
                let pctRefColIdx = -1;

                headers.forEach((h, idx) => {
                    if (idx === 0) return;
                    if (h.includes("%") && h.includes("ref")) pctRefColIdx = idx;
                    else if (h.includes("ref") || h.includes("reference")) refColIdx = idx;
                    else if (h && !h.includes("limit") && !h.includes("device")) valColIdx = idx; // Default to first actual value col
                });

                rows.slice(1).forEach((row: any[]) => {
                    if (!row || !row.length) return;
                    const paramName = String(row[0] || '').trim();
                    if (HARDWARE_CODES.has(paramName) || !paramName || paramName.length < 3) return;

                    const region = getMuscleRegionFromParam(paramName);
                    if (!region) return;
                    initializeRegion(region);

                    // Find rightmost non-null cell index
                    let val = NaN;
                    for (let i = row.length - 1; i >= 1; i--) {
                        if (i === pctRefColIdx || i === refColIdx) continue;
                        const cellVal = parseFloat(String(row[i] || ''));
                        if (!isNaN(cellVal)) {
                            val = cellVal;
                            break;
                        }
                    }

                    if (!isNaN(val)) {
                        let dev = 0;
                        let devFound = false;

                        if (pctRefColIdx !== -1 && row[pctRefColIdx] !== undefined) {
                            const pctVal = parseFloat(String(row[pctRefColIdx]));
                            if (!isNaN(pctVal)) {
                                dev = pctVal;
                                devFound = true;
                            }
                        }

                        if (!devFound && refColIdx !== -1 && row[refColIdx] !== undefined) {
                            const refVal = parseFloat(String(row[refColIdx]));
                            if (!isNaN(refVal) && refVal !== 0) {
                                dev = Math.round(((val - refVal) / refVal) * 100);
                                devFound = true;
                            }
                        }

                        anatomicalDeficits[region].mobilityPercentDeviation = dev;
                    }
                });
            }

            // Sheet 3: Strength
            const sheet3 = workbook.Sheets[workbook.SheetNames[2]];
            if (sheet3) {
                const rows = XLSX.utils.sheet_to_json<any[]>(sheet3, { header: 1 });
                let headers = (rows[0] as any[] || []).map(h => String(h || '').trim().toLowerCase());
                let valColIdx = -1;
                let refColIdx = -1;
                let pctRefColIdx = -1;

                headers.forEach((h, idx) => {
                    if (idx === 0) return;
                    if (h.includes("%") && h.includes("ref")) pctRefColIdx = idx;
                    else if (h.includes("ref") || h.includes("reference")) refColIdx = idx;
                    else if (h && !h.includes("limit") && !h.includes("device")) valColIdx = idx;
                });

                rows.slice(1).forEach((row: any[]) => {
                    if (!row || !row.length) return;
                    const paramName = String(row[0] || '').trim();
                    if (HARDWARE_CODES.has(paramName) || !paramName || paramName.length < 3) return;

                    const region = getMuscleRegionFromParam(paramName);
                    if (!region) return;
                    initializeRegion(region);

                    let val = NaN;
                    for (let i = row.length - 1; i >= 1; i--) {
                        if (i === pctRefColIdx || i === refColIdx) continue;
                        const cellVal = parseFloat(String(row[i] || ''));
                        if (!isNaN(cellVal)) {
                            val = cellVal;
                            break;
                        }
                    }

                    if (!isNaN(val)) {
                        let dev = 0;
                        let devFound = false;

                        if (pctRefColIdx !== -1 && row[pctRefColIdx] !== undefined) {
                            const pctVal = parseFloat(String(row[pctRefColIdx]));
                            if (!isNaN(pctVal)) {
                                dev = pctVal;
                                devFound = true;
                            }
                        }

                        if (!devFound && refColIdx !== -1 && row[refColIdx] !== undefined) {
                            const refVal = parseFloat(String(row[refColIdx]));
                            if (!isNaN(refVal) && refVal !== 0) {
                                dev = Math.round(((val - refVal) / refVal) * 100);
                                devFound = true;
                            }
                        }

                        anatomicalDeficits[region].strengthPercentDeviation = dev;
                    }
                });
            }

            // Sheet 4: Strength balance
            const balanceRatiosMap: Record<string, BalanceRatioMetric> = {};
            const sheet4 = workbook.Sheets[workbook.SheetNames[3]];
            if (sheet4) {
                const rows = XLSX.utils.sheet_to_json<any[]>(sheet4, { header: 1 });
                let headers = (rows[0] as any[] || []).map(h => String(h || '').trim().toLowerCase());
                let valColIdx = -1;
                let refColIdx = -1;
                let pctRefColIdx = -1;

                headers.forEach((h, idx) => {
                    if (idx === 0) return;
                    if (h.includes("%") && h.includes("ref")) pctRefColIdx = idx;
                    else if (h.includes("ref") || h.includes("reference")) refColIdx = idx;
                    else if (h && !h.includes("limit") && !h.includes("device")) valColIdx = idx;
                });

                rows.slice(1).forEach((row: any[]) => {
                    if (!row || !row.length) return;
                    const paramName = String(row[0] || '').trim();
                    if (HARDWARE_CODES.has(paramName) || !paramName || paramName.length < 3) return;

                    const region = getMuscleRegionFromParam(paramName);
                    if (!region) return;
                    initializeRegion(region);

                    let val = NaN;
                    for (let i = row.length - 1; i >= 1; i--) {
                        if (i === pctRefColIdx || i === refColIdx) continue;
                        const cellVal = parseFloat(String(row[i] || ''));
                        if (!isNaN(cellVal)) {
                            val = cellVal;
                            break;
                        }
                    }

                    if (!isNaN(val)) {
                        let dev = 0;
                        let devFound = false;

                        if (pctRefColIdx !== -1 && row[pctRefColIdx] !== undefined) {
                            const pctVal = parseFloat(String(row[pctRefColIdx]));
                            if (!isNaN(pctVal)) {
                                dev = pctVal;
                                devFound = true;
                            }
                        }

                        if (!devFound && refColIdx !== -1 && row[refColIdx] !== undefined) {
                            const refVal = parseFloat(String(row[refColIdx]));
                            if (!isNaN(refVal) && refVal !== 0) {
                                dev = Math.round(((val - refVal) / refVal) * 100);
                                devFound = true;
                            }
                        }

                        anatomicalDeficits[region].balancePercentDeviation = dev;

                        // Parse for strength balance sliders
                        const isLeft = paramName.toLowerCase().endsWith("left");
                        const isRight = paramName.toLowerCase().endsWith("right");
                        const baseName = paramName
                            .replace(/^\d+[\s\-_]*/, '')
                            .replace(/^(strengthBalance|balance)/i, '')
                            .replace(/(Left|Right)$/i, '')
                            .replace(/([A-Z])/g, ' $1')
                            .trim();

                        if (!balanceRatiosMap[baseName]) {
                            balanceRatiosMap[baseName] = {
                                name: baseName,
                                leftDev: 0,
                                rightDev: 0,
                                hasLeft: false,
                                hasRight: false
                            };
                        }

                        if (isLeft) {
                            balanceRatiosMap[baseName].leftDev = dev;
                            balanceRatiosMap[baseName].hasLeft = true;
                        } else if (isRight) {
                            balanceRatiosMap[baseName].rightDev = dev;
                            balanceRatiosMap[baseName].hasRight = true;
                        } else {
                            balanceRatiosMap[baseName].leftDev = dev;
                            balanceRatiosMap[baseName].hasLeft = true;
                        }
                    }
                });
            }

            // Compute BMI fallback
            if (!bmi) {
                const parsedWeight = parseFloat(weight.replace(/[^\d.]/g, ''));
                const parsedHeight = parseFloat(height.replace(/[^\d.]/g, ''));
                if (!isNaN(parsedWeight) && !isNaN(parsedHeight) && parsedHeight > 0) {
                    const heightM = parsedHeight > 3 ? parsedHeight / 100 : parsedHeight;
                    bmi = parseFloat((parsedWeight / (heightM * heightM)).toFixed(1));
                }
            }

            const dataObj: AssessmentReportData = {
                reportMetadata: {
                    clientName,
                    birthDate,
                    bmi,
                    testDate,
                    testType,
                    weight,
                    height
                },
                anatomicalDeficits,
                balanceRatios: Object.values(balanceRatiosMap)
            };

            setReportData(dataObj);
            toast({ title: "Excel Ingested Successfully", description: `Extracted ${Object.keys(anatomicalDeficits).length} muscle deficit profiles.` });
        } catch (err: any) {
            toast({ title: "Parsing Error", description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            processExcelFile(file);
        } else {
            toast({ title: "Invalid File", description: "Please upload an .xlsx or .xls document.", variant: "destructive" });
        }
    }, [processExcelFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processExcelFile(file);
        if (e.target) e.target.value = '';
    }, [processExcelFile]);

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // Save to Database
    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const handleSaveReport = async () => {
        if (!reportData || !selectedClient) {
            toast({ title: "Select a client first", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            await apiFetch('/reports/excel-diagnostic', {
                method: 'POST',
                body: JSON.stringify({
                    client_uhid: selectedClient.uhid,
                    patient_name: reportData.reportMetadata.clientName || `${selectedClient.first_name} ${selectedClient.last_name}`,
                    dob: reportData.reportMetadata.birthDate || null,
                    test_history: [reportData.reportMetadata],
                    latest_metrics: reportData.anatomicalDeficits,
                    clinical_interpretation: clinicalNotes
                })
            });
            toast({ title: "Report Saved Successfully" });
            fetchHistory(selectedClient.uhid);
        } catch (err: any) {
            toast({ title: "Save Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const loadHistoryRecord = (record: any) => {
        try {
            const deficits = typeof record.latest_metrics === 'string' ? JSON.parse(record.latest_metrics) : record.latest_metrics;
            const historyList = typeof record.test_history === 'string' ? JSON.parse(record.test_history) : (record.test_history || []);
            const meta = historyList[0] || {};
            
            setReportData({
                reportMetadata: {
                    clientName: record.patient_name || '',
                    birthDate: record.dob || '',
                    bmi: meta.bmi || 0,
                    testDate: new Date(record.created_at).toISOString().split('T')[0],
                    testType: meta.testType || 'Musculoskeletal Profiling',
                    weight: meta.weight || '',
                    height: meta.height || ''
                },
                anatomicalDeficits: deficits || {}
            });
            setClinicalNotes(record.clinical_interpretation || '');
            toast({ title: "Assessment Report Loaded" });
        } catch (err: any) {
            toast({ title: "Load Failed", description: err.message, variant: "destructive" });
        }
    };

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // Shaded 3D-Look Heatmap Dynamic Overlay Color
    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const getTargetMetricValue = (regionKey: string): number => {
        if (!reportData || !reportData.anatomicalDeficits[regionKey]) return 0;
        const d = reportData.anatomicalDeficits[regionKey];
        switch (visualMode) {
            case "mobility":
                return d.mobilityPercentDeviation;
            case "strength":
                return d.strengthPercentDeviation;
            case "balance":
                return d.balancePercentDeviation;
            case "combined":
            default:
                // Worst-case deviation
                return Math.min(d.mobilityPercentDeviation, d.strengthPercentDeviation, d.balancePercentDeviation);
        }
    };

    const getMuscleGradientId = (regionKey: string): string => {
        if (!reportData || !reportData.anatomicalDeficits[regionKey]) return "gradient-default";
        const val = getTargetMetricValue(regionKey);
        if (val >= 0) return "gradient-teal";
        if (val >= -34) return "gradient-amber";
        return "gradient-crimson";
    };

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // PDF Generation
    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const handleGeneratePDF = async () => {
        if (!reportData || !selectedClient) {
            toast({ title: "Ingest a file and bind to a client first", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const page1El = page1Ref.current;
            const page2El = page2Ref.current;
            if (!page1El || !page2El) throw new Error("PDF wrappers not found in DOM");

            const canvas1 = await html2canvas(page1El, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            const canvas2 = await html2canvas(page2El, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            const imgData1 = canvas1.toDataURL("image/jpeg", 0.95);
            const imgData2 = canvas2.toDataURL("image/jpeg", 0.95);

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = 210;
            const pdfHeight = 297;

            // Page 1
            pdf.addImage(imgData1, "JPEG", 0, 0, pdfWidth, pdfHeight);

            // Page 2
            pdf.addPage();
            pdf.addImage(imgData2, "JPEG", 0, 0, pdfWidth, pdfHeight);

            const clientName = `${selectedClient.first_name}_${selectedClient.last_name}`.replace(/\s+/g, "_");
            const dateStr = reportData.reportMetadata.testDate || new Date().toISOString().split("T")[0];
            const filename = `${clientName}_Assessment_Report_${dateStr}.pdf`;

            pdf.save(filename);
            toast({ title: "Report PDF Generated Successfully", description: `Saved as ${filename}` });
        } catch (err: any) {
            toast({ title: "PDF Generation Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // Realistic Canvas Silhouette
    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const renderAnatomicalMuscleMap = (view: "front" | "back") => {
        const viewBox = view === "front" ? "0 0 500 1000" : "500 0 500 1000";
        const bgHref = view === "front" ? "/anatomy_heatmap_front.png" : "/anatomy_heatmap_back.png";
        
        return (
        <div className="space-y-6 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary" />
                        Assessment Report Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">Realistic muscular deficit tracking and testing machine report engine</p>
                </div>
                <div className="flex gap-3">
                    {reportData && (
                        <>
                            <Button 
                                onClick={handleGeneratePDF} 
                                variant="outline" 
                                className="gap-2 border-primary/20 text-primary hover:bg-primary/5 min-h-[44px] font-bold"
                            >
                                <Printer className="w-4 h-4" />
                                Export PDF
                            </Button>
                            {selectedClient && (
                                <Button 
                                    onClick={() => {
                                        setHistoryVisible(!historyVisible);
                                        if (!historyVisible) fetchHistory(selectedClient.uhid);
                                    }} 
                                    variant="outline" 
                                    className="gap-2 min-h-[44px] font-bold"
                                >
                                    <Clock className="w-4 h-4" />
                                    {historyVisible ? "Hide History" : "Show History"}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Client Binding Bar */}
            <Card className="border-none shadow-premium bg-slate-900 text-white rounded-2xl">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="space-y-2 md:col-span-8 relative">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Bind to Client Profile</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Input 
                                        placeholder="Search by name or UHID..."
                                        value={clientSearch}
                                        onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                                        onFocus={() => setShowClientDropdown(true)}
                                        className="bg-white/10 border-white/5 text-white placeholder-white/30 h-12 rounded-xl text-sm"
                                    />
                                    {showClientDropdown && clientSearch && (
                                        <div className="absoluteσ«ÜΣ╜ì absolute z-50 w-full max-h-48 overflow-y-auto bg-slate-950 rounded-xl border border-white/10 mt-1 shadow-2xl">
                                            {filteredClients.slice(0, 8).map(c => (
                                                <div 
                                                    key={c.id} 
                                                    onClick={() => {
                                                        setSelectedClient(c);
                                                        setClientSearch(`${c.first_name} ${c.last_name}`);
                                                        setShowClientDropdown(false);
                                                        fetchHistory(c.uhid);
                                                    }}
                                                    className="p-3 hover:bg-white/5 cursor-pointer text-sm text-white/80 border-b border-white/5 last:border-0 min-h-[44px] flex items-center"
                                                >
                                                    {c.first_name} {c.last_name} <span className="text-white/40 ml-2">({c.uhid})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedClient && (
                                    <Badge className="bg-primary/20 text-primary border border-primary/30 px-4 py-2 whitespace-nowrap text-xs font-bold flex items-center rounded-xl">
                                        <User className="w-3.5 h-3.5 mr-2" />
                                        Bound: {selectedClient.first_name} {selectedClient.last_name}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button 
                            className="h-12 gap-2 font-bold md:col-span-4 w-full bg-primary hover:bg-primary/90 text-white rounded-xl min-h-[44px]"
                            onClick={handleSaveReport}
                            disabled={!reportData || !selectedClient || isSaving}
                        >
                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Report to Database
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Bio-Metrics Header Profile Grid */}
            {reportData && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center shadow-lg">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Full Name</span>
                        <span className="text-sm font-black text-white mt-1 truncate">{reportData.reportMetadata.clientName || "Unknown Athlete"}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center shadow-lg">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Date of Birth</span>
                        <span className="text-sm font-bold text-white mt-1">{formatDate(reportData.reportMetadata.birthDate)}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center shadow-lg">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                            UHID <Lock className="w-3 h-3 text-emerald-400" />
                        </span>
                        <span className="text-sm font-mono text-emerald-400 font-bold mt-1">{selectedClient?.uhid || "N/A"}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center shadow-lg">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Height</span>
                        <span className="text-sm font-bold text-white mt-1">{reportData.reportMetadata.height || "ΓÇö"}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center shadow-lg">
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Total Weight</span>
                        <span className="text-sm font-bold text-white mt-1">{reportData.reportMetadata.weight || "ΓÇö"}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/10 rounded-full blur-xl" />
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Calculated BMI</span>
                        <span className="text-sm font-black text-teal-400 mt-1">{reportData.reportMetadata.bmi || "ΓÇö"}</span>
                    </div>
                </div>
            )}

            {/* Ingestion Drag & Drop Zone when no reportData is loaded */}
            {!reportData && (
                <Card className="border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-primary/50 transition-all duration-300 rounded-3xl">
                    <CardContent className="p-0">
                        <div 
                            className={`p-24 text-center cursor-pointer ${isDragOver ? 'bg-primary/5 scale-[1.01]' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('excel-parser-file-input')?.click()}
                            style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                        >
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-4">
                                    <RefreshCw className="w-12 h-12 animate-spin text-primary" />
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Parsing Musculoskeletal Data...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <FileUp className="w-16 h-16 text-slate-400 dark:text-slate-600 animate-pulse" />
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-350">Drag Testing Machine Excel File Here</h3>
                                    <p className="text-xs text-slate-500 max-w-md">Supports multi-sheet workbook containing customer info, mobility, strength, and strength balance profiles</p>
                                    <Button className="mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl min-h-[44px] px-6">Select File Manually</Button>
                                </div>
                            )}
                            <input type="file" id="excel-parser-file-input" className="hidden" accept=".xlsx,.xls" onChange={handleFileSelect} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Responsive Dashboard Grid */}
            {reportData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Joint Balance Widget & History */}
                    <div className="lg:col-span-6 space-y-6 flex flex-col">
                        {/* Strength Balance Widget */}
                        <Card className="border-none shadow-premium rounded-2xl flex-1 flex flex-col">
                            <CardHeader className="py-4 border-b">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" /> Joint Balance & Functional Asymmetries
                                </CardTitle>
                                <CardDescription className="text-xs">Left vs Right muscular imbalance percentage deviation</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 space-y-6 max-h-[480px] overflow-y-auto no-scrollbar">
                                {(reportData.balanceRatios || []).map((ratio) => {
                                    const val = ratio.leftDev - ratio.rightDev;
                                    const pct = Math.max(-50, Math.min(50, val));
                                    
                                    return (
                                        <div key={ratio.name} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="capitalize text-slate-700 dark:text-slate-300">{ratio.name}</span>
                                                <span className={Math.abs(val) > 34 ? "text-red-500 font-black" : Math.abs(val) > 0 ? "text-amber-500 font-semibold" : "text-emerald-500"}>
                                                    {val === 0 ? "Balanced" : `${val > 0 ? 'Right Deficit +' : 'Left Deficit '}${Math.abs(val)}%`}
                                                </span>
                                            </div>
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex relative items-center">
                                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 z-10" />
                                                <div 
                                                    className={`h-full rounded-full transition-all ${Math.abs(val) > 34 ? "bg-red-500" : Math.abs(val) > 0 ? "bg-amber-500" : "bg-teal-500"}`}
                                                    style={{
                                                        marginLeft: pct < 0 ? `${50 + pct}%` : '50%',
                                                        width: `${Math.abs(pct)}%`
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-muted-foreground font-bold px-1">
                                                <span>L: {ratio.leftDev}%</span>
                                                <span>R: {ratio.rightDev}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!reportData.balanceRatios || reportData.balanceRatios.length === 0) && (
                                    <p className="text-xs text-muted-foreground italic text-center py-8">No functional asymmetry data found in this assessment.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* History Sidebar Panel */}
                        {historyVisible && selectedClient && (
                            <Card className="bg-slate-950 text-white border-slate-900 shadow-premium rounded-2xl overflow-hidden mt-0">
                                <CardHeader className="bg-slate-900/50 border-b border-white/5 py-4">
                                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-emerald-450" /> Historical Diagnostic Reports
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isLoadingHistory ? (
                                        <div className="p-8 text-center"><RefreshCw className="w-6 h-6 animate-spin text-white/30 mx-auto" /></div>
                                    ) : historyRecords.length > 0 ? (
                                        <div className="divide-y divide-white/5 max-h-48 overflow-y-auto no-scrollbar">
                                            {historyRecords.map(record => (
                                                <div key={record.id} className="p-4 hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs min-h-[44px]" onClick={() => loadHistoryRecord(record)}>
                                                    <div>
                                                        <p className="font-bold text-white/90">{record.patient_name || "Assessment"}</p>
                                                        <p className="text-[10px] text-white/40 mt-1">{new Date(record.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <Badge className="bg-white/5 text-white/60">Load</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="p-8 text-center text-white/30 text-xs">No saved diagnostic reports found.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Muscle Heatmap & Notepad */}
                    <div className="lg:col-span-6 space-y-6 flex flex-col">
                        {/* Muscle Heatmap Card */}
                        <Card className="border-none shadow-premium rounded-2xl">
                            <CardHeader className="py-4 border-b flex flex-row items-center justify-between flex-wrap gap-3">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-red-500 animate-pulse" /> Muscular Deficit Heatmap
                                    </CardTitle>
                                    <CardDescription className="text-xs">Dynamic 3D-shaded muscle overlay</CardDescription>
                                </div>
                                {/* Visualisation Mode Select Toggle */}
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                    {(["mobility", "strength", "balance", "combined"] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setVisualMode(mode)}
                                            className={`px-2 py-1 rounded-lg transition-all capitalize ${visualMode === mode ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="mt-2">
                                    {isMobile ? (
                                        <div className="space-y-4">
                                            {/* Front/Back Tabs switcher on mobile with 44x44px target sizes */}
                                            <div className="flex bg-slate-100 dark:bg-slate-850 p-1.5 rounded-xl gap-1 border">
                                                <button
                                                    onClick={() => setMobileTab("anterior")}
                                                    className={cn(
                                                        "flex-1 py-3 text-xs font-black rounded-lg transition-all h-11 flex items-center justify-center min-h-[44px]",
                                                        mobileTab === "anterior" 
                                                            ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                                                            : "text-slate-500"
                                                    )}
                                                >
                                                    Front View
                                                </button>
                                                <button
                                                    onClick={() => setMobileTab("posterior")}
                                                    className={cn(
                                                        "flex-1 py-3 text-xs font-black rounded-lg transition-all h-11 flex items-center justify-center min-h-[44px]",
                                                        mobileTab === "posterior" 
                                                            ? "bg-white dark:bg-slate-700 text-primary shadow-sm" 
                                                            : "text-slate-500"
                                                    )}
                                                >
                                                    Back View
                                                </button>
                                            </div>
                                            
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-inner max-w-[280px] mx-auto">
                                                {mobileTab === "anterior" ? renderAnatomicalMuscleMap("front") : renderAnatomicalMuscleMap("back")}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Side-by-Side view on desktop */
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="text-center space-y-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Anterior View</span>
                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-800 shadow-inner">
                                                    {renderAnatomicalMuscleMap("front")}
                                                </div>
                                            </div>
                                            <div className="text-center space-y-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Posterior View</span>
                                                <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-800 shadow-inner">
                                                    {renderAnatomicalMuscleMap("back")}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Legend */}
                                <div className="flex justify-center gap-6 mt-6 text-[10px] font-bold border-t pt-4 text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Optimal (ΓëÑ 0%)
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Warning (-1% to -34%)
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-650" /> Deficit (Γëñ -35%)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Clinical Diagnostics Remarks notepad */}
                        <Card className="border-none shadow-premium rounded-2xl flex-1 flex flex-col">
                            <CardHeader className="py-4 border-b">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" /> Specialist Diagnostics Summary
                                </CardTitle>
                                <CardDescription className="text-xs">Clinical interpretations and training strategy narrative</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 flex-1 flex flex-col space-y-4">
                                {/* Notepad Toolbar */}
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-750">
                                    <button className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all">Bold</button>
                                    <button className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all">Italic</button>
                                    <button className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-all">List</button>
                                    <div className="flex-1" />
                                    <span className="px-2 py-1 text-muted-foreground/60 uppercase tracking-widest text-[8px]">Standard Editor</span>
                                </div>
                                
                                <textarea
                                    value={clinicalNotes}
                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                    placeholder="Type clinical directives, recovery plans, structural asymmetries, or workout restrictions..."
                                    rows={5}
                                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl p-4 focus:border-primary/50 focus:ring-0 focus:outline-none resize-none transition-all duration-300 flex-1"
                                />

                                {/* Specialist Footer Template */}
                                <div className="flex justify-between items-center border-t pt-4 text-[10px] text-muted-foreground font-bold">
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Practitioner: {profile?.first_name} {profile?.last_name}</span>
                                    </div>
                                    <div>
                                        <span>Credentials: {profile?.profession || "Physiotherapist (MPT)"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            {/* OFFSCREEN A4 PDF EXPORT COMPONENT WRAPPERS                */}
            {/* ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
            {reportData && (
                <div className="fixed left-[-9999px] top-0" style={{ width: '210mm' }}>
                    
                    {/* PAGE 1 - VISUAL ANALYTICS DASHBOARD */}
                    <div id="pdf-report-page-1" ref={page1Ref} 
                        className="bg-white text-slate-900 p-12 flex flex-col justify-between"
                        style={{ width: '210mm', height: '297mm', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box' }}
                    >
                        <div>
                            {/* PDF Header */}
                            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                                <div className="flex items-center gap-3">
                                    {profile?.organization_logo ? (
                                        <img 
                                            src={profile.organization_logo} 
                                            alt={profile.organization_name || "Org Logo"} 
                                            className="max-h-10 w-auto object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-7 h-7 text-primary" />
                                            <span className="text-lg font-black tracking-tight uppercase">
                                                {profile?.organization_name || "ISHPO CLINIC"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right text-[9px] leading-tight">
                                    <p className="font-black text-slate-800 uppercase tracking-wider">Musculoskeletal Analytics Dashboard</p>
                                    <p className="text-slate-500 font-bold">{profile?.location || "ISHPO Performance Center - London"}</p>
                                </div>
                            </div>

                            {/* Client Summary Grid */}
                            <div className="grid grid-cols-4 gap-y-3 gap-x-6 p-5 bg-slate-55 border border-slate-200 rounded-xl mb-6 text-[10px] leading-tight">
                                <div><span className="font-bold text-slate-500">Patient:</span> <span className="font-black text-slate-900">{reportData.reportMetadata.clientName || "Unknown"}</span></div>
                                <div><span className="font-bold text-slate-500">DOB:</span> <span className="font-bold text-slate-900">{formatDate(reportData.reportMetadata.birthDate)}</span></div>
                                <div><span className="font-bold text-slate-500">UHID:</span> <span className="font-bold text-slate-900">{selectedClient?.uhid || "N/A"}</span></div>
                                <div><span className="font-bold text-slate-500">BMI:</span> <span className="font-bold text-slate-900">{reportData.reportMetadata.bmi || "N/A"}</span></div>
                                <div><span className="font-bold text-slate-500">Weight:</span> <span className="font-bold text-slate-900">{reportData.reportMetadata.weight || "ΓÇö"}</span></div>
                                <div><span className="font-bold text-slate-500">Height:</span> <span className="font-bold text-slate-900">{reportData.reportMetadata.height || "ΓÇö"}</span></div>
                                <div><span className="font-bold text-slate-500">Test profile:</span> <span className="font-bold text-slate-900 truncate block max-w-[130px]">{reportData.reportMetadata.testType}</span></div>
                                <div><span className="font-bold text-slate-500">Practitioner:</span> <span className="font-bold text-slate-900">{profile?.first_name} {profile?.last_name}</span></div>
                            </div>

                            {/* Muscle Group Heatmaps Side-by-Side */}
                            <div className="grid grid-cols-2 gap-6 items-center justify-center pt-4" style={{ height: '160mm' }}>
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50" style={{ height: '145mm' }}>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Anterior Deficit Map</span>
                                    <div className="w-[185px]">
                                        {renderAnatomicalMuscleMap("front")}
                                    </div>
                                </div>
                                <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50" style={{ height: '145mm' }}>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Posterior Deficit Map</span>
                                    <div className="w-[185px]">
                                        {renderAnatomicalMuscleMap("back")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deficit Color-Coded Legend */}
                        <div className="flex justify-center gap-8 text-[9px] font-bold border-t border-slate-200 pt-4 text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Optimal (ΓëÑ 0%)
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Warning (-1% to -34%)
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-600" /> Deficit (Γëñ -35%)
                            </div>
                        </div>
                    </div>

                    {/* PAGE 2 - BIOMECHANICAL DATA & STRATEGY */}
                    <div id="pdf-report-page-2" ref={page2Ref} 
                        className="bg-white text-slate-900 p-12 flex flex-col justify-between"
                        style={{ width: '210mm', height: '297mm', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box' }}
                    >
                        <div className="flex flex-col flex-1">
                            {/* PDF Header */}
                            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                                <div className="flex items-center gap-3">
                                    {profile?.organization_logo ? (
                                        <img 
                                            src={profile.organization_logo} 
                                            alt={profile.organization_name || "Org Logo"} 
                                            className="max-h-10 w-auto object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-7 h-7 text-primary" />
                                            <span className="text-lg font-black tracking-tight uppercase">
                                                {profile?.organization_name || "ISHPO CLINIC"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right text-[9px] leading-tight">
                                    <p className="font-black text-slate-800 uppercase tracking-wider">Biomechanical Data & Strategy</p>
                                    <p className="text-slate-500 font-bold">Page 2 of 2</p>
                                </div>
                            </div>

                            {/* Patient bar */}
                            <div className="mb-6 pb-3 border-b border-slate-200 text-[10px] text-slate-500 flex justify-between">
                                <span>Athlete Name: <strong className="text-slate-800">{reportData.reportMetadata.clientName}</strong></span>
                                <span>Client UHID: <strong className="text-slate-800">{selectedClient?.uhid}</strong></span>
                                <span>Test Profile Date: <strong className="text-slate-800">{reportData.reportMetadata.testDate}</strong></span>
                            </div>

                            {/* Two Column Grid layout */}
                            <div className="flex gap-6 mt-2" style={{ height: '180mm' }}>
                                {/* Left Column: Joint Deficits Summary Table */}
                                <div className="w-[45%] border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col" style={{ boxSizing: 'border-box' }}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 border-b pb-1">Joint Deficits Summary</h3>
                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <table className="w-full text-[9px] border-collapse leading-normal">
                                            <thead>
                                                <tr className="border-b border-slate-300 text-slate-400 font-bold text-left">
                                                    <th className="pb-1.5">Joint Group</th>
                                                    <th className="pb-1.5 text-center">Mob.</th>
                                                    <th className="pb-1.5 text-center">Str.</th>
                                                    <th className="pb-1.5 text-center">Bal.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {Object.entries(reportData.anatomicalDeficits)
                                                    .map(([key, metrics]) => {
                                                        const label = bodyParts.find(b => b.mappedKey === key)?.label || key;
                                                        const m = metrics.mobilityPercentDeviation;
                                                        const s = metrics.strengthPercentDeviation;
                                                        const b = metrics.balancePercentDeviation;
                                                        const worst = Math.min(m, s, b);
                                                        return { label, m, s, b, worst };
                                                    })
                                                    .filter(item => item.worst < 0)
                                                    .sort((a, b) => a.worst - b.worst)
                                                    .map((item, idx) => {
                                                        const renderCell = (val) => {
                                                            if (val >= 0) return <span className="text-slate-400">ΓÇö</span>;
                                                            const color = val <= -35 ? "text-red-600 font-black" : "text-amber-600 font-semibold";
                                                            return <span className={color}>{val}%</span>;
                                                        };
                                                        
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-100">
                                                                <td className="py-2 pr-1 font-bold text-slate-700 capitalize">{item.label}</td>
                                                                <td className="py-2 text-center">{renderCell(item.m)}</td>
                                                                <td className="py-2 text-center">{renderCell(item.s)}</td>
                                                                <td className="py-2 text-center">{renderCell(item.b)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                {Object.values(reportData.anatomicalDeficits).every(d => d.mobilityPercentDeviation >= 0 && d.strengthPercentDeviation >= 0 && d.balancePercentDeviation >= 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">No biomechanical deficits registered.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                {/* Right Column: Clinical Notes narrative box */}
                                <div className="w-[55%] border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col" style={{ boxSizing: 'border-box' }}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 border-b pb-1">Clinical Interpretation</h3>
                                    <div className="flex-1 text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap overflow-y-auto no-scrollbar font-medium">
                                        {clinicalNotes || "No clinical remarks or recovery directives recorded by practitioner."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sign-off Block */}
                        <div className="border-t border-slate-200 pt-6 flex justify-between items-end text-[10px]">
                            <div>
                                <p className="font-bold text-slate-900">Practitioner: {profile?.first_name} {profile?.last_name}</p>
                                <p className="text-slate-400">Credentials: {profile?.profession || 'Sports Medicine Specialist'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-slate-900">Signature: ____________________</p>
                                <p className="mt-1 text-slate-400">Date: {reportData.reportMetadata.testDate}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
}
