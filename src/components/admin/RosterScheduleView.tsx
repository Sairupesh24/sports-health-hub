import { useState, useMemo, useCallback } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Calendar as CalendarIcon,
    Download,
    Minus,
    Plus,
    Users,
    Search,
    X,
    Loader2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface RosterScheduleViewProps {
    initialDate?: Date;
    onClose?: () => void;
}

type ZoomLevel = "xs" | "sm" | "md" | "lg" | "xl";

const ZOOM_CONFIGS: Record<ZoomLevel, {
    colWidth: string;
    rowHeight: string;
    textTiny: string;
}> = {
    xs:  { colWidth: "w-[75px]  min-w-[75px]",  rowHeight: "h-14", textTiny: "text-[7px]"   },
    sm:  { colWidth: "w-[100px] min-w-[100px]", rowHeight: "h-18", textTiny: "text-[8px]"   },
    md:  { colWidth: "w-[135px] min-w-[135px]", rowHeight: "h-22", textTiny: "text-[9.5px]" },
    lg:  { colWidth: "w-[175px] min-w-[175px]", rowHeight: "h-28", textTiny: "text-[11px]"  },
    xl:  { colWidth: "w-[220px] min-w-[220px]", rowHeight: "h-36", textTiny: "text-[12px]"  },
};

export function RosterScheduleView({ initialDate = new Date(), onClose }: RosterScheduleViewProps) {
    const { toast }                                   = useToast();
    const [selectedDate, setSelectedDate]             = useState<Date>(initialDate);
    const [selectedRole, setSelectedRole]             = useState<"all" | "physiotherapist" | "sports_scientist">("all");
    const [zoomLevel, setZoomLevel]                   = useState<ZoomLevel>("md");
    const [searchQuery, setSearchQuery]               = useState("");
    const [isExporting, setIsExporting]               = useState(false);

    // ── Staff ────────────────────────────────────────────────────────────────
    const { data: staffList = [], isLoading: isLoadingStaff } = useQuery({
        queryKey: ["roster-staff"],
        queryFn: async () => {
            const data = await apiFetch<any[]>("/hr/employees", { params: { role_type: "clinical" } });
            return data.map((p) => ({
                id:         p.id,
                name:       `${p.first_name} ${p.last_name}`,
                profession: p.profession || "Specialist",
                role:       p.role,
            }));
        },
    });

    // ── Sessions ─────────────────────────────────────────────────────────────
    const dateRange = useMemo(() => ({
        start: startOfDay(selectedDate).toISOString(),
        end:   endOfDay(selectedDate).toISOString(),
    }), [selectedDate]);

    const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
        queryKey: ["roster-sessions", dateRange.start, dateRange.end],
        queryFn:  async () =>
            apiFetch<any[]>("/appointments", { params: { start: dateRange.start, end: dateRange.end } }),
    });

    // ── 1-hour time slots 05:00 – 20:00 ──────────────────────────────────────
    const timeSlots = useMemo(() => {
        const s: string[] = [];
        for (let h = 5; h <= 20; h++) s.push(`${String(h).padStart(2, "0")}:00`);
        return s;
    }, []);

    const timeToMins = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };

    const formatSlotLabel = (slot: string) => {
        const mins = timeToMins(slot);
        const h    = Number(slot.split(":")[0]);
        if (mins === 12 * 60) return "12 PM";
        if (mins > 12 * 60)   return `${h - 12} PM`;
        return `${h} AM`;
    };

    // ── Filtered staff ────────────────────────────────────────────────────────
    const filteredStaff = useMemo(() =>
        staffList.filter((s) => {
            const prof = s.profession.toLowerCase();
            const role = (s.role || "").toLowerCase();
            if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (selectedRole === "physiotherapist")  return prof.includes("physio");
            if (selectedRole === "sports_scientist") return prof.includes("scientist") || prof.includes("science") || role.includes("science");
            return true;
        }), [staffList, selectedRole, searchQuery]);

    // ── Cell → sessions map ───────────────────────────────────────────────────
    const cellSessionsMap = useMemo(() => {
        const map: Record<string, any[]> = {};
        sessions.forEach((s) => {
            if (s.status === "Cancelled") return;
            const pid = s.therapist_id || s.scientist_id;
            if (!pid) return;
            const sStart = parseISO(s.scheduled_start);
            const sEnd   = parseISO(s.scheduled_end);
            const ssM    = sStart.getHours() * 60 + sStart.getMinutes();
            const seM    = sEnd.getHours()   * 60 + sEnd.getMinutes();
            timeSlots.forEach((slot) => {
                const slS = timeToMins(slot);
                const slE = slS + 60;
                if (ssM < slE && seM > slS) {
                    const key = `${pid}-${slot}`;
                    if (!map[key]) map[key] = [];
                    if (!map[key].some((x) => x.id === s.id)) map[key].push(s);
                }
            });
        });
        return map;
    }, [sessions, timeSlots]);

    // ── Client load per staff ─────────────────────────────────────────────────
    const staffClientLoad = useMemo(() => {
        const m: Record<string, number> = {};
        staffList.forEach((staff) => {
            const unique = new Set(
                sessions
                    .filter((s) => (s.therapist_id === staff.id || s.scientist_id === staff.id) && s.status !== "Cancelled")
                    .map((s) => s.client_id)
            );
            m[staff.id] = unique.size;
        });
        return m;
    }, [sessions, staffList]);

    const cfg      = ZOOM_CONFIGS[zoomLevel];
    const zoomList: ZoomLevel[] = ["xs", "sm", "md", "lg", "xl"];

    // ── PDF Export — clean A4 landscape table via jspdf-autotable ────────────
    const handleExportPDF = useCallback(async () => {
        if (!filteredStaff.length) {
            toast({ title: "No data", description: "There are no staff members to export." });
            return;
        }
        setIsExporting(true);
        try {
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import("jspdf"),
                import("jspdf-autotable"),
            ]);

            // A4 landscape: 297 × 210 mm
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();   // 297
            const margin = 10;

            // ── Page header ────────────────────────────────────────────────
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);     // slate-900
            doc.text("ISHPO Appointment Roster", margin, 14);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);  // slate-500
            const roleLabel =
                selectedRole === "physiotherapist"  ? "Physiotherapists" :
                selectedRole === "sports_scientist" ? "Sports Scientists" : "All Roles";
            doc.text(
                `Date: ${format(selectedDate, "EEEE, MMMM d, yyyy")}   ·   Filter: ${roleLabel}   ·   Staff: ${filteredStaff.length}`,
                margin, 21
            );

            // Separator line
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.3);
            doc.line(margin, 24, pageW - margin, 24);

            // ── Table setup ────────────────────────────────────────────────
            // Available width after margins = 297 - 20 = 277 mm
            // Staff column = 45 mm, remaining = 232 mm / 16 slots ≈ 14.5 mm each
            const staffColW   = 45;
            const slotColW    = Math.floor((pageW - margin * 2 - staffColW) / timeSlots.length);

            const head: string[] = [
                "Specialist / Role",
                ...timeSlots.map(formatSlotLabel),
            ];

            const body: (string | { content: string; styles?: any })[][] = filteredStaff.map((staff) => {
                const load = staffClientLoad[staff.id] || 0;
                const staffCell = {
                    content: `${staff.name}\n${staff.profession}${load ? `  (${load} client${load > 1 ? "s" : ""})` : ""}`,
                    styles: { fontStyle: "bold" as const, fontSize: 8 },
                };

                const slotCells = timeSlots.map((slot) => {
                    const items = cellSessionsMap[`${staff.id}-${slot}`] || [];
                    if (!items.length) return { content: "", styles: { fillColor: [255, 255, 255] } };

                    const lines = items.map((s: any) => {
                        const name = s.client?.first_name
                            ? `${s.client.first_name} ${s.client.last_name || ""}`.trim()
                            : "Guest";
                        const svc  = s.service_type ? s.service_type.substring(0, 14) : "Session";
                        const flag = s.status === "Waitlisted" ? " [W]" : "";
                        return `${name}${flag}\n${svc}`;
                    });

                    return {
                        content: lines.join("\n---\n"),
                        styles: {
                            fillColor: items.some((s: any) => s.status === "Waitlisted")
                                ? [255, 251, 235]   // amber-50
                                : [240, 253, 244],  // green-50
                            textColor: items.some((s: any) => s.status === "Waitlisted")
                                ? [146, 64, 14]     // amber-800
                                : [20, 83, 45],     // green-900
                        },
                    };
                });

                return [staffCell, ...slotCells];
            });

            autoTable(doc, {
                head:       [head],
                body:       body as any,
                startY:     27,
                margin:     { left: margin, right: margin },
                tableWidth: "wrap",

                columnStyles: {
                    0: { cellWidth: staffColW, fontStyle: "bold", fontSize: 8 },
                    // all slot columns
                    ...Object.fromEntries(
                        timeSlots.map((_, i) => [i + 1, { cellWidth: slotColW, fontSize: 7, halign: "center" as const }])
                    ),
                },

                headStyles: {
                    fillColor:  [30, 41, 59],   // slate-800
                    textColor:  [255, 255, 255],
                    fontStyle:  "bold",
                    fontSize:   8,
                    halign:     "center",
                    valign:     "middle",
                    cellPadding: 2,
                },

                bodyStyles: {
                    fontSize:    7.5,
                    cellPadding: 2,
                    valign:      "top",
                    textColor:   [15, 23, 42],   // slate-900
                    lineColor:   [226, 232, 240], // slate-200
                    lineWidth:   0.2,
                },

                alternateRowStyles: {
                    fillColor: [248, 250, 252],  // slate-50
                },

                styles: {
                    overflow: "linebreak",
                    font:     "helvetica",
                },

                didDrawPage: (data) => {
                    // Footer on each page
                    doc.setFontSize(7);
                    doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Exported: ${format(new Date(), "dd MMM yyyy, h:mm a")}   ·   Page ${doc.getNumberOfPages()}`,
                        margin,
                        doc.internal.pageSize.getHeight() - 5
                    );
                },
            });

            doc.save(`ISHPO_Roster_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
            toast({ title: "PDF Exported", description: "Roster saved as an A4 landscape PDF." });
        } catch (err) {
            console.error("PDF export failed:", err);
            toast({ title: "Export Failed", description: "Could not generate the PDF.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    }, [filteredStaff, selectedDate, selectedRole, sessions, cellSessionsMap, staffClientLoad, timeSlots, toast]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <TooltipProvider>
            <div className="w-full h-full bg-slate-950 text-slate-100 p-6 flex flex-col gap-5 overflow-hidden select-none">

                <style dangerouslySetInnerHTML={{ __html: `
                    .roster-scrollbar::-webkit-scrollbar        { width:10px; height:10px }
                    .roster-scrollbar::-webkit-scrollbar-track  { background:#020617; border-radius:5px }
                    .roster-scrollbar::-webkit-scrollbar-thumb  { background:#1e293b; border:2px solid #020617; border-radius:5px }
                    .roster-scrollbar::-webkit-scrollbar-thumb:hover { background:#10b981 }
                ` }} />

                {/* ── Top Bar ─────────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-900 pb-5 shrink-0">
                    <div className="flex items-center flex-wrap gap-3">

                        {/* Date picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 gap-2">
                                    <CalendarIcon className="w-4 h-4 text-emerald-500" />
                                    {format(selectedDate, "MMMM d, yyyy")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-slate-800 bg-slate-900" align="start">
                                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus className="bg-slate-900 text-slate-100 border-none" />
                            </PopoverContent>
                        </Popover>

                        {/* Role filter */}
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
                            {(["all", "physiotherapist", "sports_scientist"] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setSelectedRole(r)}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all",
                                        selectedRole === r ? "bg-emerald-500 text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    {r === "all" ? "All Roles" : r === "physiotherapist" ? "Physiotherapists" : "Sports Scientists"}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pl-9 pr-4 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                            />
                        </div>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {/* Zoom */}
                        <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-1">
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => { const i = zoomList.indexOf(zoomLevel); if (i > 0) setZoomLevel(zoomList[i - 1]); }}
                                disabled={zoomLevel === "xs"}
                                className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 rounded-lg"
                            ><Minus className="w-4 h-4" /></Button>
                            <span className="text-[10px] font-black uppercase text-slate-400 px-3">Zoom {zoomLevel}</span>
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => { const i = zoomList.indexOf(zoomLevel); if (i < zoomList.length - 1) setZoomLevel(zoomList[i + 1]); }}
                                disabled={zoomLevel === "xl"}
                                className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 rounded-lg"
                            ><Plus className="w-4 h-4" /></Button>
                        </div>

                        {/* Export */}
                        <Button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider gap-2 active:scale-95 disabled:opacity-60"
                        >
                            {isExporting
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                                : <><Download className="w-4 h-4" /> Export PDF</>}
                        </Button>

                        {onClose && (
                            <Button variant="outline" onClick={onClose} className="h-10 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:text-rose-400 text-slate-400 gap-1">
                                <X className="w-4 h-4" /> Exit
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Roster grid ─────────────────────────────────────────── */}
                <div
                    className="flex-1 overflow-auto rounded-2xl border border-slate-900 bg-slate-950/80 relative roster-scrollbar"
                    style={{ maxHeight: "calc(95vh - 140px)" }}
                >
                    {isLoadingStaff || isLoadingSessions ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Loading Roster…</p>
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-2 text-slate-500">
                            <Users className="w-12 h-12 stroke-[1.5] text-slate-700" />
                            <p className="text-sm font-bold">No Staff Members Found</p>
                            <p className="text-xs text-slate-600">Adjust filters or search terms.</p>
                        </div>
                    ) : (
                        <div className="min-w-max">

                            {/* Header row */}
                            <div className="flex border-b border-slate-900 sticky top-0 z-30 bg-slate-950">
                                <div className="w-[240px] min-w-[240px] sticky left-0 z-40 bg-slate-950 border-r border-slate-900 flex items-center px-4 py-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Specialist / Team Load</span>
                                </div>
                                {timeSlots.map((slot) => (
                                    <div key={slot} className={cn("border-r border-slate-900/60 py-3 flex items-center justify-center bg-slate-950", cfg.colWidth)}>
                                        <span className="text-[10px] font-bold text-slate-300">{formatSlotLabel(slot)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Body rows */}
                            <div className="divide-y divide-slate-900/60">
                                {filteredStaff.map((staff) => {
                                    const load = staffClientLoad[staff.id] || 0;
                                    return (
                                        <div key={staff.id} className="flex hover:bg-slate-900/10 transition-colors">
                                            {/* Sticky name cell */}
                                            <div className="w-[240px] min-w-[240px] sticky left-0 z-20 bg-slate-950 border-r border-slate-900 p-4 flex flex-col justify-center">
                                                <span className="text-xs font-black text-slate-100 truncate">{staff.name}</span>
                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[8px] font-black uppercase tracking-wider">{staff.profession}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold">{load} {load === 1 ? "Client" : "Clients"}</span>
                                                </div>
                                            </div>

                                            {/* Slot cells */}
                                            <div className="flex bg-slate-950/40">
                                                {timeSlots.map((slot) => {
                                                    const key  = `${staff.id}-${slot}`;
                                                    const list = cellSessionsMap[key] || [];
                                                    const has  = list.length > 0;
                                                    return (
                                                        <div
                                                            key={slot}
                                                            className={cn(
                                                                "border-r border-slate-900/50 p-1.5 flex flex-col justify-center overflow-hidden",
                                                                cfg.colWidth,
                                                                cfg.rowHeight,
                                                                has ? "bg-slate-900/20" : "hover:bg-slate-900/10"
                                                            )}
                                                        >
                                                            {has ? (
                                                                <div className="flex flex-col gap-1 w-full">
                                                                    {list.map((session: any) => {
                                                                        const isWait     = session.status === "Waitlisted";
                                                                        const startD     = parseISO(session.scheduled_start);
                                                                        const endD       = parseISO(session.scheduled_end);
                                                                        const clientName = session.client?.first_name
                                                                            ? `${session.client.first_name} ${session.client.last_name || ""}`.trim()
                                                                            : "Guest";
                                                                        return (
                                                                            <Tooltip key={session.id} delayDuration={200}>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className={cn(
                                                                                        "rounded-md border p-1 flex flex-col truncate shrink-0 cursor-help transition-all",
                                                                                        isWait
                                                                                            ? "bg-amber-500/10 text-amber-300 border-amber-500/40 hover:border-amber-400"
                                                                                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:border-emerald-400"
                                                                                    )}>
                                                                                        <span className={cn("font-black truncate uppercase leading-none", cfg.textTiny)}>{clientName}</span>
                                                                                        <span className={cn("opacity-75 truncate leading-none mt-0.5", cfg.textTiny)}>{session.service_type || "Session"}</span>
                                                                                        {zoomLevel !== "xs" && zoomLevel !== "sm" && (
                                                                                            <span className={cn("opacity-50 font-bold uppercase leading-none mt-0.5", cfg.textTiny)}>
                                                                                                {isWait ? "Waitlisted" : format(startD, "h:mm a")}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top" className="bg-slate-900 border border-slate-700 text-slate-100 p-3 rounded-xl shadow-2xl max-w-xs z-50">
                                                                                    <p className="font-extrabold text-sm leading-tight">{clientName}</p>
                                                                                    <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-400">
                                                                                        <p>Treatment: <span className="text-emerald-400 font-semibold">{session.service_type || "General Session"}</span></p>
                                                                                        <p>Time: <span className="text-slate-200">{format(startD, "h:mm a")} – {format(endD, "h:mm a")}</span></p>
                                                                                        <p>Status: <span className={cn("font-semibold capitalize", isWait ? "text-amber-400" : "text-emerald-400")}>{session.status}</span></p>
                                                                                        {session.client?.uhid && <p>UHID: <span className="text-slate-300">{session.client.uhid}</span></p>}
                                                                                    </div>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center w-full h-full opacity-15">
                                                                    <div className="w-1 h-1 rounded-full bg-slate-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
