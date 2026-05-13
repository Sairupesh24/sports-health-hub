import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from "@/components/ui/dialog";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectValue, 
    SelectTrigger 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/utils/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SubscriptionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
}

export function SubscriptionModal({ open, onOpenChange, orgId }: SubscriptionModalProps) {
    const queryClient = useQueryClient();
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedPackage, setSelectedPackage] = useState("");
    const [billingCycle, setBillingCycle] = useState("Monthly");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Fetch recurring packages
    const { data: packages } = useQuery({
        queryKey: ["recurring-packages", orgId],
        queryFn: async () => {
            return await apiFetch('/api/billing/packages');
        }
    });

    // Fetch clients
    const { data: clients } = useQuery({
        queryKey: ["all-clients", orgId],
        queryFn: async () => {
            return await apiFetch('/api/clients');
        }
    });

    const createSubscription = useMutation({
        mutationFn: async () => {
            const pkg = packages?.find((p: any) => p.id === selectedPackage);
            return await apiFetch('/api/billing/subscriptions', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: selectedClient,
                    package_id: selectedPackage,
                    billing_cycle: billingCycle,
                    start_date: startDate,
                    package_name: pkg?.name,
                    package_price: pkg?.price
                })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ss-subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
            toast.success("Subscription started successfully");
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error(`Error: ${error.message}`);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Membership</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="athlete">Select Athlete</Label>
                        <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select athlete..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clients?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.first_name} {c.last_name} ({c.uhid})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="package">Membership Plan</Label>
                        <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select plan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {packages?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} - ₹{p.price}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cycle">Billing Cycle</Label>
                        <Select value={billingCycle} onValueChange={setBillingCycle}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                <SelectItem value="Annual">Annual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="start">Start Date</Label>
                        <Input 
                            type="date" 
                            id="start" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        className="w-full" 
                        onClick={() => createSubscription.mutate()}
                        disabled={!selectedClient || !selectedPackage || createSubscription.isPending}
                    >
                        {createSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Subscription
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
