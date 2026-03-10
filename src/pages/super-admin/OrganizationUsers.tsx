import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, AlertCircle, CheckCircle2, UserPlus, FileWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

interface OrganizationUsersProps {
    organizationId: string;
}

interface ParsedUser {
    firstName: string;
    middleName?: string;
    lastName: string;
    phone: string;
    role: "admin" | "consultant" | "client";
    email: string;
    password?: string;
    status?: "pending" | "success" | "error";
    errorMsg?: string;
}

const EXPECTED_HEADERS = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Phone Number",
    "Role (admin/consultant/client)",
    "Email",
    "Password (Optional)"
];

export default function OrganizationUsers({ organizationId }: OrganizationUsersProps) {
    const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [resultsSummary, setResultsSummary] = useState<{ successful: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        let aoaData: any[][] = [EXPECTED_HEADERS];

        // Static examples
        aoaData.push(["John", "", "Admin", "+1234567890", "admin", "john.admin@ishpo.com", "TempPass123!"]);
        aoaData.push(["Sarah", "L.", "Physio", "+1987654321", "consultant", "sarah.physio@ishpo.com", ""]);
        aoaData.push(["Mike", "", "Athlete", "+1122334455", "client", "mike.athlete@ishpo.com", ""]);

        const ws = XLSX.utils.aoa_to_sheet(aoaData);

        // Add formatting note
        XLSX.utils.sheet_add_aoa(ws, [[""]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["* Note: Role MUST be EXACTLY 'admin', 'consultant', or 'client' (case-insensitive)."]], { origin: -1 });
        XLSX.utils.sheet_add_aoa(ws, [["* Note: If password is left blank, the system will randomly generate one for the user."]], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users Template");
        XLSX.writeFile(wb, "ISHPO_User_Upload_Template.xlsx");
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            setResultsSummary(null);

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false });

            if (rows.length < 2) {
                throw new Error("File must contain headers and at least one user row.");
            }

            const headerRow = rows[0] as string[];
            if (headerRow[0] !== EXPECTED_HEADERS[0] || headerRow[4] !== EXPECTED_HEADERS[4]) {
                throw new Error("Invalid headers. Please download and use the official template.");
            }

            const parsed: ParsedUser[] = [];

            // Process data rows
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0 || row[0]?.toString().startsWith("*")) continue;

                const roleStr = (row[4] || "").toString().toLowerCase().trim();
                if (!["admin", "consultant", "client"].includes(roleStr)) {
                    throw new Error(`Row ${i + 1}: Invalid or missing Role '${roleStr}'. Must be admin, consultant, or client.`);
                }

                if (!row[0] || !row[2] || !row[5]) {
                    throw new Error(`Row ${i + 1}: First Name, Last Name, and Email are mandatory fields.`);
                }

                parsed.push({
                    firstName: row[0].toString().trim(),
                    middleName: row[1] ? row[1].toString().trim() : undefined,
                    lastName: row[2].toString().trim(),
                    phone: row[3] ? row[3].toString().trim() : "",
                    role: roleStr as any,
                    email: row[5].toString().trim(),
                    password: row[6] ? row[6].toString().trim() : undefined,
                    status: "pending"
                });
            }

            setParsedUsers(parsed);
            toast({ title: "Template Parsed", description: `Found ${parsed.length} valid users ready for import.` });

        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const processUsers = async () => {
        if (parsedUsers.length === 0) return;

        try {
            setProcessing(true);

            const { data, error } = await supabase.functions.invoke("bulk-create-users", {
                body: { users: parsedUsers, organizationId }
            });

            if (error) {
                throw new Error(error.message || "Failed to contact edge function");
            }

            if (!data.success) {
                throw new Error(data.error || "Execution failed");
            }

            const serverResults = data.data; // { successful: X, failed: Y, errors: [...] }
            setResultsSummary({ successful: serverResults.successful, failed: serverResults.failed });

            // Map errors back to UI state
            const updatedUsers = parsedUsers.map(u => {
                const errMatch = serverResults.errors?.find((e: any) => e.email === u.email);
                if (errMatch) {
                    return { ...u, status: "error" as const, errorMsg: errMatch.error };
                }
                return { ...u, status: "success" as const };
            });

            setParsedUsers(updatedUsers);

            if (serverResults.failed > 0) {
                toast({ title: "Import Completed with Errors", description: `${serverResults.successful} created, ${serverResults.failed} failed.`, variant: "destructive" });
            } else {
                toast({ title: "Import Successful", description: `All ${serverResults.successful} users were created.` });
            }

        } catch (error: any) {
            toast({ title: "Processing Failed", description: error.message, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 sm:p-6 rounded-xl border border-border">
                <div>
                    <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Bulk User Importer
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                        Upload an Excel file to mass-create Admins, Consultants, and Clients for this organization simultaneously.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="w-4 h-4 mr-2" />
                        Template
                    </Button>

                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />

                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || processing}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Parsing..." : "Upload File"}
                    </Button>
                </div>
            </div>

            {resultsSummary && (
                <div className={`p-4 rounded-lg border ${resultsSummary.failed > 0 ? "bg-destructive/10 border-destructive/20 text-destructive-foreground" : "bg-success/10 border-success/20 text-success-foreground"} flex items-center gap-3`}>
                    {resultsSummary.failed > 0 ? <FileWarning className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    <div>
                        <p className="font-medium">Import Results</p>
                        <p className="text-sm opacity-90">Successfully inserted: {resultsSummary.successful} | Failed: {resultsSummary.failed}</p>
                    </div>
                </div>
            )}

            {parsedUsers.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
                        <h3 className="font-medium">Data Preview ({parsedUsers.length} Users)</h3>

                        {!resultsSummary && (
                            <Button onClick={processUsers} disabled={processing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                {processing ? "Processing..." : "Confirm & Create Users"}
                            </Button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Password</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedUsers.map((user, idx) => (
                                    <TableRow key={idx} className={user.status === 'error' ? "bg-destructive/5" : ""}>
                                        <TableCell>
                                            {user.status === 'pending' && <Badge variant="outline" className="text-muted-foreground">Pending</Badge>}
                                            {user.status === 'success' && <Badge variant="default" className="bg-success">Created</Badge>}
                                            {user.status === 'error' && (
                                                <div className="flex items-center gap-1 text-destructive group relative cursor-help">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Failed</span>

                                                    {user.errorMsg && (
                                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-destructive text-destructive-foreground text-xs rounded shadow-lg hidden group-hover:block z-10">
                                                            {user.errorMsg}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{user.firstName} {user.middleName || ""} {user.lastName}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{user.phone || "-"}</TableCell>
                                        <TableCell>
                                            {user.password ? (
                                                <span className="text-muted-foreground text-xs bg-muted px-2 py-1 rounded">Provided</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">Auto-gen</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}
