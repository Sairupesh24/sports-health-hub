import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatClientName, cn } from "@/lib/utils";
import { 
  UserPlus, 
  Search, 
  CheckCircle2, 
  Loader2, 
  Link as LinkIcon, 
  Sparkles,
  User,
  Phone,
  Mail,
  Briefcase
} from "lucide-react";

export interface EnquiryLeadData {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  contact?: string;
  mobile_no?: string;
  email?: string | null;
  work_place?: string | null;
  notes?: string | null;
}

export interface ClientSearchResult {
  id: string;
  uhid: string;
  first_name: string;
  last_name?: string | null;
  mobile_no?: string;
  email?: string | null;
  gender?: string;
  sport?: string | null;
  athlete_type?: string | null;
}

interface ConvertLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: EnquiryLeadData | null;
  onSuccess: () => void;
}

export function ConvertLeadModal({
  open,
  onOpenChange,
  enquiry,
  onSuccess
}: ConvertLeadModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"create" | "link">("create");
  
  // Create New Client fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Other");
  const [athleteType, setAthleteType] = useState("General Population");
  const [sport, setSport] = useState("");
  const [occupation, setOccupation] = useState("");

  // Link Existing Client fields
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);

  // When enquiry opens, populate default values
  useEffect(() => {
    if (enquiry) {
      setFirstName(enquiry.first_name || (enquiry.name || '').split(' ')[0] || '');
      setLastName(enquiry.last_name || (enquiry.name || '').split(' ').slice(1).join(' ') || '');
      setMobileNo(enquiry.mobile_no || enquiry.contact || '');
      setEmail(enquiry.email || '');
      setOccupation(enquiry.work_place || '');
    }
  }, [enquiry]);

  // Client search for linking
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["client-search", searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 3) return [];
      const data = await apiFetch<ClientSearchResult[]>(`/clients?search=${encodeURIComponent(searchTerm)}`);
      return data;
    },
    enabled: searchTerm.length >= 3 && activeTab === "link",
  });

  // Mutation 1: Create New Patient Profile directly from lead
  const createPatientMutation = useMutation({
    mutationFn: async () => {
      if (!enquiry?.id) throw new Error("No enquiry selected");
      const result = await apiFetch<{ client: ClientSearchResult }>(`/clients/enquiries/${enquiry.id}/convert-to-patient`, {
        method: 'POST',
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          mobile_no: mobileNo.trim(),
          email: email.trim() || null,
          gender,
          athlete_type: athleteType,
          sport: sport.trim() || null,
          occupation: occupation.trim() || null,
        }
      });
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Patient Created & Lead Converted!",
        description: `New patient UHID: ${data.client?.uhid || 'Generated'}. All enquiry notes transferred.`,
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Conversion Failed",
        description: err.message || "Failed to create patient from lead.",
        variant: "destructive"
      });
    }
  });

  // Mutation 2: Link to Existing Patient
  const linkPatientMutation = useMutation({
    mutationFn: async () => {
      if (!enquiry?.id || !selectedClient?.id) throw new Error("Please select a client to link");
      
      const enqData = await apiFetch<{ notes?: string }>(`/clients/enquiries/${enquiry.id}`, {
        method: 'PATCH',
        data: { status: 'converted', linked_client_id: selectedClient.id }
      });

      await apiFetch(`/clients/enquiries/${enquiry.id}/interactions`, {
        method: 'POST',
        data: {
          interaction_type: 'converted',
          response_text: `Lead converted & linked to existing patient: ${formatClientName(selectedClient)} (UHID: ${selectedClient.uhid})`
        }
      });

      if (enqData.notes) {
        await apiFetch(`/clients/${selectedClient.id}`, {
          method: 'PATCH',
          data: { admin_remarks: `[Enquiry Conversion Note]: ${enqData.notes}` }
        });
      }

      await apiFetch(`/appointments/sessions/bulk-update`, {
        method: 'PATCH',
        data: { 
          filters: { enquiry_id: enquiry.id },
          updates: { client_id: selectedClient.id, is_guest: false }
        }
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Client Linked & Converted",
        description: "Enquiry successfully linked to registered patient profile.",
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Linking Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  const isPending = createPatientMutation.isPending || linkPatientMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold text-slate-900">
                Convert Lead to Client
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Turn {enquiry?.name || enquiry?.first_name || 'this prospective lead'} into an active clinical patient.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "create" | "link")} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="create" className="text-xs font-semibold gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Create New Patient
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs font-semibold gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> Link Existing Patient
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CREATE NEW PATIENT */}
          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>A clinical UHID will be auto-generated. All original enquiry notes will be preserved.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="First name"
                  className="h-10 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="Last name"
                  className="h-10 text-xs" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Mobile *</Label>
                <Input 
                  value={mobileNo} 
                  onChange={(e) => setMobileNo(e.target.value)} 
                  placeholder="10-digit mobile"
                  className="h-10 text-xs font-mono" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@example.com"
                  className="h-10 text-xs" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={athleteType} onValueChange={setAthleteType}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Population">General Population</SelectItem>
                    <SelectItem value="Athlete">Athlete / Sports</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Occupation / Workplace</Label>
                <Input 
                  value={occupation} 
                  onChange={(e) => setOccupation(e.target.value)} 
                  placeholder="Company or job"
                  className="h-10 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sport (if applicable)</Label>
                <Input 
                  value={sport} 
                  onChange={(e) => setSport(e.target.value)} 
                  placeholder="e.g. Cricket, Running, Badminton"
                  className="h-10 text-xs" 
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: LINK EXISTING PATIENT */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Search Existing Patient (Name or UHID)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Type UHID or Name..." 
                  className="pl-10 h-10 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {searching ? (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Searching patients...
                </div>
              ) : searchResults.map((client) => (
                <div 
                  key={client.id} 
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center",
                    selectedClient?.id === client.id 
                      ? "bg-primary/5 border-primary shadow-sm" 
                      : "hover:bg-slate-50 border-slate-100"
                  )}
                >
                  <div>
                    <p className="font-bold text-xs text-slate-900">{formatClientName(client)}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{client.uhid} • {client.mobile_no || 'No contact'}</p>
                  </div>
                  {selectedClient?.id === client.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
              ))}

              {searchTerm.length >= 3 && searchResults.length === 0 && !searching && (
                <p className="text-center py-6 text-xs text-slate-400">No patients found matching "{searchTerm}"</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {activeTab === "create" ? (
            <Button
              onClick={() => createPatientMutation.mutate()}
              disabled={!firstName.trim() || !mobileNo.trim() || isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Patient Profile & Convert
            </Button>
          ) : (
            <Button
              onClick={() => linkPatientMutation.mutate()}
              disabled={!selectedClient || isPending}
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-6"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Link & Convert
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

