import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ResolveInjuryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    injury: any | null;
    onSuccess?: () => void;
}

export default function ResolveInjuryModal({
    open,
    onOpenChange,
    injury,
    onSuccess
}: ResolveInjuryModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [resolvedDate, setResolvedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    const handleResolve = async () => {
        if (!injury || !injury.id) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('injuries')
                .update({
                    status: 'Resolved',
                    resolved_date: resolvedDate
                })
                .eq('id', injury.id);

            if (error) throw error;

            toast({
                title: "Injury Resolved",
                description: "The injury has been marked as fully treated.",
            });

            if (onSuccess) onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error resolving injury:", error);
            toast({
                variant: "destructive",
                title: "Error resolving injury",
                description: error.message || "Failed to update injury status",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!injury) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mark Injury as Resolved</DialogTitle>
                    <DialogDescription>
                        Confirm that this injury ({injury.diagnosis}) has been completely treated and the patient is fully recovered.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="resolvedDate">Date of Resolution</Label>
                        <Input
                            id="resolvedDate"
                            type="date"
                            value={resolvedDate}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setResolvedDate(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleResolve} disabled={loading || !resolvedDate}>
                        {loading ? "Saving..." : "Mark as Resolved"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
