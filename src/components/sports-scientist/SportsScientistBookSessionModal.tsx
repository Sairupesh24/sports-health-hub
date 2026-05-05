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
    const [groupNameOpen, setGroupNameOpen] = useState(false);
    const [groupNameSearch, setGroupNameSearch] = useState("");

    const [recurringEndDate, setRecurringEndDate] = useState(format(addWeeks(new Date(), 4), "yyyy-MM-dd"));
    const [recurringSlots, setRecurringSlots] = useState<Array<{ day: string, startTime: string, endTime: string }>>([
        { day: format(new Date(), "EEEE"), startTime: "09:00", endTime: "10:00" }
    ]);

    const [recentGroups, setRecentGroups] = useState<{id: string, name: string}[]>([]);
    const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            fetchSessionTypes();
            fetchGroups();
            setIsCreatingGroup(false);
        }
    }, [open, profile?.organization_id]);

    const fetchGroups = async () => {
        const { data: groups } = await supabase
            .from("client_groups")
            .select("id, name")
            .eq("organization_id", profile?.organization_id);
            
        if (groups) {
            setRecentGroups(groups);
            
            const { data: members } = await supabase
                .from("client_group_members")
                .select("group_id, client_id");
                
            if (members) {
                const map: Record<string, string[]> = {};
                members.forEach(m => {
                    if (!map[m.group_id]) map[m.group_id] = [];
                    map[m.group_id].push(m.client_id);
                });
                setGroupMembers(map);
            }
        }
    };

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

                const { data: retry } = await (supabase as any)
                    .from("session_types")
                    .select("*")
                    .eq("organization_id", profile?.organization_id);
                if (retry && retry.length > 0) setSessionTypes(retry);
            } else if (inserted) {
                setSessionTypes(inserted);
            }
        } catch (error) {

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

            // 2. If Group mode, create attendance rows and sync group architecture
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


                // Sync group architecture
                const { data: groupData, error: groupError } = await supabase
                    .from("client_groups")
                    .upsert({ 
                        organization_id: profile!.organization_id,
                        name: groupName,
                        created_by: user!.id 
                    }, { onConflict: 'organization_id,name' })
                    .select("id")
                    .single();
                    
                if (groupData && !groupError) {
                    const groupMembersData = selectedClientIds.map(clientId => ({
                        group_id: groupData.id,
                        client_id: clientId,
                        added_by: user!.id
                    }));
                    await supabase.from("client_group_members").upsert(groupMembersData, { onConflict: 'group_id,client_id' });
                }
            }

            toast({ title: "Success", description: "Session booked successfully." });
            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {

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

    const matchedGroup = recentGroups.find(g => g.name === groupName);
    const displayedClients = sessionMode === "Group" && matchedGroup && groupMembers[matchedGroup.id]
        ? clients.filter(c => groupMembers[matchedGroup.id].includes(c.id))
        : clients;

    const selectAllDisplayed = () => {
        const displayedIds = displayedClients.map(c => c.id);
        const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedClientIds.includes(id));
        if (allSelected) {
            setSelectedClientIds(prev => prev.filter(id => !displayedIds.includes(id)));
        } else {
            setSelectedClientIds(prev => Array.from(new Set([...prev, ...displayedIds])));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-slate-50 dark:bg-slate-950 rounded-[2.5rem]">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white">
                       Schedule Session
                    </DialogTitle>
                </DialogHeader>
                
                <div className="max-h-[85vh] overflow-y-auto px-6 py-4 custom-scrollbar">
                    <div className="space-y-6">
                        {/* Mode Selection - Premium Segmented Control */}
                        <div className="p-1.5 bg-slate-200/50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-1">
                            <button 
                                onClick={() => { setSessionMode("Individual"); setSelectedClientIds(selectedClientIds.slice(0, 1)); }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]",
                                    sessionMode === "Individual" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500"
                                )}
                            >
                                <User className="w-3.5 h-3.5" /> Individual
                            </button>
                            <button 
                                onClick={() => { setSessionMode("Group"); }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]",
                                    sessionMode === "Group" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500"
                                )}
                            >
                                <Users className="w-3.5 h-3.5" /> Group
                            </button>
                            <button 
                                onClick={() => { setSessionMode("Other"); setSelectedClientIds([]); }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]",
                                    sessionMode === "Other" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500"
                                )}
                            >
                                <Plus className="w-3.5 h-3.5" /> Other
                            </button>
                        </div>

                        {/* Group Name Section */}
                        {sessionMode === "Group" && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Group Identifier</Label>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => { 
                                            setIsCreatingGroup(!isCreatingGroup);
                                            setGroupName("");
                                            setGroupNameSearch("");
                                        }}
                                        className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-full border border-primary/20"
                                    >
                                        {isCreatingGroup ? (
                                            <><Users className="w-2.5 h-2.5 mr-1" /> Use Existing</>
                                        ) : (
                                            <><Plus className="w-2.5 h-2.5 mr-1" /> New Group</>
                                        )}
                                    </Button>
                                </div>
                                
                                {isCreatingGroup ? (
                                    <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95">
                                        <Input 
                                            placeholder="Enter new group name (e.g. U-19 Elite)" 
                                            className="h-12 rounded-xl border-primary/20 font-black italic bg-white dark:bg-slate-900 focus-visible:ring-primary"
                                            value={groupName}
                                            onChange={(e) => setGroupName(e.target.value)}
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 italic px-1">
                                            Creating a new group will also save it for future use. Select athletes below to add them.
                                        </p>
                                    </div>
                                ) : (
                                    <Popover open={groupNameOpen} onOpenChange={setGroupNameOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn("w-full justify-between h-12 rounded-2xl border-border/50 font-black", !groupName && "text-muted-foreground")}
                                            >
                                                <span className="truncate">{groupName || "Search or select group..."}</span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent 
                                            className="w-[calc(100vw-3rem)] sm:w-[450px] p-0 rounded-2xl overflow-hidden shadow-2xl" 
                                            align="start"
                                            onWheel={(e) => e.stopPropagation()}
                                        >
                                            <Command>
                                                <CommandInput 
                                                    placeholder="Type group name..." 
                                                    value={groupNameSearch}
                                                    onValueChange={setGroupNameSearch}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        {groupNameSearch ? (
                                                            <Button 
                                                                variant="ghost" 
                                                                className="w-full justify-start font-bold text-primary px-3 py-4 h-auto"
                                                                onClick={() => {
                                                                    setGroupName(groupNameSearch);
                                                                    setGroupNameOpen(false);
                                                                    setGroupNameSearch("");
                                                                }}
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" /> Create "{groupNameSearch}"
                                                            </Button>
                                                        ) : "No groups found."}
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {recentGroups.filter(g => g.name.toLowerCase().includes(groupNameSearch.toLowerCase())).map((g) => (
                                                            <CommandItem
                                                                key={g.id}
                                                                value={g.name}
                                                                onSelect={() => {
                                                                    setGroupName(g.name);
                                                                    setGroupNameOpen(false);
                                                                    setGroupNameSearch("");
                                                                }}
                                                                className="py-3 px-4"
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4 text-primary", groupName === g.name ? "opacity-100" : "opacity-0")} />
                                                                <span className="font-bold">{g.name}</span>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                        )}

                        {/* Client Selection */}
                        {sessionMode !== "Other" && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                   {sessionMode === "Individual" ? "Athlete Profile" : "Participating Athletes"}
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between h-auto min-h-[48px] py-2 px-3 rounded-2xl border-border/50", selectedClientIds.length === 0 && "text-muted-foreground")}
                                        >
                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                {selectedClientIds.length === 0 ? (
                                                    <span className="font-bold">Search or select athletes...</span>
                                                ) : (
                                                    selectedClientIds.map(id => {
                                                        const c = clients.find(x => x.id === id);
                                                        return (
                                                            <Badge key={id} variant="secondary" className="bg-primary/10 text-primary border-none py-1 px-2 font-black italic tracking-tighter">
                                                                {c ? `${c.first_name} ${c.last_name}` : id}
                                                                {sessionMode === "Group" && (
                                                                    <X className="w-3 h-3 ml-1.5 cursor-pointer opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); toggleClient(id); }} />
                                                                )}
                                                            </Badge>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        className="w-[calc(100vw-3rem)] sm:w-[450px] p-0 rounded-2xl overflow-hidden shadow-2xl" 
                                        align="start"
                                        onWheel={(e) => e.stopPropagation()}
                                    >
                                        <Command>
                                            <CommandInput placeholder="Search by name or UHID..." />
                                            <CommandList>
                                                <CommandEmpty>No athlete found.</CommandEmpty>
                                                <CommandGroup>
                                                    {sessionMode === "Group" && displayedClients.length > 0 && (
                                                        <div className="p-2 border-b">
                                                            <Button 
                                                                variant="secondary" 
                                                                size="sm" 
                                                                className="w-full text-[10px] font-black uppercase tracking-widest h-8 rounded-xl"
                                                                onClick={selectAllDisplayed}
                                                            >
                                                                {displayedClients.every(c => selectedClientIds.includes(c.id)) 
                                                                    ? "Deselect All" 
                                                                    : "Select All Visible"
                                                                }
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {displayedClients.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={`${c.first_name} ${c.last_name} ${c.uhid}`}
                                                            onSelect={() => toggleClient(c.id)}
                                                            className="py-3 px-4"
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4 text-primary", selectedClientIds.includes(c.id) ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{c.first_name} {c.last_name}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase font-black">{c.uhid}</span>
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

                        {/* Session Type & Status - Grid for better spacing */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Session Type</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between h-12 rounded-2xl border-border/50 font-bold", !sessionTypeId && "text-muted-foreground")}
                                        >
                                            <span className="truncate">
                                                {sessionTypeId 
                                                    ? sessionTypes.find(t => t.id === sessionTypeId)?.name 
                                                    : "Select Type..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        className="w-[calc(100vw-3rem)] sm:w-[450px] p-0 rounded-2xl overflow-hidden shadow-2xl" 
                                        align="start"
                                        onWheel={(e) => e.stopPropagation()}
                                    >
                                        <Command>
                                            <CommandInput placeholder="Search types..." />
                                            <CommandList>
                                                <CommandEmpty>No session type found.</CommandEmpty>
                                                <CommandGroup>
                                                    {sessionTypes.map((t) => (
                                                        <CommandItem
                                                            key={t.id}
                                                            value={t.name}
                                                            onSelect={() => setSessionTypeId(t.id)}
                                                            className="py-3 px-4"
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4 text-primary", sessionTypeId === t.id ? "opacity-100" : "opacity-0")} />
                                                            <span className="font-bold">{t.name}</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current Status</Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger className="h-12 rounded-2xl border-border/50 font-bold">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl shadow-2xl border-none">
                                        <SelectItem value="Planned" className="py-3">Planned (Upcoming)</SelectItem>
                                        <SelectItem value="Completed" className="py-3">Completed (Logged)</SelectItem>
                                        <SelectItem value="Missed" className="py-3">Missed (No-show)</SelectItem>
                                        <SelectItem value="Cancelled" className="py-3">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Cancellation Reason */}
                        {(status === "Missed" || status === "Cancelled") && (
                            <div className="space-y-2 animate-in slide-in-from-top-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for {status}</Label>
                                <Textarea 
                                    placeholder="Brief explanation..." 
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="resize-none h-20 rounded-2xl border-border/50 p-4 focus-visible:ring-primary"
                                />
                            </div>
                        )}

                        {/* Date & Time Section - Redesigned Grid */}
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-border/50 shadow-sm space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                   <CalendarIcon className="w-3 h-3" /> Event Date
                                </Label>
                                <Input 
                                    type="date" 
                                    className="h-12 rounded-xl border-slate-100 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-950 focus-visible:ring-primary" 
                                    value={sessionDate} 
                                    onChange={e => setSessionDate(e.target.value)} 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                   <Clock className="w-3 h-3" /> Time Window
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Input type="time" className="h-12 rounded-xl border-slate-100 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-950 pr-8" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">IN</span>
                                    </div>
                                    <div className="relative">
                                        <Input type="time" className="h-12 rounded-xl border-slate-100 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-950 pr-8" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">OUT</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Session Plan & Notes</Label>
                            <Textarea 
                                id="notes" 
                                placeholder="What's the core focus of this session? (Optional)" 
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="resize-none h-24 rounded-[1.5rem] border-border/50 p-4 focus-visible:ring-primary"
                            />
                        </div>

                        <Button 
                            onClick={handleSave} 
                            disabled={loading} 
                            className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all group overflow-hidden relative mt-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                   <Plus className="w-4 h-4" /> Create Session
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
