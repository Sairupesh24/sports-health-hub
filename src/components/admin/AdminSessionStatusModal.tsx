import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    onSuccess: () => void;
}

export function AdminSessionStatusModal({ open, onOpenChange, session, onSuccess }: Props) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>("Planned");

    // For completed sessions we need actual times per governance trigger
    const [actualStart, setActualStart] = useState("");
    const [actualEnd, setActualEnd] = useState("");

    useEffect(() => {
        if (session) {
            setStatus(session.status || "Planned");
            // Default actual to scheduled if marking complete, or to previous actuals if exist
            if (session.actual_start) {
                setActualStart(format(new Date(session.actual_start), "HH:mm"));
            } else if (session.scheduled_start) {
                setActualStart(format(new Date(session.scheduled_start), "HH:mm"));
            }

            if (session.actual_end) {
                setActualEnd(format(new Date(session.actual_end), "HH:mm"));
            } else if (session.scheduled_end) {
                setActualEnd(format(new Date(session.scheduled_end), "HH:mm"));
            }
        }
    }, [session]);

    const handleSave = async () => {
        if (!session?.id) return;
        setLoading(true);

        try {
            const updateData: any = { status };

            if (status === "Completed") {
                if (!actualStart || !actualEnd) {
                    throw new Error("Actual start and end times are required for completed sessions.");
                }

                // Construct full ISO strings using the scheduled date + actual times
                const dateStr = format(new Date(session.scheduled_start), "yyyy-MM-dd");
                updateData.actual_start = new Date(`${dateStr}T${actualStart}:00`).toISOString();
                updateData.actual_end = new Date(`${dateStr}T${actualEnd}:00`).toISOString();
            }

            const { error } = await supabase
                .from("sessions")
                .update(updateData)
                .eq("id", session.id);

            if (error) throw error;

            toast({ title: "Success", description: "Session status updated successfully." });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!session) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Session Status</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 animate-in fade-in-50">
                    <div className="bg-muted/50 p-3 rounded-md text-sm">
                        <p><strong>Client:</strong> {session.client?.first_name} {session.client?.last_name}</p>
                        <p><strong>Consultant:</strong> Dr. {session.therapist?.last_name}</p>
                        <p><strong>Scheduled:</strong> {format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}</p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Planned">Planned</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Missed">Missed</SelectItem>
                                <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {status === "Completed" && (
                        <div className="grid gap-2 animate-in slide-in-from-top-2 pt-2 border-t mt-2">
                            <Label>Actual Times (Required for Completion)</Label>
                            <div className="flex items-center gap-2">
                                <div className="grid gap-1 flex-1">
                                    <Label className="text-xs text-muted-foreground">Start</Label>
                                    <Input type="time" value={actualStart} onChange={e => setActualStart(e.target.value)} />
                                </div>
                                <span className="pt-5">-</span>
                                <div className="grid gap-1 flex-1">
                                    <Label className="text-xs text-muted-foreground">End</Label>
                                    <Input type="time" value={actualEnd} onChange={e => setActualEnd(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={loading} className="w-full mt-2">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Status
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
