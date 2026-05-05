import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, ChevronRight, UserPlus, Loader2, Plus, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MobileAthleteDrawer from "@/components/sports-scientist/MobileAthleteDrawer";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function MobileClients() {
    const navigate = useNavigate();
    const { profile, user } = useAuth();
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    
    // Group Management State
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [groupManageOpen, setGroupManageOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState<string[]>([]);
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    
    // Create Group State
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // Fetch all clients
    const { data: allClients, isLoading: clientsLoading } = useQuery({
        queryKey: ["specialist-all-clients", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const { data } = await supabase
                .from("clients")
                .select("id, first_name, last_name, uhid, is_vip, sport, org_name")
                .eq("organization_id", profile.organization_id)
                .is("deleted_at", null)
                .order("first_name", { ascending: true });
            return data || [];
        },
        enabled: !!profile?.organization_id
    });

    // Fetch active clients this month
    const { data: activeClientsData, isLoading: activeLoading } = useQuery({
        queryKey: ["specialist-active-clients", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            
            const start = startOfMonth(new Date()).toISOString();
            const end = endOfMonth(new Date()).toISOString();

            // Fetch individual sessions
            const { data: individualSessions } = await supabase
                .from("sessions")
                .select("client_id")
                .eq("scientist_id", user.id)
                .eq("session_mode", "Individual")
                .gte("scheduled_start", start)
                .lte("scheduled_end", end)
                .not("client_id", "is", null);

            // Fetch group attendance sessions
            const { data: groupSessions } = await supabase
                .from("sessions")
                .select("id")
                .eq("scientist_id", user.id)
                .eq("session_mode", "Group")
                .gte("scheduled_start", start)
                .lte("scheduled_end", end);
                
            const groupSessionIds = groupSessions?.map(s => s.id) || [];
            
            let groupClientIds: string[] = [];
            if (groupSessionIds.length > 0) {
                const { data: attendance } = await supabase
                    .from("group_attendance")
                    .select("client_id")
                    .in("session_id", groupSessionIds);
                if (attendance) {
                    groupClientIds = attendance.map(a => a.client_id).filter(Boolean) as string[];
                }
            }

            const individualClientIds = individualSessions?.map(s => s.client_id).filter(Boolean) as string[] || [];
            const allActiveIds = Array.from(new Set([...individualClientIds, ...groupClientIds]));
            
            return allActiveIds;
        },
        enabled: !!user?.id
    });

    // Fetch client groups
    const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery({
        queryKey: ["specialist-client-groups", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const { data } = await supabase
                .from("client_groups")
                .select("id, name, client_group_members(client_id)")
                .eq("organization_id", profile.organization_id)
                .order("created_at", { ascending: false });
            return data || [];
        },
        enabled: !!profile?.organization_id
    });

    const activeClients = allClients?.filter(c => activeClientsData?.includes(c.id)) || [];

    const handleClientClick = (client: any) => {
        setSelectedAthlete(client);
        setDrawerOpen(true);
    };

    const handleManageGroup = (group: any) => {
        setSelectedGroup(group);
        setGroupMembers(group.client_group_members?.map((m: any) => m.client_id) || []);
        setGroupManageOpen(true);
    };

    const saveGroupMembers = async () => {
        if (!selectedGroup) return;
        setIsSavingGroup(true);
        try {
            // First delete existing members
            await supabase
                .from("client_group_members")
                .delete()
                .eq("group_id", selectedGroup.id);
            
            // Then insert new ones if any
            if (groupMembers.length > 0) {
                const newMembers = groupMembers.map(id => ({
                    group_id: selectedGroup.id,
                    client_id: id,
                    added_by: user!.id
                }));
                const { error } = await supabase
                    .from("client_group_members")
                    .insert(newMembers);
                if (error) throw error;
            }
            
            toast({ title: "Success", description: "Group members updated successfully." });
            refetchGroups();
            setGroupManageOpen(false);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setIsCreatingGroup(true);
        try {
            const { data, error } = await supabase
                .from("client_groups")
                .insert({
                    organization_id: profile!.organization_id,
                    name: newGroupName,
                    created_by: user!.id
                })
                .select()
                .single();
            
            if (error) throw error;
            
            toast({ title: "Success", description: "Group created successfully." });
            setNewGroupName("");
            setCreateGroupOpen(false);
            refetchGroups();
            
            // Open the manage group immediately so they can add members
            if (data) {
                handleManageGroup(data);
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const renderClientList = (list: any[], showEmptyMessage: string) => {
        const filtered = list.filter(c => 
            c.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.uhid.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filtered.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{showEmptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="space-y-3 pb-24">
                {filtered.map(client => (
                    <div 
                        key={client.id}
                        onClick={() => handleClientClick(client)}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex items-center gap-4 border border-border/50 shadow-sm active:scale-95 transition-transform"
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex flex-shrink-0 items-center justify-center font-black text-lg",
                            client.is_vip ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500" : "bg-primary/10 text-primary"
                        )}>
                            {client.first_name?.[0]}{client.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                    {client.first_name} {client.last_name}
                                </h3>
                                {client.is_vip && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[8px] px-1.5 py-0">VIP</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{client.uhid} • {client.sport || "General"}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <MobileSpecialistLayout>
            <div className="flex-1 bg-[#f8fafc] dark:bg-[#020617] min-h-[calc(100vh-64px)] flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -ml-2" onClick={() => navigate('/mobile/specialist')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Clients Directory</h1>
                            <p className="text-xs text-muted-foreground">Manage athletes and squads</p>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or UHID..." 
                            className="pl-9 bg-slate-100 dark:bg-slate-900 border-none rounded-xl h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content Tabs */}
                <div className="flex-1 px-4 py-4">
                    <Tabs defaultValue="active" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 h-12 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-6">
                            <TabsTrigger value="active" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                Active ({activeClients.length})
                            </TabsTrigger>
                            <TabsTrigger value="all" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                All ({allClients?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="groups" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                Groups ({groups?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="active" className="mt-0">
                            {clientsLoading || activeLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : (
                                renderClientList(activeClients, "No active clients found for this month.")
                            )}
                        </TabsContent>

                        <TabsContent value="all" className="mt-0">
                            {clientsLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : (
                                renderClientList(allClients || [], "No clients found in the system.")
                            )}
                        </TabsContent>

                        <TabsContent value="groups" className="mt-0 space-y-3 pb-24">
                            {groupsLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : groups?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <Users className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">No client groups created yet.</p>
                                    <Button onClick={() => setCreateGroupOpen(true)} className="rounded-full shadow-md px-6">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Group
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {groups?.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map(group => (
                                        <div 
                                            key={group.id}
                                            className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex flex-col gap-3 border border-border/50 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white">{group.name}</h3>
                                                        <p className="text-xs text-muted-foreground">{group.client_group_members?.length || 0} Members</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-8 rounded-full text-xs font-bold"
                                                    onClick={() => handleManageGroup(group)}
                                                >
                                                    Manage
                                                </Button>
                                            </div>
                                            
                                            {/* Preview of members */}
                                            {group.client_group_members && group.client_group_members.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {group.client_group_members.slice(0, 5).map((m: any) => {
                                                        const client = allClients?.find(c => c.id === m.client_id);
                                                        if (!client) return null;
                                                        return (
                                                            <Badge key={m.client_id} variant="outline" className="bg-slate-50 dark:bg-slate-800 text-[9px] px-1.5 py-0 border-slate-200 dark:border-slate-700">
                                                                {client.first_name} {client.last_name[0]}.
                                                            </Badge>
                                                        );
                                                    })}
                                                    {group.client_group_members.length > 5 && (
                                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-[9px] px-1.5 py-0 border-slate-200 dark:border-slate-700">
                                                            +{group.client_group_members.length - 5} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {/* Floating Action Button */}
                                    <div className="fixed bottom-24 right-4 z-40">
                                        <Button 
                                            size="icon" 
                                            className="w-14 h-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white transition-transform active:scale-95"
                                            onClick={() => setCreateGroupOpen(true)}
                                        >
                                            <Plus className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Athlete Profile Drawer */}
            <MobileAthleteDrawer 
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                athlete={selectedAthlete}
            />

            {/* Group Management Dialog */}
            <Dialog open={groupManageOpen} onOpenChange={setGroupManageOpen}>
                <DialogContent className="sm:max-w-[425px] h-[85vh] sm:h-auto flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Manage Group: {selectedGroup?.name}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-4 border-b bg-muted/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search athletes to add..." 
                                className="pl-9 h-9"
                                id="group-search"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {allClients?.map(client => (
                            <div key={client.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                                <Checkbox 
                                    id={`client-${client.id}`}
                                    checked={groupMembers.includes(client.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setGroupMembers([...groupMembers, client.id]);
                                        } else {
                                            setGroupMembers(groupMembers.filter(id => id !== client.id));
                                        }
                                    }}
                                />
                                <Label 
                                    htmlFor={`client-${client.id}`}
                                    className="flex-1 flex flex-col gap-0.5 cursor-pointer"
                                >
                                    <span className="text-sm font-bold leading-none">{client.first_name} {client.last_name}</span>
                                    <span className="text-[10px] text-muted-foreground">{client.uhid} • {client.sport || 'General'}</span>
                                </Label>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="p-4 border-t bg-white dark:bg-slate-950">
                        <Button 
                            className="w-full" 
                            onClick={saveGroupMembers}
                            disabled={isSavingGroup}
                        >
                            {isSavingGroup ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes ({groupMembers.length} members)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Create Group Dialog */}
            <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Group Name</Label>
                            <Input 
                                placeholder="e.g. U19 Squad, Rehab Group A" 
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setCreateGroupOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                        <Button onClick={handleCreateGroup} disabled={isCreatingGroup || !newGroupName.trim()} className="w-full sm:w-auto">
                            {isCreatingGroup && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create & Add Members
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MobileSpecialistLayout>
    );
}
