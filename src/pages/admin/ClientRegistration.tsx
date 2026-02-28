import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, UserPlus, Upload, Shield, X } from "lucide-react";
import { format } from "date-fns";

const clientSchema = z.object({
  honorific: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  gender: z.string().optional(),
  mobile_no: z.string().min(10, "Valid mobile number required").max(15),
  aadhaar_no: z.string().optional(),
  blood_group: z.string().optional(),
  dob: z.string().optional(),
  age: z.coerce.number().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  alternate_mobile_no: z.string().optional(),
  occupation: z.string().optional(),
  sport: z.string().optional(),
  org_name: z.string().optional(),
  address: z.string().optional(),
  locality: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  has_insurance: z.boolean().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_no: z.string().optional(),
  insurance_validity: z.string().optional(),
  insurance_coverage_amount: z.coerce.number().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

const HONORIFICS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Master", "Miss"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const SPORTS = [
  "Cricket", "Football", "Hockey", "Badminton", "Tennis", "Basketball",
  "Volleyball", "Athletics", "Swimming", "Boxing", "Wrestling", "Kabaddi",
  "Table Tennis", "Shooting", "Archery", "Weightlifting", "Gymnastics",
  "Cycling", "Rugby", "Martial Arts", "Other",
];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh",
];

export default function ClientRegistration() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [showInsurance, setShowInsurance] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      country: "India",
      has_insurance: false,
    },
  });

  const dob = watch("dob");

  // Auto-calculate age from DOB
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    setValue("age", age);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ClientFormData) => {
    setSubmitting(true);
    try {
      const orgId = profile?.organization_id;
      if (!orgId) throw new Error("No organization found. Contact your admin.");

      // Generate UHID via database function
      const { data: uhidResult, error: uhidError } = await supabase.rpc("generate_uhid", {
        p_organization_id: orgId,
      });

      if (uhidError) throw uhidError;

      const clientPayload = {
        organization_id: orgId,
        uhid: uhidResult as string,
        honorific: data.honorific || null,
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        gender: data.gender || null,
        mobile_no: data.mobile_no,
        aadhaar_no: data.aadhaar_no || null,
        blood_group: data.blood_group || null,
        dob: data.dob || null,
        age: data.age || null,
        email: data.email || null,
        alternate_mobile_no: data.alternate_mobile_no || null,
        occupation: data.occupation || null,
        sport: data.sport || null,
        org_name: data.org_name || null,
        address: data.address || null,
        locality: data.locality || null,
        pincode: data.pincode || null,
        city: data.city || null,
        district: data.district || null,
        state: data.state || null,
        country: data.country || "India",
        has_insurance: data.has_insurance || false,
        insurance_provider: data.insurance_provider || null,
        insurance_policy_no: data.insurance_policy_no || null,
        insurance_validity: data.insurance_validity || null,
        insurance_coverage_amount: data.insurance_coverage_amount || null,
      };

      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert(clientPayload)
        .select()
        .single();

      if (clientError) throw clientError;

      // Upload documents
      for (const file of documents) {
        const filePath = `${orgId}/${newClient.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("client-documents")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        await supabase.from("client_documents").insert({
          client_id: newClient.id,
          organization_id: orgId,
          document_name: file.name,
          document_type: file.type,
          file_path: filePath,
        });
      }

      toast({
        title: "Client Registered",
        description: `UHID: ${uhidResult} — ${data.first_name} ${data.last_name}`,
      });

      navigate("/admin/clients");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Registration Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "bg-muted/30 border-border focus:border-primary";

  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Register New Client</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Registered on: {format(new Date(), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Info */}
          <Card className="gradient-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic details of the client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Row 1: Honorific, First, Middle, Last */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Honorific</Label>
                  <Select onValueChange={(v) => setValue("honorific", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {HONORIFICS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input className={inputClass} {...register("first_name")} placeholder="First name" />
                  {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Middle Name</Label>
                  <Input className={inputClass} {...register("middle_name")} placeholder="Middle name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input className={inputClass} {...register("last_name")} placeholder="Last name" />
                  {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
                </div>
              </div>

              {/* Row 2: Gender, Mobile, Aadhaar, Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select onValueChange={(v) => setValue("gender", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile No <span className="text-destructive">*</span></Label>
                  <Input className={inputClass} {...register("mobile_no")} placeholder="+91 9876543210" />
                  {errors.mobile_no && <p className="text-xs text-destructive">{errors.mobile_no.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Aadhaar No</Label>
                  <Input className={inputClass} {...register("aadhaar_no")} placeholder="1234 5678 9012" maxLength={14} />
                </div>
                <div className="space-y-1.5">
                  <Label>Blood Group</Label>
                  <Select onValueChange={(v) => setValue("blood_group", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: DOB, Age, Email, Alternate Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    className={inputClass}
                    {...register("dob")}
                    onChange={(e) => {
                      register("dob").onChange(e);
                      calculateAge(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <Input type="number" className={inputClass} {...register("age")} placeholder="Auto" readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" className={inputClass} {...register("email")} placeholder="email@example.com" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Alternate Mobile</Label>
                  <Input className={inputClass} {...register("alternate_mobile_no")} placeholder="Optional" />
                </div>
              </div>

              {/* Row 4: Occupation, Org */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Occupation</Label>
                  <Input className={inputClass} {...register("occupation")} placeholder="e.g. Athlete, Student" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sport</Label>
                  <Select onValueChange={(v) => setValue("sport", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select sport" /></SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Organization Name</Label>
                  <Input className={inputClass} {...register("org_name")} placeholder="Team / Company" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="gradient-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Street Address</Label>
                <Textarea className={inputClass} {...register("address")} placeholder="Full address" rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Locality</Label>
                  <Input className={inputClass} {...register("locality")} placeholder="Area / Locality" />
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input className={inputClass} {...register("pincode")} placeholder="560001" maxLength={6} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input className={inputClass} {...register("city")} placeholder="City" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>District</Label>
                  <Input className={inputClass} {...register("district")} placeholder="District" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select onValueChange={(v) => setValue("state", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input className={inputClass} {...register("country")} defaultValue="India" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card className="gradient-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Insurance Details
                  </CardTitle>
                  <CardDescription>Optional — toggle to add insurance info</CardDescription>
                </div>
                <Switch
                  checked={showInsurance}
                  onCheckedChange={(v) => {
                    setShowInsurance(v);
                    setValue("has_insurance", v);
                  }}
                />
              </div>
            </CardHeader>
            {showInsurance && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Insurance Provider</Label>
                    <Input className={inputClass} {...register("insurance_provider")} placeholder="Provider name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Policy Number</Label>
                    <Input className={inputClass} {...register("insurance_policy_no")} placeholder="Policy #" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Validity Date</Label>
                    <Input type="date" className={inputClass} {...register("insurance_validity")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Coverage Amount (₹)</Label>
                    <Input type="number" className={inputClass} {...register("insurance_coverage_amount")} placeholder="500000" />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Documents */}
          <Card className="gradient-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Documents
              </CardTitle>
              <CardDescription>Upload ID proof, medical reports, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="doc-upload"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <label htmlFor="doc-upload" className="cursor-pointer space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC (max 10MB)</p>
                </label>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <span className="text-sm text-foreground truncate">{file.name}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeDocument(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/clients")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[140px]">
              {submitting ? "Registering..." : "Register Client"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
