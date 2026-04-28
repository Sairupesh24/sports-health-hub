import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Users, User, Plus, Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { format, parse, addHours, differenceInCalendarDays, startOfDay, addWeeks, addDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function SportsScientistBookSessionModal({ open, onOpenChange, onSuccess }: Props) {
    const { profile, user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    // Data lists
    const [clients, setClients] = useState<any[]>([]);
    const [sessionTypes, setSessionTypes] = useState<any[]>([]);

    // Form state
    const [sessionMode, setSessionMode] = useState<"Individual" | "Group" | "Other">("Individual");
    const [groupName, setGroupName] = useState("");
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [sessionTypeId, setSessionTypeId] = useState("");
    const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<"Planned" | "Completed" | "Missed" | "Cancelled">("Planned");
    const [cancellationReason, setCancellationReason] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringEndDate, setRecurringEndDate] = useState(format(addWeeks(new Date(), 4), "yyyy-MM-dd"));
    const [recurringSlots, setRecurringSlots] = useState<Array<{ day: string, startTime: string, endTime: string }>>([
        { day: format(new Date(), "EEEE"), startTime: "09:00", endTime: "10:00" }
    ]);

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            fetchSessionTypes();
        }
    }, [open, profile?.organization_id]);

    const fetchClients = async () => {
        const { data } = await supabase
            .from("clients")
            .select("id, first_name, last_name, uhid")
            .eq("organization_id", profile?.organization_id)
            .is("deleted_at", null);
        if (data) setClients(data);
    };

    const DEFAULT_SESSION_TYPES = [
        "Performance Assessment", "Device Testing", "Testing & Training", "Training",
        "Online session", "Physiotherapy", "Studying/Research",
        "Video Production/Video shooting/Video Editing", "Site Visit/Business Development",
        "Meeting", "Travelling", "Athlete/Parent Counselling", "Initial Consultation",
        "Guest Visits(at Center and Outside)", "Off-site Testing", "Off-site Training",
        "Group Session", "Office Work", "On-Court/On-Field Observations", "Report Making",
        "Warmup/ cool down", "Data work", "Program Design/Program planning and sharing",
        "Match day/ Observation", "Doctor consultation"
    ];

    const getLocalTypes = (): { id: string; name: string; category: string }[] => {
        const key = `session_types_${profile?.organization_id || "default"}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return DEFAULT_SESSION_TYPES.map((name, i) => ({ id: `local-${i}`, name, category: "General" }));
    };

    const fetchSessionTypes = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from("session_types")
                .select("*")
                .eq("organization_id", profile?.organization_id);

            if (error) throw error;

            if (data && data.length > 0) {
                setSessionTypes(data);
                return;
            }

            // No session types in DB — seed the defaults now so we always get real UUIDs
            const defaultTypes = DEFAULT_SESSION_TYPES.map(name => ({
                organization_id: profile!.organization_id,
                name,
                category: "General",
            }));

            const { data: inserted, error: insertError } = await (supabase as any)
                .from("session_types")
                .insert(defaultTypes)
                .select();

            if (insertError) {
                // If seeding fails (e.g. duplicate), try fetching again
                console.warn("Could not seed session types, re-fetching:", insertError.message);
                const { data: retry } = await (supabase as any)
                    .from("session_types")
                    .select("*")
                    .eq("organization_id", profile?.organization_id);
                if (retry && retry.length > 0) setSessionTypes(retry);
            } else if (inserted) {
                setSessionTypes(inserted);
            }
        } catch (error) {
            console.error("Error fetching/seeding session types:", error);
        }
    };

    const handleSave = async () => {
        if (sessionMode === "Individual" && selectedClientIds.length === 0) {
            toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" });
            return;
        }
        if (sessionMode === "Group" && (!groupName || selectedClientIds.length === 0)) {
            toast({ title: "Validation Error", description: "Please provide a group name and select at least one athlete.", variant: "destructive" });
            return;
        }
        if (!sessionTypeId || !sessionDate) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        if (!isRecurring && (!startTime || !endTime)) {
            toast({ title: "Validation Error", description: "Please set the session time.", variant: "destructive" });
            return;
        }

        // Date guard: cannot book sessions older than 1 day
        const selectedDay = startOfDay(new Date(sessionDate + "T00:00:00"));
        const today = startOfDay(new Date());
        const daysAgo = differenceInCalendarDays(today, selectedDay);
        if (daysAgo >= 2) {
            toast({
                title: "Date Not Allowed",
                description: `You cannot log sessions older than 1 day. Sessions on ${format(selectedDay, "MMM d, yyyy")} are locked. You may log sessions for today or yesterday only.`,
                variant: "destructive"
            });
            return;
        }
        
        if (isRecurring && new Date(recurringEndDate) < new Date(sessionDate)) {
            toast({ title: "Validation Error", description: "End date must be after the start date.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const startDate = new Date(`${sessionDate}T00:00:00`);
            const sessionsToInsert: any[] = [];

            if (!isRecurring) {
                // Single session logic
                const startTimestamp = `${sessionDate}T${startTime}:00`;
                const endTimestamp = `${sessionDate}T${endTime}:00`;
                
                const sessionData: any = {
                    organization_id: profile!.organization_id,
                    scientist_id: user!.id,
                    session_mode: sessionMode,
                    session_type_id: sessionTypeId,
                    scheduled_start: new Date(startTimestamp).toISOString(),
                    scheduled_end: new Date(endTimestamp).toISOString(),
                    status: status,
                    session_notes: notes,
                    cancellation_reason: (status === "Missed" || status === "Cancelled") ? cancellationReason : null,
                };

                if (status === "Completed") {
                    sessionData.actual_start = sessionData.scheduled_start;
                    sessionData.actual_end = sessionData.scheduled_end;
                }

                if (sessionMode === "Individual") {
                    sessionData.client_id = selectedClientIds[0];
                } else if (sessionMode === "Group") {
                    sessionData.group_name = groupName;
                }
                
                sessionsToInsert.push(sessionData);
            } else {
                // Multi-slot recurring logic
                const limitDate = new Date(`${recurringEndDate}T23:59:59`);
                const daysOfWeekMap: Record<string, number> = {
                    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6
                };

                for (const slot of recurringSlots) {
                    const targetDay = daysOfWeekMap[slot.day];
                    let currentDate = new Date(startDate);
                    
                    // Align currentDate to the first occurrence of targetDay
                    while (currentDate.getDay() !== targetDay) {
                        currentDate = addDays(currentDate, 1);
                    }

                    while (currentDate <= limitDate) {
                        const dStr = format(currentDate, "yyyy-MM-dd");
                        const startTimestamp = `${dStr}T${slot.startTime}:00`;
                        const endTimestamp = `${dStr}T${slot.endTime}:00`;

                        const sessionData: any = {
                            organization_id: profile!.organization_id,
                            scientist_id: user!.id,
                            session_mode: sessionMode,
                            session_type_id: sessionTypeId,
                            scheduled_start: new Date(startTimestamp).toISOString(),
                            scheduled_end: new Date(endTimestamp).toISOString(),
                            status: status,
                            session_notes: notes,
                            cancellation_reason: (status === "Missed" || status === "Cancelled") ? cancellationReason : null,
                        };

                        if (sessionMode === "Individual") {
                            sessionData.client_id = selectedClientIds[0];
                        } else if (sessionMode === "Group") {
                            sessionData.group_name = groupName;
                        }

                        sessionsToInsert.push(sessionData);
                        currentDate = addDays(currentDate, 7);
                    }
                }
            }

            // 1. Create the sessions
            const { data: insertedSessions, error: sessionError } = await (supabase as any)
                .from("sessions")
                .insert(sessionsToInsert)
                .select();

            if (sessionError) throw sessionError;

            // 2. If Group mode, create attendance rows
            if (sessionMode === "Group" && selectedClientIds.length > 0) {
                const attendanceData = [];
                for (const session of insertedSessions) {
                    for (const clientId of selectedClientIds) {
                        attendanceData.push({
                            session_id: session.id,
                            client_id: clientId,
                            attendance_status: 'Present'
                        });
                    }
                }
                
                const { error: attendError } = await supabase
                    .from("group_attendance")
                    .insert(attendanceData);
                if (attendError) console.error("Attendance Error:", attendError);
            }

            toast({ title: "Success", description: "Session booked successfully." });
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
        setSelectedClientIds([]);
        setGroupName("");
        setSessionTypeId("");
        setNotes("");
        setSessionDate(format(new Date(), "yyyy-MM-dd"));
        setStartTime("09:00");
        setEndTime("10:00");
        setStatus("Planned");
        setCancellationReason("");
        setIsRecurring(false);
        setRecurringEndDate(format(addWeeks(new Date(), 4), "yyyy-MM-dd"));
        setRecurringSlots([
            { day: format(new Date(), "EEEE"), startTime: "09:00", endTime: "10:00" }
        ]);
    };

    const toggleClient = (id: string) => {
        if (sessionMode === "Individual") {
            setSelectedClientIds([id]);
        } else {
            setSelectedClientIds(prev => 
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Schedule Sports Science Session</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[85vh] pr-4">
                    <div className="grid gap-6 py-4">
                        {/* Mode Selection */}
                        <div className="flex p-1 bg-muted rounded-lg w-full">
                            <Button 
                                variant={sessionMode === "Individual" ? "default" : "ghost"} 
                                className="flex-1 rounded-md"
                                onClick={() => { setSessionMode("Individual"); setSelectedClientIds(selectedClientIds.slice(0, 1)); }}
                            >
                                <User className="w-4 h-4 mr-2" /> Individual
                            </Button>
                            <Button 
                                variant={sessionMode === "Group" ? "default" : "ghost"} 
                                className="flex-1 rounded-md"
                                onClick={() => setSessionMode("Group")}
                            >
                                <Users className="w-4 h-4 mr-2" /> Group
                            </Button>
                            <Button 
                                variant={sessionMode === "Other" ? "default" : "ghost"} 
                                className="flex-1 rounded-md"
                                onClick={() => { setSessionMode("Other"); setSelectedClientIds([]); }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Other
                            </Button>
                        </div>

                        {/* Group Name */}
                        {sessionMode === "Group" && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="groupName">Group Name</Label>
                                <Input 
                                    id="groupName" 
                                    placeholder="e.g. U19 Squad, Defensive Line" 
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Client Selection */}
                        {sessionMode !== "Other" && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>{sessionMode === "Individual" ? "Select Athlete" : "Select Athletes"}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between h-auto py-2", selectedClientIds.length === 0 && "text-muted-foreground")}
                                        >
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {selectedClientIds.length === 0 ? (
                                                    <span>Search or select athletes...</span>
                                                ) : (
                                                    selectedClientIds.map(id => {
                                                        const c = clients.find(x => x.id === id);
                                                        return (
                                                            <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                                                {c ? `${c.first_name} ${c.last_name}` : id}
                                                                {sessionMode === "Group" && (
                                                                    <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleClient(id); }} />
                                                                )}
                                                            </Badge>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search athlete by name or UHID..." />
                                            <CommandList>
                                                <CommandEmpty>No athlete found.</CommandEmpty>
                                                <CommandGroup>
                                                    {clients.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={`${c.first_name} ${c.last_name} ${c.uhid}`}
                                                            onSelect={() => toggleClient(c.id)}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedClientIds.includes(c.id) ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span>{c.first_name} {c.last_name}</span>
                                                                <span className="text-xs text-muted-foreground">{c.uhid}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {/* Session Type */}
                        <div className="grid gap-2">
                            <Label>Session Type</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn("w-full justify-between h-10", !sessionTypeId && "text-muted-foreground")}
                                    >
                                        {sessionTypeId 
                                            ? sessionTypes.find(t => t.id === sessionTypeId)?.name 
                                            : "Select Session Category..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[450px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search session type..." />
                                        <CommandList>
                                            <CommandEmpty>No session type found.</CommandEmpty>
                                            <CommandGroup>
                                                <ScrollArea className="h-72">
                                                    {sessionTypes.map((t) => (
                                                        <CommandItem
                                                            key={t.id}
                                                            value={t.name}
                                                            onSelect={() => {
                                                                setSessionTypeId(t.id);
                                                            }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Check className={cn("h-4 w-4", sessionTypeId === t.id ? "opacity-100" : "opacity-0")} />
                                                            {t.name}
                                                        </CommandItem>
                                                    ))}
                                                </ScrollArea>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Session Status */}
                        <div className="grid gap-2">
                            <Label>Session Status</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Planned">Planned (Upcoming)</SelectItem>
                                    <SelectItem value="Completed">Completed (Logged Retroactively)</SelectItem>
                                    <SelectItem value="Missed">Missed (Athlete didn't show)</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled (Prior notice)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground italic">
                                Use "Completed" only for sessions that have already occurred.
                            </p>
                        </div>

                        {/* Cancellation Reason */}
                        {(status === "Missed" || status === "Cancelled") && (
                            <div className="grid gap-2 animate-in slide-in-from-top-1">
                                <Label>Reason for {status}</Label>
                                <Textarea 
                                    placeholder={`Why was the session ${status.toLowerCase()}?`} 
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="resize-none h-20"
                                />
                            </div>
                        )}                        {/* Date & Time / Multi-Slot Scheduler */}
                        {!isRecurring ? (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                <div className="grid gap-2">
                                    <Label>Date</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input type="date" className="pl-9" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Select Time</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                        <span className="text-muted-foreground text-xs">to</span>
                                        <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 p-4 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-bold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" /> Weekly Schedule
                                    </Label>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 gap-1"
                                        onClick={() => setRecurringSlots([...recurringSlots, { day: "Monday", startTime: "09:00", endTime: "10:00" }])}
                                    >
                                        <Plus className="w-3 h-3" /> Add Slot
                                    </Button>
                                </div>
                                <div className="grid gap-3">
                                    {recurringSlots.map((slot, index) => (
                                        <div key={index} className="flex items-center gap-2 group">
                                            <Select 
                                                value={slot.day} 
                                                onValueChange={(v) => {
                                                    const newSlots = [...recurringSlots];
                                                    newSlots[index].day = v;
                                                    setRecurringSlots(newSlots);
                                                }}
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-1 flex-1">
                                                <Input 
                                                    type="time" 
                                                    className="h-9" 
                                                    value={slot.startTime} 
                                                    onChange={e => {
                                                        const newSlots = [...recurringSlots];
                                                        newSlots[index].startTime = e.target.value;
                                                        setRecurringSlots(newSlots);
                                                    }} 
                                                />
                                                <span className="text-[10px] text-muted-foreground px-0.5">to</span>
                                                <Input 
                                                    type="time" 
                                                    className="h-9" 
                                                    value={slot.endTime} 
                                                    onChange={e => {
                                                        const newSlots = [...recurringSlots];
                                                        newSlots[index].endTime = e.target.value;
                                                        setRecurringSlots(newSlots);
                                                    }} 
                                                />
                                            </div>
                                            {recurringSlots.length > 1 && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setRecurringSlots(recurringSlots.filter((_, i) => i !== index))}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Recurring Toggle & End Date */}
                        <div className="grid gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(checked) => setIsRecurring(checked as boolean)} />
                                    <Label htmlFor="recurring" className="text-sm font-medium leading-none cursor-pointer">
                                        Make this a recurring schedule
                                    </Label>
                                </div>
                                {isRecurring && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                        {recurringSlots.length} Slots/Week
                                    </Badge>
                                )}
                            </div>
                            
                            {isRecurring && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                                    <div className="grid gap-2">
                                        <Label>Starts From</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="date" className="pl-9 h-9" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Recurring Until</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input type="date" className="pl-9 h-9" value={recurringEndDate} onChange={e => setRecurringEndDate(e.target.value)} />
                                        </div>
                                    </div>
                                    <p className="col-span-2 text-[10px] text-muted-foreground italic px-1">
                                        Sessions will be automatically generated for all selected time slots until the end date.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Session Plan / Notes</Label>
                            <Input 
                                id="notes" 
                                placeholder="Core objectives for the session..." 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        <Button onClick={handleSave} disabled={loading} className="w-full h-11">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Schedule Session
                        </Button>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
