import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Settings, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CONFIGURABLE_FIELDS = [
  { name: "honorific", label: "Honorific" },
  { name: "middle_name", label: "Middle Name" },
  { name: "gender", label: "Gender" },
  { name: "aadhaar_no", label: "Aadhaar No" },
  { name: "blood_group", label: "Blood Group" },
  { name: "dob", label: "Date of Birth" },
  { name: "email", label: "Email" },
  { name: "alternate_mobile_no", label: "Alternate Mobile" },
  { name: "occupation", label: "Occupation" },
  { name: "org_name", label: "Organization Name" },
  { name: "address", label: "Address" },
  { name: "locality", label: "Locality" },
  { name: "pincode", label: "Pincode" },
  { name: "city", label: "City" },
  { name: "district", label: "District" },
  { name: "state", label: "State" },
  { name: "country", label: "Country" },
  { name: "insurance_provider", label: "Insurance Provider" },
  { name: "insurance_policy_no", label: "Insurance Policy No" },
  { name: "insurance_validity", label: "Insurance Validity" },
  { name: "insurance_coverage_amount", label: "Insurance Coverage Amount" },
];

export default function FieldConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const orgId = "00000000-0000-0000-0000-000000000001";

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("client_field_config")
        .select("field_name, is_mandatory")
        .eq("organization_id", orgId);

      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((row) => (map[row.field_name] = row.is_mandatory));
        setConfig(map);
      }
    };
    fetchConfig();
  }, []);

  const toggleField = (fieldName: string) => {
    setConfig((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const upserts = CONFIGURABLE_FIELDS.map((f) => ({
        organization_id: orgId,
        field_name: f.name,
        is_mandatory: config[f.name] || false,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("client_field_config").upsert(upserts, {
        onConflict: "organization_id,field_name",
      });

      if (error) throw error;
      toast({ title: "Saved", description: "Field configuration updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Field Configuration</h1>
            <p className="text-muted-foreground text-sm">Toggle which fields are mandatory for client registration</p>
          </div>
        </div>

        <Card className="gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Mandatory Fields
            </CardTitle>
            <CardDescription>
              First Name, Last Name, and Mobile No are always required. Toggle others below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {CONFIGURABLE_FIELDS.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{field.label}</span>
                <Switch checked={config[field.name] || false} onCheckedChange={() => toggleField(field.name)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={saveConfig} disabled={saving} className="min-w-[120px]">
            {saving ? "Saving..." : "Save Config"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
