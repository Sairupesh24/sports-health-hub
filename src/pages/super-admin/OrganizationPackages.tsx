import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/utils/api";
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
    category?: string;
    tax_percentage?: number;
    description: string;
    price: number;
    items?: ServicePackageItem[];
}

const BASE_HEADERS = [
    "Package Name",
    "Category",
    "Tax Amount",
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
            const data = await apiFetch<any[]>(`/master-console/packages?organization_id=${organizationId}`);

            // Map the nested relational structure from backend
            const formatted: ServicePackage[] = (data || []).map((pkg) => ({
                id: pkg.id,
                name: pkg.name,
                category: pkg.category || "Others",
                tax_percentage: Number(pkg.tax_percentage) || 0,
                description: pkg.description || "",
                price: pkg.price || 0,
                items: (pkg.items || []).filter((i: any) => i.id !== null).map((item: any) => ({
                    id: item.id,
                    service_type: item.service?.name || "Unknown",
                    default_sessions: item.sessions_included
                }))
            }));
            
            setPackages(formatted);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const existingServices = new Set<string>();
        packages.forEach(pkg => {
            pkg.items?.forEach(item => existingServices.add(item.service_type));
        });

        const allServices = Array.from(new Set([...DEFAULT_SERVICES, ...Array.from(existingServices)]));
        const dynamicHeaders = [...BASE_HEADERS, ...allServices.map(s => `${s} Sessions`)];
        let aoaData: any[][] = [dynamicHeaders];

        if (packages.length > 0) {
            packages.forEach(pkg => {
                const row = [pkg.name, pkg.category || "Others", pkg.tax_percentage || 0, pkg.description || "", pkg.price || 0];
                allServices.forEach(service => {
                    const sessionCount = pkg.items?.find(i => i.service_type === service)?.default_sessions || 0;
                    row.push(sessionCount);
                });
                aoaData.push(row);
            });
        } else {
            aoaData.push(["Standard Rehab Pack", "Rehab Session", 12, "10 Physio sessions to get you back on your feet", 1500, 10, 0, 0, 1, 0, 0]);
            aoaData.push(["Rehab to Performance", "Assessment", 18, "Full transition from rehab to strength training", 3500, 5, 10, 2, 0, 0, 0]);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoaData);
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

            const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, blankrows: false });

            if (rows.length < 1) {
                throw new Error("File must contain headers.");
            }

            const headerRow = rows[0].map(h => (h || "").toString());
            if (headerRow.length < 5 || headerRow[0] !== "Package Name" || headerRow[1] !== "Category" || headerRow[2] !== "Tax Amount" || headerRow[3] !== "Description" || headerRow[4] !== "Price (Rs)") {
                throw new Error("Invalid headers. The first 5 columns must be Package Name, Category, Tax Amount, Description, and Price (Rs).");
            }

            const serviceTypes: string[] = [];
            for (let col = 5; col < headerRow.length; col++) {
                let headerName = headerRow[col]?.trim() || "";
                if (headerName.endsWith(" Sessions")) {
                    headerName = headerName.substring(0, headerName.lastIndexOf(" Sessions")).trim();
                }
                serviceTypes.push(headerName);
            }

            const packagesToUpload = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || row[0].toString().startsWith('*')) continue;

                const name = row[0]?.toString().trim();
                const category = row[1]?.toString().trim() || "Others";
                const tax_percentage = parseFloat(row[2]?.toString() || "0");
                const description = row[3]?.toString().trim() || null;
                const priceValue = row[4]?.toString() || "0";
                const price = parseFloat(priceValue);

                if (!name) continue;

                const items = [];
                for (let col = 5; col < headerRow.length; col++) {
                    const sessionCount = parseInt(row[col]?.toString() || "0", 10);
                    if (!isNaN(sessionCount) && sessionCount > 0) {
                        const serviceType = serviceTypes[col - 5];
                        if (serviceType) {
                            items.push({
                                service_name: serviceType,
                                sessions_included: sessionCount
                            });
                        }
                    }
                }

                packagesToUpload.push({
                    name,
                    category,
                    tax_percentage,
                    description,
                    price,
                    items
                });
            }

            await apiFetch('/master-console/packages', {
                method: 'POST',
                data: {
                    organizationId,
                    packages: packagesToUpload
                }
            });

            toast({ title: "Success", description: `Successfully uploaded ${packagesToUpload.length} packages.` });
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
                            <TableHead>Category</TableHead>
                            <TableHead>Tax Rate</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="w-1/3">Included Services</TableHead>
                            <TableHead>Total Sessions</TableHead>
                            <TableHead>Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading packages...</TableCell>
                            </TableRow>
                        ) : packages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
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
                                        <TableCell>
                                            <Badge variant="outline" className="font-medium capitalize text-[10px]">
                                                {pkg.category || "Others"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{pkg.tax_percentage || 0}%</TableCell>
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
