import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TEMPLATE_HEADERS = [
  "honorific",
  "first_name",
  "middle_name",
  "last_name",
  "gender",
  "mobile_no",
  "aadhaar_no",
  "blood_group",
  "dob",
  "email",
  "alternate_mobile_no",
  "occupation",
  "sport",
  "org_name",
  "address",
  "locality",
  "pincode",
  "city",
  "district",
  "state",
  "country",
  "has_insurance",
  "insurance_provider",
  "insurance_policy_no",
  "insurance_validity",
  "insurance_coverage_amount",
];

const REQUIRED_FIELDS = ["first_name", "last_name", "mobile_no"];

export function ClientBulkUpload() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    current: number;
    errors: string[];
  } | null>(null);

  const parseSafeDate = (val: any) => {
    if (!val) return null;
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  };

  const exportTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      Object.fromEntries(TEMPLATE_HEADERS.map((h) => [h, ""]))
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "client_registration_template.xlsx");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.organization_id) return;

    setIsUploading(true);
    setUploadProgress({ total: 0, current: 0, errors: [] });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        if (rows.length === 0) {
          toast({
            title: "Empty File",
            description: "The uploaded file contains no data.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        setUploadProgress({ total: rows.length, current: 0, errors: [] });

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const errorList: string[] = [];

          // Basic validation
          REQUIRED_FIELDS.forEach((field) => {
            if (!row[field]) {
              errorList.push(`Row ${i + 2}: Missing required field "${field}"`);
            }
          });

          if (errorList.length > 0) {
            setUploadProgress(prev => ({
              ...prev!,
              errors: [...prev!.errors, ...errorList]
            }));
            continue;
          }

          try {
            // Generate UHID
            const { data: uhid, error: uhidError } = await supabase.rpc("generate_uhid", {
              p_organization_id: profile.organization_id,
            });

            if (uhidError) throw uhidError;

            // Prepare payload
            const dob = parseSafeDate(row.dob);
            const insuranceValidity = parseSafeDate(row.insurance_validity);

            const payload = {
              organization_id: profile.organization_id,
              uhid: uhid as string,
              honorific: row.honorific || null,
              first_name: row.first_name,
              middle_name: row.middle_name || null,
              last_name: row.last_name,
              gender: row.gender || null,
              mobile_no: String(row.mobile_no || ""),
              aadhaar_no: row.aadhaar_no ? String(row.aadhaar_no) : null,
              blood_group: row.blood_group || null,
              dob: dob,
              age: dob ? calculateAge(new Date(dob)) : null,
              email: row.email || null,
              alternate_mobile_no: row.alternate_mobile_no ? String(row.alternate_mobile_no) : null,
              occupation: row.occupation || null,
              sport: row.sport || null,
              org_name: row.org_name || null,
              address: row.address || null,
              locality: row.locality || null,
              pincode: row.pincode ? String(row.pincode) : null,
              city: row.city || null,
              district: row.district || null,
              state: row.state || null,
              country: row.country || "India",
              has_insurance: row.has_insurance === "TRUE" || row.has_insurance === true || false,
              insurance_provider: row.insurance_provider || null,
              insurance_policy_no: row.insurance_policy_no || null,
              insurance_validity: insuranceValidity,
              insurance_coverage_amount: row.insurance_coverage_amount ? Number(row.insurance_coverage_amount) : null,
            };

            const { error: insertError } = await supabase.from("clients").insert(payload);
            if (insertError) throw insertError;

            setUploadProgress(prev => ({
              ...prev!,
              current: prev!.current + 1
            }));
          } catch (err: any) {
            setUploadProgress(prev => ({
              ...prev!,
              errors: [...prev!.errors, `Row ${i + 2}: ${err.message}`]
            }));
          }
        }

        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${rows.length - (uploadProgress?.errors.length || 0)} clients.`,
        });
      } catch (err: any) {
        toast({
          title: "Upload Failed",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input
    event.target.value = "";
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={exportTemplate} className="gap-2">
          <Download className="w-4 h-4" />
          Export Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" />
          Bulk Upload
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Client Upload</DialogTitle>
            <DialogDescription>
              Upload an Excel file with client details. Use the template to ensure correct data mapping.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!isUploading && !uploadProgress && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bulk-upload-input"
                  accept=".xlsx, .xls"
                />
                <label htmlFor="bulk-upload-input" className="cursor-pointer space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select file</p>
                  <p className="text-xs text-muted-foreground">Excel files (.xlsx, .xls) only</p>
                </label>
              </div>
            )}

            {isUploading && (
              <div className="space-y-4 text-center py-4">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploading clients...</p>
                  <p className="text-xs text-muted-foreground">
                    Processed {uploadProgress?.current} of {uploadProgress?.total}
                  </p>
                </div>
              </div>
            )}

            {!isUploading && uploadProgress && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Successful</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{uploadProgress.current}</span>
                </div>

                {uploadProgress.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Errors ({uploadProgress.errors.length})</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                      {uploadProgress.errors.map((error, idx) => (
                        <p key={idx} className="text-destructive">• {error}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsOpen(false);
                setUploadProgress(null);
              }}
              disabled={isUploading}
            >
              {uploadProgress ? "Close" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
