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
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SubscriptionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
}

export function SubscriptionModal({ open, onOpenChange, orgId, onSuccess }: SubscriptionModalProps) {
    const queryClient = useQueryClient();
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedPackage, setSelectedPackage] = useState("");
    const [packageOpen, setPackageOpen] = useState(false);
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
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error(`Error: ${error.message}`);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined} className="w-[95vw] sm:max-w-[425px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0 shrink-0">
                    <DialogTitle>Assign Membership</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 py-4 grid gap-4">
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
                        <Popover open={packageOpen} onOpenChange={setPackageOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={packageOpen}
                                    className="w-full justify-between font-normal text-left min-w-0"
                                >
                                    <span className="truncate flex-1">
                                        {selectedPackage ? (() => {
                                            const pkg = packages?.find((p: any) => p.id === selectedPackage);
                                            return pkg ? `${pkg.name} - ₹${pkg.price}` : "Select plan...";
                                        })() : "Select plan..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent disablePortal={true} className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search plan..." />
                                    <CommandList>
                                        <CommandEmpty>No plan found.</CommandEmpty>
                                        <CommandGroup>
                                            {packages?.map((p: any) => (
                                                <CommandItem
                                                    key={p.id}
                                                    value={p.name}
                                                    onSelect={() => {
                                                        setSelectedPackage(p.id);
                                                        setPackageOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedPackage === p.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {p.name} - ₹{p.price}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
                <DialogFooter className="p-6 pt-0 shrink-0">
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
