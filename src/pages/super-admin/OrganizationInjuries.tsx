import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface OrganizationInjuriesProps {
    organizationId: string;
}

interface InjuryMasterData {
    id: string;
    region: string;
    injury_type: string;
    diagnosis: string;
}

const TEMPLATE_HEADERS = ["Region", "Injury Type", "Diagnosis"];

export default function OrganizationInjuries({ organizationId }: OrganizationInjuriesProps) {
    const [data, setData] = useState<InjuryMasterData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMasterData();
    }, [organizationId]);

    const fetchMasterData = async () => {
        try {
            setLoading(true);
            const { data: dbData, error } = await supabase
                .from("injury_master_data")
                .select("*")
                .eq("organization_id", organizationId)
                .order("region", { ascending: true })
                .order("injury_type", { ascending: true });

            if (error) throw error;
            setData(dbData || []);
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
            // Static examples
            aoaData.push(["Knee", "Ligament Tear", "ACL Tear"]);
            aoaData.push(["Shoulder", "Tendonitis", "Rotator Cuff Tendonitis"]);
            aoaData.push(["Spine", "Disc Issue", "Lumbar Disc Herniation"]);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoaData);
        XLSX.utils.sheet_add_aoa(ws, [["", "", ""]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["* Note: Uploading a new file will NOT delete existing entries, it will add new ones. To clear the database, use the Delete All button.", "", ""]], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Injury Master Data");
        XLSX.writeFile(wb, "ISHPO_Injury_Master_Data.xlsx");
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to delete all injury master data for this organization? This action cannot be undone.")) return;

        try {
            setDeleting(true);
            const { error } = await supabase
                .from("injury_master_data")
                .delete()
                .eq("organization_id", organizationId);

            if (error) throw error;

            toast({ title: "Success", description: "All injury master data cleared." });
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

            const itemsToInsert: { organization_id: string, region: string, injury_type: string, diagnosis: string }[] = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || row[0].toString().startsWith('*')) continue; // Skip empty or footer notes

                const region = row[0]?.toString().trim();
                const injuryType = row[1]?.toString().trim();
                const diagnosis = row[2]?.toString().trim();

                if (region && injuryType && diagnosis) {
                    itemsToInsert.push({
                        organization_id: organizationId,
                        region,
                        injury_type: injuryType,
                        diagnosis
                    });
                }
            }

            if (itemsToInsert.length === 0) {
                throw new Error("No valid data rows found to import.");
            }

            // Using UPSERT or ON CONFLICT requires a unique constraint matching the exact columns
            // Since we added UNIQUE(organization_id, region, injury_type, diagnosis) in the migration,
            // we can just catch duplicate errors if we don't use upsert, or we can upsert safely.
            const { error } = await supabase
                .from("injury_master_data")
                .upsert(itemsToInsert, {
                    onConflict: 'organization_id,region,injury_type,diagnosis',
                    ignoreDuplicates: true
                });

            if (error) throw error;

            toast({ title: "Success", description: `Successfully processed ${itemsToInsert.length} rules.` });
            fetchMasterData();

        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-display font-semibold text-lg">Injury Master Data</h3>
                    <p className="text-sm text-muted-foreground">Manage cascading dropdowns via bulk upload.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={deleting || data.length === 0} className="mr-4 text-white hover:bg-red-600">
                        {deleting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Clear Database
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
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
                        >
                            {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload Excel
                        </Button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/3">Region</TableHead>
                            <TableHead className="w-1/3">Injury Type</TableHead>
                            <TableHead className="w-1/3">Diagnosis</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Loading data...</TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                                        <p>No master data found.</p>
                                        <p className="text-sm">Download the template to format your Excel list, then upload it here.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-foreground">{item.region}</TableCell>
                                    <TableCell>{item.injury_type}</TableCell>
                                    <TableCell>{item.diagnosis}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-muted-foreground mt-2">
                Showing {data.length} total entries.
            </div>
        </div>
    );
}
