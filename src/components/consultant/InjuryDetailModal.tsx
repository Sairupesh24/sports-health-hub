import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { User, Calendar, Activity, ClipboardList, MapPin, Stethoscope, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { InjuryOverview } from "@/pages/consultant/InjuryRepoPage";

interface InjuryDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    injury: InjuryOverview;
}

const STATUS_COLORS: Record<string, string> = {
    Acute: "bg-red-100 text-red-700 border-red-200",
    Rehab: "bg-blue-100 text-blue-700 border-blue-200",
    RTP: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Resolved: "bg-gray-100 text-gray-600 border-gray-200",
};

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start gap-4 py-2 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground text-xs flex items-center gap-1.5 shrink-0 pt-0.5">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
            </span>
            <span className="font-medium text-sm text-right text-foreground">{value || "–"}</span>
        </div>
    );
}

export default function InjuryDetailModal({ open, onOpenChange, injury }: InjuryDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [primaryTherapist, setPrimaryTherapist] = useState<string | null>(null);
    const [recentTherapist, setRecentTherapist] = useState<string | null>(null);
    const [lastActivityDate, setLastActivityDate] = useState<string | null>(null);
    const [painScores, setPainScores] = useState<{ date: string; score: number }[]>([]);

    useEffect(() => {
        if (!open || !injury?.client_id) return;

        const fetchDetails = async () => {
            setLoading(true);
            setPrimaryTherapist(null);
            setRecentTherapist(null);
            setLastActivityDate(null);
            setPainScores([]);

            try {
                // 1. PRIMARY THERAPIST — from clients.assigned_consultant_id → profiles
                const { data: clientRow } = await supabase
                    .from("clients")
                    .select(`
                        id,
                        assigned_consultant_id,
                        consultant:profiles!clients_assigned_consultant_id_fkey(first_name, last_name, profession)
                    `)
                    .eq("id", injury.client_id)
                    .single();

                if (clientRow?.consultant) {
                    const c = clientRow.consultant as any;
                    const profLabel = c.profession ? ` (${c.profession})` : "";
                    setPrimaryTherapist(`Dr. ${c.first_name} ${c.last_name}${profLabel}`);
                } else {
                    setPrimaryTherapist("Unassigned");
                }

                // 2. RECENT THERAPIST — from latest session that has a therapist_id
                const { data: sessionsData } = await supabase
                    .from("sessions")
                    .select(`
                        id,
                        scheduled_start,
                        status,
                        therapist_id,
                        therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, profession),
                        physio_session_details(pain_score)
                    `)
                    .eq("client_id", injury.client_id)
                    .order("scheduled_start", { ascending: false })
                    .limit(15);

                if (sessionsData && sessionsData.length > 0) {
                    // Most recent session with a therapist
                    const withTherapist = sessionsData.find(s => s.therapist_id);
                    if (withTherapist?.therapist) {
                        const t = withTherapist.therapist as any;
                        const profLabel = t.profession ? ` (${t.profession})` : "";
                        setRecentTherapist(`Dr. ${t.first_name} ${t.last_name}${profLabel}`);
                    } else {
                        setRecentTherapist("Not assigned");
                    }
                    setLastActivityDate(sessionsData[0].scheduled_start);

                    // Pain score trend — from physio_session_details, chronological
                    const scores = sessionsData
                        .filter(s => {
                            const d = s.physio_session_details;
                            return d && (Array.isArray(d) ? d.length > 0 : Object.keys(d).length > 0);
                        })
                        .map(s => {
                            const d: any = Array.isArray(s.physio_session_details)
                                ? (s.physio_session_details as any[])[0]
                                : s.physio_session_details;
                            return {
                                date: format(new Date(s.scheduled_start), "MMM d"),
                                score: typeof d?.pain_score === "number" ? d.pain_score : 0,
                            };
                        })
                        .reverse();

                    setPainScores(scores);
                } else {
                    setRecentTherapist("No sessions recorded");
                    setLastActivityDate(injury.injury_date);
                }
            } catch (err) {
                console.error("Error fetching injury details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [open, injury?.id]);

    const statusCls = STATUS_COLORS[injury.status] || "bg-gray-100 text-gray-600 border-gray-200";

    // Latest and trend direction
    const latestScore = painScores.length > 0 ? painScores[painScores.length - 1].score : null;
    const prevScore = painScores.length > 1 ? painScores[painScores.length - 2].score : null;
    const trend = latestScore !== null && prevScore !== null
        ? latestScore < prevScore ? "improving" : latestScore > prevScore ? "worsening" : "stable"
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4 border-b border-border">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <DialogTitle className="text-xl font-display">
                                {injury.client?.first_name} {injury.client?.last_name}
                            </DialogTitle>
                            <DialogDescription className="mt-1 font-medium text-sm text-foreground/70">
                                {injury.diagnosis || injury.injury_type || "Injury record"}
                            </DialogDescription>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${statusCls} mt-1 shrink-0`}>
                            {injury.status || "Unknown"}
                        </span>
                    </div>
                </DialogHeader>

                <div className="pt-4 space-y-6">
                    {/* ===== THERAPIST SECTION (TOP / PROMINENT) ===== */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* PRIMARY */}
                        <div className="p-4 rounded-xl border-2 border-primary/25 bg-primary/5 shadow-sm">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary mb-2">
                                Assigned Primary Therapist
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                {loading
                                    ? <Skeleton className="h-5 w-40" />
                                    : <p className="font-bold text-base text-foreground">{primaryTherapist}</p>
                                }
                            </div>
                        </div>

                        {/* RECENT */}
                        <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                                Most Recent Session Therapist
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <Stethoscope className="w-5 h-5 text-muted-foreground" />
                                </div>
                                {loading
                                    ? <Skeleton className="h-5 w-40" />
                                    : <p className="font-semibold text-sm text-foreground">{recentTherapist}</p>
                                }
                            </div>
                        </div>
                    </div>

                    {/* ===== MAIN BODY: 2 COLUMNS ===== */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT: Clinical Details */}
                        <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-3">
                                Clinical Details
                            </h4>
                            <div className="space-y-0">
                                <InfoRow icon={Activity} label="Type" value={injury.injury_type} />
                                <InfoRow icon={MapPin} label="Region / Part" value={injury.region} />
                                <InfoRow label="Side" value={injury.injury_side} />
                                <InfoRow label="Severity" value={injury.severity} />
                                <InfoRow label="Mechanism" value={injury.mechanism_of_injury} />
                                <InfoRow icon={Calendar} label="Date Recorded" value={injury.injury_date ? format(new Date(injury.injury_date), "dd MMM yyyy") : "–"} />
                                <InfoRow label="Expected Return" value={injury.expected_return_date ? format(new Date(injury.expected_return_date), "dd MMM yyyy") : "–"} />
                                {injury.resolved_date && (
                                    <InfoRow icon={CheckCircle2} label="Resolved On" value={format(new Date(injury.resolved_date), "dd MMM yyyy")} />
                                )}
                                <InfoRow icon={ClipboardList} label="Last Activity" value={
                                    loading
                                        ? <Skeleton className="h-4 w-24 inline-block" />
                                        : lastActivityDate ? format(new Date(lastActivityDate), "dd MMM yyyy") : "No Activity"
                                } />
                            </div>

                            {/* Clinical Notes */}
                            {injury.clinical_notes && (
                                <div className="mt-4">
                                    <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Clinical Notes</p>
                                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                        {injury.clinical_notes}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Pain Score Trend */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                                    Pain Score Trend
                                </h4>
                                {!loading && latestScore !== null && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-2xl font-black text-foreground leading-none">{latestScore}</span>
                                        <span className="text-xs text-muted-foreground">/10</span>
                                        {trend === "improving" && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">↓ Improving</span>}
                                        {trend === "worsening" && <span className="text-xs font-semibold text-red-600 flex items-center gap-0.5">↑ Worsening</span>}
                                        {trend === "stable" && <span className="text-xs font-semibold text-blue-600">→ Stable</span>}
                                    </div>
                                )}
                            </div>

                            <div className="h-[180px] w-full">
                                {loading ? (
                                    <Skeleton className="w-full h-full rounded-xl" />
                                ) : painScores.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={painScores} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                            <ReferenceLine y={5} strokeDasharray="4 2" stroke="hsl(var(--muted-foreground))" opacity={0.4} label={{ value: "Mid", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                                                formatter={(v: any) => [`${v}/10`, "Pain"]}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2.5}
                                                dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                                                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                                name="Pain"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : painScores.length === 1 ? (
                                    <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border gap-1">
                                        <span className="text-4xl font-black text-foreground">{painScores[0].score}<span className="text-lg text-muted-foreground font-normal">/10</span></span>
                                        <span className="text-xs text-muted-foreground">Latest score · Need ≥2 sessions for trend</span>
                                    </div>
                                ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border gap-1">
                                        <Activity className="w-7 h-7 text-muted-foreground/40" />
                                        <span className="text-xs text-muted-foreground">No SOAP notes with pain scores found</span>
                                    </div>
                                )}
                            </div>

                            {/* Trend description */}
                            {!loading && painScores.length > 1 && (
                                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                                    Based on {painScores.length} recorded session{painScores.length > 1 ? "s" : ""}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
