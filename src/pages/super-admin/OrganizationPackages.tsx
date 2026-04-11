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
                .from("packages")
                .select(`
                    id, name, description, price,
                    items:package_services (
                        id,
                        sessions_included,
                        service:services(name)
                    )
                `)
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            
            // Map the nested relational structure back into the generic ServicePackage interface 
            const formatted: ServicePackage[] = (data || []).map((pkg) => ({
                id: pkg.id,
                name: pkg.name,
                description: pkg.description || "",
                price: pkg.price || 0,
                items: pkg.items ? (Array.isArray(pkg.items) ? pkg.items : [pkg.items]).map((item) => ({
                    id: item.id,
                    service_type: ((item.service as unknown) as { name: string })?.name || "Unknown",
                    default_sessions: item.sessions_included
                })) : []
            }));
            
            setPackages(formatted);
        } catch (error: unknown) {
            const err = error as Error;
            toast({ title: "Error", description: err.message, variant: "destructive" });
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
            const rows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, blankrows: false });

            if (rows.length < 1) {
                throw new Error("File must contain headers.");
            }

            const headerRow = rows[0].map(h => (h || "").toString());
            if (headerRow.length < 3 || headerRow[0] !== "Package Name" || headerRow[1] !== "Description" || headerRow[2] !== "Price (Rs)") {
                throw new Error("Invalid headers. The first 3 columns must be Package Name, Description, and Price (Rs).");
            }

            // Extract dynamic service names from headers
            const serviceTypes: string[] = [];
            for (let col = 3; col < headerRow.length; col++) {
                let headerName = headerRow[col]?.trim() || "";
                if (headerName.endsWith(" Sessions")) {
                    headerName = headerName.substring(0, headerName.lastIndexOf(" Sessions")).trim();
                }
                serviceTypes.push(headerName);
            }

            // Step A: Ensure all serviceTypes exist in the org's `services` table
            const { data: existingServicesData, error: servicesError } = await supabase
                .from("services")
                .select("id, name")
                .eq("organization_id", organizationId);
                
            if (servicesError) throw servicesError;
            
            const servicesMap: Record<string, string> = {};
            if (existingServicesData) {
                existingServicesData.forEach((s) => servicesMap[s.name.toLowerCase()] = s.id);
            }
            
            const missingServices = serviceTypes.filter(st => !servicesMap[st.toLowerCase()]);
            if (missingServices.length > 0) {
                const newServicesArray = missingServices.map(name => ({
                    organization_id: organizationId,
                    name: name,
                    category: "General",
                    default_session_duration: 60,
                    is_active: true
                }));
                
                const { data: newlyInsertedServices, error: insertServicesError } = await supabase
                    .from("services")
                    .insert(newServicesArray)
                    .select();
                    
                if (insertServicesError) throw insertServicesError;
                if (newlyInsertedServices) {
                    newlyInsertedServices.forEach(s => servicesMap[s.name.toLowerCase()] = s.id);
                }
            }

            let insertedCount = 0;
            const processedPackageIds: string[] = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0] || row[0].toString().startsWith('*')) continue;

                const name = row[0]?.toString().trim();
                const description = row[1]?.toString().trim() || null;
                const priceValue = row[2]?.toString() || "0";
                const price = parseFloat(priceValue);

                if (!name) {
                    throw new Error(`Row ${i + 1} is missing a Package Name.`);
                }

                // 1. Upsert the Package Header (avoiding deletion to preserve FKs in bills)
                const { data: pkgData, error: pkgError } = await supabase
                    .from("packages")
                    .upsert({
                        organization_id: organizationId,
                        name,
                        description,
                        price
                    }, {
                        onConflict: 'organization_id, name'
                    })
                    .select()
                    .single();

                if (pkgError) throw pkgError;
                if (!pkgData) continue;

                const packageId = pkgData.id;
                processedPackageIds.push(packageId);

                // 2. Clear existing services for THIS package SPECIFICALLY
                const { error: clearItemsError } = await supabase
                    .from("package_services")
                    .delete()
                    .eq("package_id", packageId);

                if (clearItemsError) throw clearItemsError;

                // 3. Insert the new Package Items
                const itemsToInsert: { package_id: string, service_id: string, sessions_included: number }[] = [];

                for (let col = 3; col < headerRow.length; col++) {
                    const sessionCount = parseInt(row[col]?.toString() || "0", 10);
                    if (!isNaN(sessionCount) && sessionCount > 0) {
                        const serviceType = serviceTypes[col - 3];
                        if (serviceType) {
                            const serviceId = servicesMap[serviceType.toLowerCase()];
                            if (serviceId) {
                                itemsToInsert.push({
                                    package_id: packageId,
                                    service_id: serviceId,
                                    sessions_included: sessionCount
                                });
                            }
                        }
                    }
                }

                if (itemsToInsert.length > 0) {
                    const { error: itemsError } = await supabase
                        .from("package_services")
                        .insert(itemsToInsert);

                    if (itemsError) throw itemsError;
                }

                insertedCount++;
            }

            // 4. Soft-delete packages that were NOT in the new file
            if (processedPackageIds.length > 0) {
                await supabase
                    .from("packages")
                    .update({ deleted_at: new Date().toISOString() })
                    .eq("organization_id", organizationId)
                    .not("id", "in", `(${processedPackageIds.join(",")})`);
            }

            toast({ title: "Success", description: `Successfully uploaded ${insertedCount} packages.` });
            fetchPackages();

        } catch (error: unknown) {
            const err = error as Error;
            toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
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
