import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

interface OrganizationPackagesProps {
    organizationId: string;
}

interface ServicePackageItem {
    id: string;
    service_type: string;
    default_sessions: number;
}

interface ServicePackage {
    id: string;
    name: string;
    description: string;
    price: number;
    items?: ServicePackageItem[];
}

const BASE_HEADERS = [
    "Package Name",
    "Description",
    "Price (Rs)"
];

const DEFAULT_SERVICES = [
    "Physiotherapy",
    "Strength & Conditioning",
    "Nutrition",
    "Consultation",
    "Active Recovery Training",
    "Assessment"
];

export default function OrganizationPackages({ organizationId }: OrganizationPackagesProps) {
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPackages();
    }, [organizationId]);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("service_packages")
                .select(`
                    *,
                    items:service_package_items (
                        id,
                        service_type,
                        default_sessions
                    )
                `)
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPackages(data || []);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        // Find all unique service types currently in the DB
        const existingServices = new Set<string>();
        packages.forEach(pkg => {
            pkg.items?.forEach(item => existingServices.add(item.service_type));
        });

        // Merge with defaults to ensure we always have standard columns
        const allServices = Array.from(new Set([...DEFAULT_SERVICES, ...Array.from(existingServices)]));

        const dynamicHeaders = [...BASE_HEADERS, ...allServices.map(s => `${s} Sessions`)];
        let aoaData: any[][] = [dynamicHeaders];

        if (packages.length > 0) {
            // Pre-fill existing packages
            packages.forEach(pkg => {
                const row = [pkg.name, pkg.description || "", pkg.price || 0];

                allServices.forEach(service => {
                    const sessionCount = pkg.items?.find(i => i.service_type === service)?.default_sessions || 0;
                    row.push(sessionCount);
                });

                aoaData.push(row);
            });
        } else {
            // Static examples
            aoaData.push(["Standard Rehab Pack", "10 Physio sessions to get you back on your feet", 1500, 10, 0, 0, 1, 0, 0]);
            aoaData.push(["Rehab to Performance", "Full transition from rehab to strength training", 3500, 5, 10, 2, 0, 0, 0]);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoaData);

        // Add a note about zero values
        XLSX.utils.sheet_add_aoa(ws, [["", "", "", "", "", "", "", ""]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["* Note: Leave session counts blank or 0 if the package does not include that service. To delete all packages, upload a file with only headers.", "", "", "", "", "", "", ""]], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Packages Template");
        XLSX.writeFile(wb, "ISHPO_Multi_Service_Packages.xlsx");
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // Parse as array of arrays, skip empty rows
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });

            if (rows.length < 1) {
                throw new Error("File must contain headers.");
            }

            const headerRow = rows[0] as string[];
            if (headerRow.length < 3 || headerRow[0] !== "Package Name" || headerRow[1] !== "Description" || headerRow[2] !== "Price (Rs)") {
                throw new Error("Invalid headers. The first 3 columns must be Package Name, Description, and Price (Rs).");
            }

            // Extract dynamic service names from headers
            const serviceTypes: string[] = [];
            for (let col = 3; col < headerRow.length; col++) {
                let headerName = headerRow[col]?.toString().trim() || "";
                if (headerName.endsWith(" Sessions")) {
                    headerName = headerName.substring(0, headerName.lastIndexOf(" Sessions")).trim();
                }
                serviceTypes.push(headerName);
            }

            // Replace existing logic: Old packages are wiped completely
            const { error: deleteError } = await supabase
                .from("service_packages")
                .delete()
                .eq("organization_id", organizationId);

            if (deleteError) throw deleteError;

            let insertedCount = 0;

            // Sequential insert for logical packages and items
            // We ignore header and footer notes
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || row[0].toString().startsWith('*')) continue; // Skip empty rows or footer notes

                const name = row[0]?.toString().trim();
                const description = row[1]?.toString().trim() || null;
                const price = parseFloat(row[2]?.toString() || "0");

                if (!name) {
                    throw new Error(`Row ${i + 1} is missing a Package Name.`);
                }

                // 1. Insert the Package Header
                const { data: pkgData, error: pkgError } = await supabase
                    .from("service_packages")
                    .insert({
                        organization_id: organizationId,
                        name,
                        description,
                        price
                    })
                    .select()
                    .single();

                if (pkgError) throw pkgError;

                const packageId = pkgData.id;

                // 2. Insert the Package Items
                const itemsToInsert: { package_id: string, service_type: string, default_sessions: number }[] = [];

                // Check dynamic columns for session counts
                for (let col = 3; col < headerRow.length; col++) {
                    const sessionCount = parseInt(row[col]?.toString() || "0", 10);
                    if (!isNaN(sessionCount) && sessionCount > 0) {
                        const serviceType = serviceTypes[col - 3];
                        if (serviceType) {
                            itemsToInsert.push({
                                package_id: packageId,
                                service_type: serviceType,
                                default_sessions: sessionCount
                            });
                        }
                    }
                }

                if (itemsToInsert.length > 0) {
                    const { error: itemsError } = await supabase
                        .from("service_package_items")
                        .insert(itemsToInsert);

                    if (itemsError) throw itemsError;
                }

                insertedCount++;
            }

            toast({ title: "Success", description: `Successfully uploaded ${insertedCount} packages.` });
            fetchPackages();

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
                    <h3 className="font-display font-semibold text-lg">Entitlement Packages</h3>
                    <p className="text-sm text-muted-foreground">Manage multi-service packages for this organization via bulk upload.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                            Upload Packages
                        </Button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/4">Package Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="w-1/3">Included Services</TableHead>
                            <TableHead>Total Sessions</TableHead>
                            <TableHead>Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading packages...</TableCell>
                            </TableRow>
                        ) : packages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                                        <p>No packages found.</p>
                                        <p className="text-sm">Download the template and upload your first packages.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            packages.map((pkg) => {
                                const totalSessions = pkg.items?.reduce((acc, item) => acc + item.default_sessions, 0) || 0;

                                return (
                                    <TableRow key={pkg.id}>
                                        <TableCell className="font-medium text-foreground">{pkg.name}</TableCell>
                                        <TableCell className="font-semibold text-primary">Rs. {pkg.price}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {pkg.items && pkg.items.length > 0 ? (
                                                    pkg.items.map(item => (
                                                        <Badge key={item.id} variant="secondary" className="whitespace-nowrap">
                                                            {item.default_sessions}x {item.service_type}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground italic text-sm">No services configured</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold">{totalSessions}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-[200px] truncate" title={pkg.description || ""}>
                                            {pkg.description || "-"}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
