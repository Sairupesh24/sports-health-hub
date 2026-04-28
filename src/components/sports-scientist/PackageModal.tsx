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
import { supabase } from "@/integrations/supabase/client";
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

    const createPackage = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from("packages")
                .insert({
                    organization_id: orgId,
                    name,
                    price: Number(price),
                    is_recurring: true
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ss-packages"] });
            toast.success("Membership tier created");
            onOpenChange(false);
            setName("");
            setPrice("");
        },
        onError: (error: any) => {
            toast.error(`Error: ${error.message}`);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
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
