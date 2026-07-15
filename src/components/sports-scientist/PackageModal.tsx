import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { apiFetch } from "@/utils/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PackageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
}

export function PackageModal({ open, onOpenChange, orgId }: PackageModalProps) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Rehab Session");
    const [taxPercentage, setTaxPercentage] = useState("12");

    const defaultTaxes: Record<string, string> = {
        "Assessment": "18",
        "Rehab Session": "12",
        "Equipment": "5",
        "Others": "0"
    };

    const handleCategoryChange = (val: string) => {
        setCategory(val);
        setTaxPercentage(defaultTaxes[val] || "0");
    };

    const createPackage = useMutation({
        mutationFn: async () => {
            return await apiFetch('/api/billing/packages', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    price: Number(price),
                    is_recurring: true,
                    category,
                    tax_percentage: Number(taxPercentage)
                })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ss-packages"] });
            toast.success("Membership tier created");
            onOpenChange(false);
            setName("");
            setPrice("");
            setCategory("Rehab Session");
            setTaxPercentage("12");
        },
        onError: (error: any) => {
            toast.error(`Error: ${error.message}`);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined} className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Create Membership Tier</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Tier Name</Label>
                        <Input 
                            id="name" 
                            placeholder="e.g. Elite Athlete Monthly" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="price">Price (₹)</Label>
                        <Input 
                            id="price" 
                            type="number" 
                            placeholder="0.00" 
                            value={price} 
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={category} onValueChange={handleCategoryChange}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Assessment">Assessment (18% Tax)</SelectItem>
                                <SelectItem value="Rehab Session">Rehab Session (12% Tax)</SelectItem>
                                <SelectItem value="Equipment">Equipment (5% Tax)</SelectItem>
                                <SelectItem value="Others">Others (0% Tax)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tax-percentage">Tax Percentage (%)</Label>
                        <Input 
                            id="tax-percentage" 
                            type="number" 
                            placeholder="0" 
                            value={taxPercentage} 
                            onChange={(e) => setTaxPercentage(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        className="w-full" 
                        onClick={() => createPackage.mutate()}
                        disabled={!name || !price || createPackage.isPending}
                    >
                        {createPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Plan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
