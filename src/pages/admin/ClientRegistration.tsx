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
import { ArrowLeft, UserPlus, Upload, Shield, X, Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const clientSchema = z.object({
  honorific: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  gender: z.string().optional(),
  mobile_no: z.string().min(10, "Valid mobile number required").max(15),
  aadhaar_no: z.string().optional(),
  blood_group: z.string().optional(),
  dob: z.string().min(1, "Date of Birth is required"),
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
  is_vip: z.boolean().optional(),
  referral_source: z.string().optional(),
  referral_source_detail: z.string().optional(),
  admin_remarks: z.string().optional(),
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
const REFERRAL_SOURCES = [
  "Social Media", "Word of Mouth", "Doctor Referral", "Badminton Academy (PGBA)", "Walk-in", "Other"
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
  const { profile, roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [showInsurance, setShowInsurance] = useState(false);
  const queryClient = useQueryClient();
  const [openOrg, setOpenOrg] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");

  const { data: organizations = [] } = useQuery({
    queryKey: ["client_organizations"],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from("client_organizations")
        .select("name")
        .eq("organization_id", profile.organization_id)
        .order("name");
      if (error) throw error;
      return data.map(d => d.name);
    },
    enabled: !!profile?.organization_id,
  });

  const generateOrgMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { data, error } = await supabase
        .from("client_organizations")
        .insert({ organization_id: profile!.organization_id, name: newName })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client_organizations"] });
      setValue("org_name", data.name);
      setOpenOrg(false);
      toast({ title: "Organization Added", description: `${data.name} is now available.` });
    }
  });

  const handleCreateOrg = () => {
    if (orgSearch && !organizations.includes(orgSearch)) {
      generateOrgMutation.mutate(orgSearch);
    }
  };

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
      is_vip: false,
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
        is_vip: data.is_vip || false,
        referral_source: data.referral_source || null,
        referral_source_detail: data.referral_source_detail || null,
      };

      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert(clientPayload)
        .select()
        .single();

      if (clientError) throw clientError;

      // Handle Admin Remarks if provided and user is admin
      if (data.admin_remarks && isAdmin) {
          await (supabase as any).from("client_admin_notes").insert({
              client_id: newClient.id,
              remarks: data.admin_remarks
          });
      }

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
              
              {/* Referral Source Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label>How did you hear about us? (Referral Source)</Label>
                  <Select onValueChange={(v) => setValue("referral_source", v)}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select Source" /></SelectTrigger>
                    <SelectContent>
                      {REFERRAL_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(watch("referral_source") === "Doctor Referral" || watch("referral_source") === "Other") && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <Label>Specify Source <span className="text-destructive">*</span></Label>
                    <Input 
                        className={inputClass} 
                        {...register("referral_source_detail")} 
                        placeholder={watch("referral_source") === "Doctor Referral" ? "Enter Doctor's Name" : "Please specify"} 
                    />
                  </div>
                )}
              </div>

              {/* VIP Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 mb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                          <Label className="text-sm font-bold text-yellow-800">VIP Client Tier</Label>
                          <p className="text-xs text-yellow-600/80 font-medium">Mark this client for premium services and priority care</p>
                      </div>
                  </div>
                  <Switch
                      checked={watch("is_vip")}
                      onCheckedChange={(v) => setValue("is_vip", v)}
                  />
              </div>

              {/* Row 3: DOB, Age, Email, Alternate Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5 flex flex-col justify-end">
                  <Label>Date of Birth <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    className={inputClass}
                    {...register("dob")}
                    onChange={(e) => {
                      register("dob").onChange(e);
                      calculateAge(e.target.value);
                    }}
                  />
                  {errors.dob && <p className="text-xs text-destructive">{errors.dob.message}</p>}
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
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
                <div className="space-y-1.5 flex flex-col">
                  <Label>Organization Name</Label>
                  <Popover open={openOrg} onOpenChange={setOpenOrg}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openOrg}
                        className={cn("w-full justify-between h-9 bg-muted/30 border-border hover:bg-muted font-normal", !watch("org_name") && "text-muted-foreground")}
                      >
                        {watch("org_name") || "Search or add organization..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search organization..."
                          value={orgSearch}
                          onValueChange={setOrgSearch}
                        />
                        <CommandList>
                          <CommandEmpty className="py-6 text-center text-sm">
                            <p className="text-muted-foreground mb-2">No organization found.</p>
                            {orgSearch && (
                              <Button variant="secondary" size="sm" onClick={handleCreateOrg}>
                                <Plus className="w-3 h-3 mr-1" />
                                Add "{orgSearch}"
                              </Button>
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {organizations.map((org) => (
                              <CommandItem
                                key={org}
                                value={org}
                                onSelect={(currentValue) => {
                                  setValue("org_name", currentValue);
                                  setOpenOrg(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watch("org_name") === org ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {org}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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

          {/* Admin Remarks - ONLY FOR ADMINS */}
          {isAdmin && (
              <Card className="gradient-card border-border border-l-4 border-l-primary">
                  <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary" />
                          Administrative Remarks (Internal)
                      </CardTitle>
                      <CardDescription>Strictly visible only to Administrators. Not visible to consultants or staff.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Textarea 
                          className={cn(inputClass, "min-h-[120px] font-medium")}
                          {...register("admin_remarks")}
                          placeholder="Strategic notes, preferred consultant, billing preferences, etc."
                      />
                  </CardContent>
              </Card>
          )}

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
