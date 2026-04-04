import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, User, Search, Filter } from "lucide-react";
import InjuryDetailModal from "@/components/consultant/InjuryDetailModal";
import { Input } from "@/components/ui/input";

export interface InjuryOverview {
    id: string;
    injury_date: string;
    injury_type: string;
    diagnosis: string;
    status: string;
    region: string;
    severity: string;
    injury_side: string;
    mechanism_of_injury: string;
    clinical_notes: string;
    expected_return_date: string;
    resolved_date: string;
    client_id: string;
    client: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

const STATUS_COLORS: Record<string, string> = {
    Acute: "bg-red-100 text-red-700 border-red-200",
    Rehab: "bg-blue-100 text-blue-700 border-blue-200",
    RTP: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Resolved: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function InjuryRepoPage() {
    const [injuries, setInjuries] = useState<InjuryOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInjury, setSelectedInjury] = useState<InjuryOverview | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchAllInjuries = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from("injuries")
                    .select(`
                        id,
                        injury_date,
                        injury_type,
                        diagnosis,
                        status,
                        region,
                        severity,
                        injury_side,
                        mechanism_of_injury,
                        clinical_notes,
                        expected_return_date,
                        resolved_date,
                        client_id,
                        client:clients!injuries_client_id_fkey(id, first_name, last_name)
                    `)
                    .order("injury_date", { ascending: false });

                if (error) {
                    console.error("Error fetching injuries:", error);
                } else {
                    setInjuries(data as unknown as InjuryOverview[]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllInjuries();
    }, []);

    const filtered = injuries.filter(inj => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (inj.client?.first_name + " " + inj.client?.last_name).toLowerCase().includes(q) ||
            (inj.diagnosis || "").toLowerCase().includes(q) ||
            (inj.region || "").toLowerCase().includes(q) ||
            (inj.status || "").toLowerCase().includes(q)
        );
    });

    const statusChip = (status: string) => {
        const cls = STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-200";
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
                {status || "Unknown"}
            </span>
        );
    };

    return (
        <DashboardLayout role="consultant">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <Activity className="w-6 h-6 text-primary" />
                            Injury Repo
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            All recorded athlete injuries · Click any row to view clinical details
                        </p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search client, diagnosis, region…"
                            className="pl-9 w-72 bg-card"
                        />
                    </div>
                </div>

                {/* Summary chips */}
                {!loading && injuries.length > 0 && (
                    <div className="flex gap-3 flex-wrap text-sm">
                        {["Acute", "Rehab", "RTP", "Resolved"].map(s => {
                            const count = injuries.filter(i => i.status === s).length;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={s}
                                    onClick={() => setSearch(prev => prev === s ? "" : s)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium transition-all ${STATUS_COLORS[s]} ${search === s ? "ring-2 ring-offset-1 ring-current opacity-100" : "opacity-80 hover:opacity-100"}`}
                                >
                                    {s}
                                    <span className="font-bold">{count}</span>
                                </button>
                            );
                        })}
                        <span className="ml-auto text-muted-foreground self-center">
                            {filtered.length} of {injuries.length} records
                        </span>
                    </div>
                )}

                {/* Table */}
                <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Client</th>
                                    <th className="px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Diagnosis</th>
                                    <th className="px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Region</th>
                                    <th className="px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Severity</th>
                                    <th className="px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                                    <th className="px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i}>
                                            {Array(6).fill(0).map((_, j) => (
                                                <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-14 text-center text-muted-foreground">
                                            <Activity className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                            <p className="text-sm font-medium">No injuries found{search ? ` for "${search}"` : ""}.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((injury) => (
                                        <tr
                                            key={injury.id}
                                            className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedInjury(injury)}
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-foreground">
                                                        {injury.client?.first_name} {injury.client?.last_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-foreground max-w-[220px] truncate">
                                                {injury.diagnosis || injury.injury_type || "–"}
                                            </td>
                                            <td className="px-5 py-3.5 text-muted-foreground">
                                                {injury.region || "–"}
                                            </td>
                                            <td className="px-5 py-3.5 text-muted-foreground">
                                                {injury.severity || "–"}
                                            </td>
                                            <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                                                {injury.injury_date ? format(new Date(injury.injury_date), "dd MMM yyyy") : "–"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {statusChip(injury.status)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedInjury && (
                <InjuryDetailModal
                    open={!!selectedInjury}
                    onOpenChange={(isOpen) => !isOpen && setSelectedInjury(null)}
                    injury={selectedInjury}
                />
            )}
        </DashboardLayout>
    );
}
