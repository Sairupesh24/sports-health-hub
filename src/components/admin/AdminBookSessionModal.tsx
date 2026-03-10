import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Users, User, Plus, RefreshCw, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { format, parse, addDays, startOfWeek, addWeeks, addMonths, isBefore } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AdminBookSessionModal({ open, onOpenChange, onSuccess }: Props) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [consultants, setConsultants] = useState<any[]>([]);

    const [clientId, setClientId] = useState("");
    const [consultantId, setConsultantId] = useState("");
    const [serviceType, setServiceType] = useState("Physiotherapy");
    const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");

    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFreq, setRecurringFreq] = useState("Weekly"); // Daily, Weekly, Monthly
    const [recurringInterval, setRecurringInterval] = useState(1);
    const [recurringDays, setRecurringDays] = useState<number[]>([]);
    const [recurringCount, setRecurringCount] = useState(10);

    // Sync recurringDays with the currently selected sessionDate on initial pick
    useEffect(() => {
        if (sessionDate && recurringDays.length === 0) {
            const dateObj = parse(sessionDate, "yyyy-MM-dd", new Date());
            const dayStr = format(dateObj, "i"); // 1=Mon..7=Sun
            setRecurringDays([parseInt(dayStr)]);
        }
    }, [sessionDate, recurringDays]);

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            fetchConsultants();
        }
    }, [open, profile?.organization_id]);

    const fetchClients = async () => {
        const { data } = await supabase
            .from("clients")
            .select("id, first_name, last_name")
            .eq("organization_id", profile?.organization_id);
        if (data) setClients(data);
    };

    const fetchConsultants = async () => {
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "consultant");

        if (roleData && roleData.length > 0) {
            const consultantIds = roleData.map(r => r.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, first_name, last_name")
                .eq("organization_id", profile?.organization_id)
                .in("id", consultantIds)
                .eq("is_approved", true);

            if (profilesData) {
                setConsultants(profilesData.map(p => ({
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`
                })));
            }
        }
    };

    const handleSave = async () => {
        if (!clientId || !consultantId || !sessionDate || !startTime || !endTime || !profile?.organization_id) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const baseDate = parse(sessionDate, "yyyy-MM-dd", new Date());
            const sessionsToInsert = [];

            // Generate recurring dates
            const dates: Date[] = [];
            if (!isRecurring) {
                dates.push(baseDate);
            } else {
                let current = baseDate;
                let occurrences = 0;
                let weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
                const baseDayInt = parseInt(format(baseDate, "i"));

                if (recurringFreq === "Daily") {
                    while (occurrences < recurringCount) {
                        dates.push(current);
                        current = addDays(current, recurringInterval);
                        occurrences++;
                    }
                } else if (recurringFreq === "Weekly") {
                    const sortedDays = [...recurringDays].sort();
                    if (sortedDays.length === 0) sortedDays.push(baseDayInt);

                    while (occurrences < recurringCount) {
                        for (const day of sortedDays) {
                            const candidateDate = addDays(weekStart, day - 1);
                            // Ensure we don't pick days from the start week that are BEFORE the start date
                            // Only consider dates >= baseDate. Using startOfDay to be safe.
                            if (!isBefore(candidateDate, baseDate) && occurrences < recurringCount) {
                                dates.push(candidateDate);
                                occurrences++;
                            }
                        }
                        weekStart = addWeeks(weekStart, recurringInterval);
                    }
                } else if (recurringFreq === "Monthly") {
                    while (occurrences < recurringCount) {
                        dates.push(current);
                        current = addMonths(current, recurringInterval);
                        occurrences++;
                    }
                }
            }

            for (const d of dates) {
                const dateStr = format(d, "yyyy-MM-dd");
                const startTimestamp = `${dateStr}T${startTime}:00`;
                const endTimestamp = `${dateStr}T${endTime}:00`;

                sessionsToInsert.push({
                    organization_id: profile.organization_id,
                    client_id: clientId,
                    therapist_id: consultantId,
                    service_type: serviceType,
                    session_mode: "Individual",
                    scheduled_start: new Date(startTimestamp).toISOString(),
                    scheduled_end: new Date(endTimestamp).toISOString(),
                    status: "Planned",
                });
            }

            const { error } = await supabase.from("sessions").insert(sessionsToInsert);

            if (error) throw error;

            toast({ title: "Success", description: `${dates.length} session(s) booked successfully.` });
            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setClientId("");
        setConsultantId("");
        setServiceType("Physiotherapy");
        setSessionDate(format(new Date(), "yyyy-MM-dd"));
        setStartTime("09:00");
        setEndTime("10:00");
        setIsRecurring(false);
        setRecurringFreq("Weekly");
        setRecurringInterval(1);
        setRecurringCount(10);
        setRecurringDays([]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Book New Session</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] pr-4">
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Client</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn("w-full justify-between font-normal", !clientId && "text-muted-foreground")}
                                    >
                                        {clientId ? (() => {
                                            const c = clients.find(x => x.id === clientId);
                                            return c ? `${c.first_name} ${c.last_name}` : "Search or select client...";
                                        })() : "Search or select client..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search client..." />
                                        <CommandList>
                                            <CommandEmpty>No client found.</CommandEmpty>
                                            <CommandGroup>
                                                {clients.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={`${c.first_name} ${c.last_name}`}
                                                        onSelect={() => setClientId(c.id)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                                                        {c.first_name} {c.last_name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid gap-2">
                            <Label>Consultant</Label>
                            <Select value={consultantId} onValueChange={setConsultantId}>
                                <SelectTrigger><SelectValue placeholder="Select Consultant" /></SelectTrigger>
                                <SelectContent>
                                    {consultants.map(c => <SelectItem key={c.id} value={c.id}>Dr. {c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Service Type</Label>
                            <Select value={serviceType} onValueChange={setServiceType}>
                                <SelectTrigger><SelectValue placeholder="Select Service" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                                    <SelectItem value="Strength & Conditioning">Strength & Conditioning</SelectItem>
                                    <SelectItem value="Active Recovery Training">Active Recovery Training</SelectItem>
                                    <SelectItem value="Consultation">Consultation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Date</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input type="date" className="pl-9" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Time</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                    <span>-</span>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                            <div className="flex items-center justify-between pointer-events-auto">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Recurring Session</Label>
                                    <p className="text-sm text-muted-foreground">Schedule multiple sessions automatically</p>
                                </div>
                                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                            </div>

                            {isRecurring && (
                                <div className="space-y-4 pt-2 border-t border-border/50 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Frequency</Label>
                                            <Select value={recurringFreq} onValueChange={setRecurringFreq}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Daily">Daily</SelectItem>
                                                    <SelectItem value="Weekly">Weekly</SelectItem>
                                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Every</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={12}
                                                    value={recurringInterval}
                                                    onChange={e => setRecurringInterval(parseInt(e.target.value) || 1)}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {recurringFreq === "Daily" ? "days" : recurringFreq === "Weekly" ? "weeks" : "months"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {recurringFreq === "Weekly" && (
                                        <div className="grid gap-2">
                                            <Label>On days</Label>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'M', value: 1 }, { label: 'T', value: 2 },
                                                    { label: 'W', value: 3 }, { label: 'T', value: 4 },
                                                    { label: 'F', value: 5 }, { label: 'S', value: 6 }, { label: 'S', value: 7 }
                                                ].map(day => (
                                                    <Button
                                                        key={day.value}
                                                        type="button"
                                                        variant={recurringDays.includes(day.value) ? "default" : "outline"}
                                                        className={`h-9 w-9 p-0 rounded-full font-semibold ${recurringDays.includes(day.value) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                                                        onClick={() => {
                                                            if (recurringDays.includes(day.value)) {
                                                                if (recurringDays.length > 1) {
                                                                    setRecurringDays(recurringDays.filter(d => d !== day.value));
                                                                }
                                                            } else {
                                                                setRecurringDays([...recurringDays, day.value]);
                                                            }
                                                        }}
                                                    >
                                                        {day.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label>End after</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min={2}
                                                max={100}
                                                value={recurringCount}
                                                onChange={e => setRecurringCount(parseInt(e.target.value) || 2)}
                                                className="w-24"
                                            />
                                            <span className="text-sm text-muted-foreground">occurrences</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button onClick={handleSave} disabled={loading} className="w-full mt-2">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isRecurring ? `Book ${recurringCount} Sessions` : "Book 1 Session"}
                        </Button>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
