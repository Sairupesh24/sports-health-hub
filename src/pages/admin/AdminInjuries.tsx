import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertCircle, RefreshCw, Trash2, ShieldCheck, Activity, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface InjuryMasterData {
    id: string;
    region: string;
    injury_type: string;
    diagnosis: string;
}

const TEMPLATE_HEADERS = ["Region", "Injury Type", "Diagnosis"];

export default function AdminInjuries() {
    const navigate = useNavigate();
    const [data, setData] = useState<InjuryMasterData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            setLoading(true);
            const result = await apiFetch<InjuryMasterData[]>("/clinical/master-data/list");
            setData(result || []);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        let aoaData: any[][] = [TEMPLATE_HEADERS];

        if (data.length > 0) {
            data.forEach(item => {
                aoaData.push([item.region, item.injury_type, item.diagnosis]);
            });
        } else {
            aoaData.push(["Knee", "Ligament Tear", "ACL Tear"]);
            aoaData.push(["Shoulder", "Tendonitis", "Rotator Cuff Tendonitis"]);
            aoaData.push(["Spine", "Disc Issue", "Lumbar Disc Herniation"]);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoaData);
        XLSX.utils.sheet_add_aoa(ws, [["", "", ""]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["* Note: Uploading a new file will NOT delete existing custom entries, it will append new ones. To clear the database, use the Clear Custom Data button.", "", ""]], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Injury Custom Data");
        XLSX.writeFile(wb, "ISHPO_Custom_Injury_Master_Data.xlsx");
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to delete all custom injury classifications for your organization? Standard global injury rules will remain intact. This action cannot be undone.")) return;

        try {
            setDeleting(true);
            await apiFetch("/clinical/master-data/clear", {
                method: 'DELETE'
            });

            toast({ title: "Success", description: "Custom injury classifications cleared." });
            setData([]);
        } catch (error: any) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });

            if (rows.length < 1) {
                throw new Error("File must contain headers.");
            }

            const headerRow = rows[0] as string[];
            if (headerRow[0] !== "Region" || headerRow[1] !== "Injury Type" || headerRow[2] !== "Diagnosis") {
                throw new Error("Invalid headers. Please use the exact headers: Region, Injury Type, Diagnosis.");
            }

            const itemsToInsert = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || row[0].toString().startsWith('*')) continue;

                const region = row[0]?.toString().trim();
                const injuryType = row[1]?.toString().trim();
                const diagnosis = row[2]?.toString().trim();

                if (region && injuryType && diagnosis) {
                    itemsToInsert.push({
                        region,
                        injury_type: injuryType,
                        diagnosis
                    });
                }
            }

            if (itemsToInsert.length === 0) {
                throw new Error("No valid data rows found to import.");
            }

            await apiFetch('/clinical/master-data/upload', {
                method: 'POST',
                body: {
                    items: itemsToInsert
                }
            });

            toast({ title: "Success", description: `Successfully processed and imported ${itemsToInsert.length} custom injury classifications.` });
            fetchMasterData();

        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <DashboardLayout role="admin">
            <div className="max-w-5xl mx-auto space-y-6 pb-10 fade-in animate-in duration-300">
                {/* Back Link */}
                <button
                    onClick={() => navigate("/admin/settings")}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Settings
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <Activity className="w-6 h-6 text-primary" />
                            Custom Injury Master Data
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Configure custom injury regions, classifications, and exact diagnoses for your organization.
                        </p>
                    </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-emerald-800 text-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                        <span className="font-bold">Standard Database Active:</span> ISHPO has seeded the default database containing 999 standard clinical injury rules globally. These are automatically active. You only need to use this screen if you want to extend ISHPO with custom regions, injury types, or organization-specific diagnoses.
                    </div>
                </div>

                {/* File actions card */}
                <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-400">Manage custom list</CardTitle>
                        <CardDescription className="text-xs">Download template to add rows, then upload the Excel file.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDeleteAll} 
                            disabled={deleting || data.length === 0} 
                            className="text-white hover:bg-red-600 rounded-xl"
                        >
                            {deleting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Clear Custom Data
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={downloadTemplate}
                            className="rounded-xl border-slate-200 text-slate-700 font-semibold"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Template / List
                        </Button>
                        <div>
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <Button
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="rounded-xl bg-primary hover:bg-primary/95 text-white"
                            >
                                {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table card */}
                <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50 border-b border-border/50">
                            <TableRow>
                                <TableHead className="w-1/3 text-xs font-black uppercase text-slate-500">Region</TableHead>
                                <TableHead className="w-1/3 text-xs font-black uppercase text-slate-500">Injury Type</TableHead>
                                <TableHead className="w-1/3 text-xs font-black uppercase text-slate-500">Diagnosis</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground font-medium text-xs">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50 text-primary" />
                                        Syncing custom injury rules...
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground px-4">
                                            <AlertCircle className="w-10 h-10 mb-2 opacity-20 text-slate-500" />
                                            <p className="text-sm font-bold text-slate-700">No Custom Master Data</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-md">
                                                No organization-specific custom injury classifications have been uploaded yet. The standard database rules (999 items) are currently active.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell className="font-semibold text-slate-900 text-xs">{item.region}</TableCell>
                                        <TableCell className="text-slate-600 text-xs">{item.injury_type}</TableCell>
                                        <TableCell className="text-slate-600 text-xs">{item.diagnosis}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {data.length > 0 && (
                    <div className="text-xs font-semibold text-muted-foreground px-1">
                        Showing {data.length} custom classifications configured.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
