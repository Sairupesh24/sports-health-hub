"import React from "react";
import { cn } from "@/lib/utils";

interface BodyPart {
    id: string;
    label: string;
    path: string;
    view: "front" | "back";
}

const bodyParts: BodyPart[] = [
    // FRONT VIEW (ANTERIOR)
    { 
        id: "neck_ant", 
        label: "Neck", 
        view: "front", 
        path: "M235,160 C235,175 250,215 265,220 C280,215 295,175 295,160 C280,165 250,165 235,160 Z" 
    },
    { 
        id: "shoulder_l_ant", 
        label: "Shoulder (L)", 
        view: "front", 
        path: "M180,205 C150,210 135,230 123,285 C145,295 170,285 180,280 C182,250 182,220 180,205 Z" 
    },
    { 
        id: "shoulder_r_ant", 
        label: "Shoulder (R)", 
        view: "front", 
        path: "M350,205 C380,210 395,230 407,285 C385,295 360,285 350,280 C348,250 348,220 350,205 Z" 
    },
    { 
        id: "chest_l", 
        label: "Pectorals (L)", 
        view: "front", 
        path: "M185,215 C175,250 180,300 215,310 C240,312 260,300 265,290 L265,222 C240,222 210,215 185,215 Z" 
    },
    { 
        id: "chest_r", 
        label: "Pectorals (R)", 
        view: "front", 
        path: "M345,215 C355,250 350,300 315,310 C290,312 270,300 265,290 L265,222 C290,222 320,215 345,215 Z" 
    },
    { 
        id: "bicep_l", 
        label: "Bicep (L)", 
        view: "front", 
        path: "M123,285 C115,320 118,360 132,375 C145,370 160,350 165,330 C170,310 175,295 175,285 Z" 
    },
    { 
        id: "bicep_r", 
        label: "Bicep (R)", 
        view: "front", 
        path: "M407,285 C415,320 412,360 398,375 C385,370 370,350 365,330 C360,310 355,295 355,285 Z" 
    },
    { 
        id: "forearm_l_ant", 
        label: "Forearm (L)", 
        view: "front", 
        path: "M132,375 C110,400 80,450 78,505 C95,510 115,480 130,440 L165,375 Z" 
    },
    { 
        id: "forearm_r_ant", 
        label: "Forearm (R)", 
        view: "front", 
  
<truncated 15044 bytes>

