import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatClientName } from "@/lib/utils";

interface LogInjuryModalProps {
    clientId?: string;
    organizationId: string;
    onSuccess: () => void;
}

export default function LogInjuryModal({ clientId, organizationId, onSuccess }: LogInjuryModalProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [regions, setRegions] = useState<string[]>([]);
    const [types, setTypes] = useState<string[]>([]);
    const [diagnoses, setDiagnoses] = useState<string[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    const [selectedClient, setSelectedClient] = useState(clientId || "");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
    const [notes, setNotes] = useState("");
    const [severity, setSeverity] = useState("Moderate");

    useEffect(() => {
        if (open) {
            fetchRegions();
            if (!clientId) {
                fetchClients();
            }
        }
    }, [open, clientId]);

    useEffect(() => {
        if (selectedRegion) {
            fetchTypes(selectedRegion);
            setSelectedType("");
            setSelectedDiagnosis("");
        }
    }, [selectedRegion]);

    useEffect(() => {
        if (selectedType) {
            fetchDiagnoses(selectedRegion, selectedType);
            setSelectedDiagnosis("");
        }
    }, [selectedType]);

    const fetchRegions = async () => {
        try {
            const data = await apiFetch<string[]>('/clinical/master-data/regions');
            setRegions(data);
        } catch (error) {
            console.error("Failed to fetch regions", error);
        }
    };

    const fetchClients = async () => {
        try {
            const data = await apiFetch<any[]>('/clients');
            setClients(data);
        } catch (error) {
            console.error("Failed to fetch clients", error);
        }
    };

    const fetchTypes = async (region: string) => {
        try {
            const data = await apiFetch<string[]>(`/clinical/master-data/types?region=${encodeURIComponent(region)}`);
            setTypes(data);
        } catch (error) {
            console.error("Failed to fetch types", error);
        }
    };

    const fetchDiagnoses = async (region: string, type: string) => {
        try {
            const data = await apiFetch<string[]>(`/clinical/master-data/diagnoses?region=${encodeURIComponent(region)}&type=${encodeURIComponent(type)}`);
            setDiagnoses(data);
        } catch (error) {
            console.error("Failed to fetch diagnoses", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) {
            toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" });
            return;
        }
        if (!selectedRegion || !selectedType || !selectedDiagnosis) {
            toast({ title: "Validation Error", description: "Please complete the cascading selections.", variant: "destructive" });
            return;
        }

        try {
            setLoading(true);
            if (!user) return;

            await apiFetch('/clinical/injuries', {
                method: 'POST',
                body: {
                    organization_id: organizationId,
                    client_id: selectedClient,
                    injury_date: new Date().toISOString().split('T')[0],
                    region: selectedRegion,
                    injury_type: selectedType,
                    diagnosis: selectedDiagnosis,
                    severity: severity,
                    status: 'Acute',
                    clinical_notes: notes,
                }
            });

            toast({ title: "Injury Logged", description: "The injury has been successfully added to the client profile." });
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Log New Injury
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90dvh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle>Log New Injury</DialogTitle>
                    <DialogDescription>Specify the details of the injury to log it into the repository.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                  <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

                    {!clientId && (
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select value={selectedClient} onValueChange={setSelectedClient} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an athlete..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {formatClientName(c)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Body Region</Label>
                        <Select value={selectedRegion} onValueChange={setSelectedRegion} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Injury Type</Label>
                        <Select value={selectedType} onValueChange={setSelectedType} disabled={!selectedRegion} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Diagnosis</Label>
                        <Select value={selectedDiagnosis} onValueChange={setSelectedDiagnosis} disabled={!selectedType} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select diagnosis" />
                            </SelectTrigger>
                            <SelectContent>
                                {diagnoses.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Initial Severity</Label>
                        <Select value={severity} onValueChange={setSeverity}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Mild">Mild</SelectItem>
                                <SelectItem value="Moderate">Moderate</SelectItem>
                                <SelectItem value="Severe">Severe</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Clinical Notes (Optional)</Label>
                        <Textarea
                            placeholder="Mechanism of injury, patient subjective feedback..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                  </div>
                  <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={loading}>
                          {loading ? "Saving..." : "Log Injury"}
                      </Button>
                  </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
