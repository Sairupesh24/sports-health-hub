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

            // Use defval to ensure empty cells produce empty strings instead of being omitted
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, blankrows: false, defval: "" });

            if (rows.length < 2) {
                throw new Error("File must contain headers and at least one user row.");
            }

            // Dynamically map column indices from the header row
            const headerRow = (rows[0] as any[]).map(h => (h || "").toString().trim().toLowerCase());

            const findCol = (keywords: string[]): number => {
                return headerRow.findIndex(h => keywords.some(kw => h.includes(kw)));
            };

            const colFirst    = findCol(["first name", "first"]);
            const colMiddle   = findCol(["middle"]);
            const colLast     = findCol(["last name", "last"]);
            const colPhone    = findCol(["phone"]);
            const colRole     = findCol(["role"]);
            const colEmail    = findCol(["email"]);
            const colPassword = findCol(["password"]);

            // Validate that required columns were found
            if (colFirst === -1 || colLast === -1 || colRole === -1 || colEmail === -1) {
                const missing = [];
                if (colFirst === -1) missing.push("First Name");
                if (colLast === -1) missing.push("Last Name");
                if (colRole === -1) missing.push("Role");
                if (colEmail === -1) missing.push("Email");
                throw new Error(`Missing required columns: ${missing.join(", ")}. Please download and use the official template.`);
            }

            const parsed: ParsedUser[] = [];

            // Process data rows
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i] as any[];
                if (!row || row.length === 0) continue;

                // Skip rows where all cells are empty (defval:"" produces ["","","",...""])
                const hasAnyData = row.some((cell: any) => (cell || "").toString().trim() !== "");
                if (!hasAnyData) continue;

                // Skip note/instruction rows (start with *)
                const firstCell = (row[0] || "").toString().trim();
                if (firstCell.startsWith("*")) continue;

                const roleRaw = (row[colRole] || "").toString();
                const roleStr = roleRaw.toLowerCase().trim().replace(/[^a-z]/g, '');

                if (!["admin", "consultant", "client"].includes(roleStr)) {
                    throw new Error(`Row ${i + 1}: Invalid or missing Role '${roleRaw.trim()}'. Must be admin, consultant, or client.`);
                }

                const firstName = (row[colFirst] || "").toString().trim();
                const lastName  = (row[colLast] || "").toString().trim();
                const email     = (row[colEmail] || "").toString().trim();

                if (!firstName || !lastName || !email) {
                    throw new Error(`Row ${i + 1}: First Name, Last Name, and Email are mandatory fields.`);
                }

                parsed.push({
                    firstName,
                    middleName: colMiddle !== -1 && row[colMiddle] ? row[colMiddle].toString().trim() : undefined,
                    lastName,
                    phone: colPhone !== -1 && row[colPhone] ? row[colPhone].toString().trim() : "",
                    role: roleStr as any,
                    email,
                    password: colPassword !== -1 && row[colPassword] ? row[colPassword].toString().trim() : undefined,
                    status: "pending"
                });
            }

            if (parsed.length === 0) {
                throw new Error("No valid user rows found in the file. Make sure data starts on the second row.");
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

        const createdUserIds: string[] = [];
        try {
            setProcessing(true);

            // Create an admin client using the service role key to bypass RLS
            const { createClient } = await import("@supabase/supabase-js");
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !serviceRoleKey) {
                throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
            }

            const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // Start Transaction-like processing
            // Phase 1: Create all Auth Users
            for (let i = 0; i < parsedUsers.length; i++) {
                const user = parsedUsers[i];
                const tempPassword = user.password || `${Math.random().toString(36).slice(-6)}${Math.random().toString(36).slice(-6).toUpperCase()}!8z`;
                const combinedFirstName = user.middleName ? `${user.firstName} ${user.middleName}`.trim() : user.firstName;

                const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
                    email: user.email,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: { first_name: combinedFirstName, last_name: user.lastName, organization_id: organizationId }
                });

                if (authCreateError) {
                    throw new Error(`Failed to create user ${user.email}: ${authCreateError.message}`);
                }

                createdUserIds.push(authData.user.id);
            }

            // Phase 2: Setup profiles, roles and client records
            for (let i = 0; i < parsedUsers.length; i++) {
                const user = parsedUsers[i];
                const newUserId = createdUserIds[i];
                const combinedFirstName = user.middleName ? `${user.firstName} ${user.middleName}`.trim() : user.firstName;

                // Wait briefly for triggers to potentially finish their initial handle_new_user work
                await new Promise(resolve => setTimeout(resolve, 800));

                // 2. Update Profile
                const { error: profileUpdateErr } = await supabaseAdmin
                    .from("profiles")
                    .update({
                        organization_id: organizationId,
                        is_approved: true,
                        first_name: combinedFirstName,
                        last_name: user.lastName
                    })
                    .eq("id", newUserId);

                if (profileUpdateErr) throw new Error(`Profile setup failed for ${user.email}: ${profileUpdateErr.message}`);

                // 3. Assign Role
                const { error: roleInsertErr } = await supabaseAdmin
                    .from("user_roles")
                    .insert({ user_id: newUserId, role: user.role.toLowerCase() });

                if (roleInsertErr) throw new Error(`Role assignment failed for ${user.email}: ${roleInsertErr.message}`);

                // 4. Generate UHID and create client record if Client
                if (user.role.toLowerCase() === "client") {
                    const { data: uhid, error: uhidError } = await supabaseAdmin.rpc("generate_uhid", { p_organization_id: organizationId });

                    if (uhidError) throw new Error(`UHID generation failed for ${user.email}: ${uhidError.message}`);

                    const { error: clientInsertErr } = await supabaseAdmin
                        .from("clients")
                        .insert({
                            uhid: uhid,
                            organization_id: organizationId,
                            first_name: combinedFirstName,
                            last_name: user.lastName,
                            email: user.email,
                            mobile_no: user.phone || "",
                            status: "active"
                        });

                    if (clientInsertErr) throw new Error(`Client record failed for ${user.email}: ${clientInsertErr.message}`);

                    // Link UHID to profile
                    await supabaseAdmin.from("profiles").update({ uhid: uhid }).eq("id", newUserId);
                }
            }

            setResultsSummary({ successful: parsedUsers.length, failed: 0 });
            setParsedUsers(parsedUsers.map(u => ({ ...u, status: "success" })));
            toast({ title: "Import Successful", description: `All ${parsedUsers.length} users were created.` });

        } catch (error: any) {
            console.error("[BulkImport] Error during processing, rolling back:", error);
            
            // Rollback: Delete all users created during this session
            if (createdUserIds.length > 0) {
                const { createClient } = await import("@supabase/supabase-js");
                const supabaseAdmin = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
                    { auth: { autoRefreshToken: false, persistSession: false } }
                );

                for (const id of createdUserIds) {
                    try {
                        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(id);
                        if (delError && delError.message !== "User not found") {
                            console.warn(`Rollback: Failed to delete user ${id}:`, delError.message);
                        }
                    } catch (e) {
                        console.error(`Rollback: Exception deleting user ${id}:`, e);
                    }
                }

            }

            toast({ title: "Import Failed & Reverted", description: `${error.message}. All partially created users have been rolled back.`, variant: "destructive" });
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
