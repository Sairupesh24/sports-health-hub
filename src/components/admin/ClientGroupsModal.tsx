import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Check, Loader2, Search, ArrowLeft, Users, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClientGroupsModal({ open, onOpenChange }: Props) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const [view, setView] = useState<"list" | "edit-members">("list");
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [savingMembers, setSavingMembers] = useState(false);

    // Group Name Editing State
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [renameLoading, setRenameLoading] = useState(false);

    // Fetch all client groups
    const { data: groups = [], isLoading: groupsLoading } = useQuery({
        queryKey: ["client-groups-all"],
        queryFn: async () => {
            return await apiFetch<any[]>("/clients/groups/all");
        },
        enabled: open
    });

    // Fetch all clients to choose members from
    const { data: clients = [], isLoading: clientsLoading } = useQuery({
        queryKey: ["all-clients-for-groups"],
        queryFn: async () => {
            return await apiFetch<any[]>("/clients");
        },
        enabled: open
    });

    // Reset view state when modal opens/closes
    useEffect(() => {
        if (!open) {
            setView("list");
            setSelectedGroup(null);
            setNewGroupName("");
            setSearchQuery("");
            setSelectedMemberIds([]);
            setEditingGroupId(null);
            setEditingName("");
        }
    }, [open]);

    // Handle Edit Members button click
    const handleStartEditMembers = (group: any) => {
        setSelectedGroup(group);
        const memberIds = (group.client_group_members || []).map((m: any) => m.client_id);
        setSelectedMemberIds(memberIds);
        setView("edit-members");
        setSearchQuery("");
        setEditingGroupId(null);
    };

    // Handle Group Creation
    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setCreateLoading(true);
        try {
            await apiFetch("/clients/groups", {
                method: "POST",
                data: { name: newGroupName.trim() }
            });
            toast({ title: "Success", description: "Client group created successfully." });
            setNewGroupName("");
            queryClient.invalidateQueries({ queryKey: ["client-groups-all"] });
            queryClient.invalidateQueries({ queryKey: ["client-groups"] });
        } catch (error: any) {
            toast({ title: "Failed to create group", description: error.message, variant: "destructive" });
        } finally {
            setCreateLoading(false);
        }
    };

    // Handle Group Name Rename
    const handleSaveGroupName = async (groupId: string) => {
        if (!editingName.trim()) return;
        setRenameLoading(true);
        try {
            const updated = await apiFetch<any>(`/clients/groups/${groupId}`, {
                method: "PATCH",
                data: { name: editingName.trim() }
            });
            toast({ title: "Group Renamed", description: `Successfully renamed group to "${updated?.name || editingName.trim()}".` });
            
            if (selectedGroup && selectedGroup.id === groupId) {
                setSelectedGroup((prev: any) => prev ? { ...prev, name: editingName.trim() } : null);
            }

            setEditingGroupId(null);
            setEditingName("");
            queryClient.invalidateQueries({ queryKey: ["client-groups-all"] });
            queryClient.invalidateQueries({ queryKey: ["client-groups"] });
        } catch (error: any) {
            toast({ title: "Rename Failed", description: error.message, variant: "destructive" });
        } finally {
            setRenameLoading(false);
        }
    };

    // Handle Group Deletion
    const handleDeleteGroup = async (groupId: string, name: string) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete the group "${name}"? All group memberships will be cleared.`);
        if (!confirmDelete) return;

        try {
            await apiFetch(`/clients/groups/${groupId}`, {
                method: "DELETE"
            });
            toast({ title: "Group Deleted", description: `Successfully deleted "${name}".` });
            queryClient.invalidateQueries({ queryKey: ["client-groups-all"] });
            queryClient.invalidateQueries({ queryKey: ["client-groups"] });
        } catch (error: any) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        }
    };

    // Handle Saving Group Memberships
    const handleSaveMembers = async () => {
        if (!selectedGroup) return;
        setSavingMembers(true);
        try {
            await apiFetch(`/clients/groups/${selectedGroup.id}/members`, {
                method: "POST",
                data: { memberIds: selectedMemberIds }
            });
            toast({ title: "Members Saved", description: "Group membership list updated successfully." });
            queryClient.invalidateQueries({ queryKey: ["client-groups-all"] });
            queryClient.invalidateQueries({ queryKey: ["client-groups"] });
            setView("list");
            setSelectedGroup(null);
        } catch (error: any) {
            toast({ title: "Failed to save members", description: error.message, variant: "destructive" });
        } finally {
            setSavingMembers(false);
        }
    };

    // Filter clients list by search query
    const filteredClients = clients.filter(c => {
        const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
        const uhid = (c.uhid || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || uhid.includes(query);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-6 rounded-[24px]">
                <DialogHeader className="pb-2 border-b border-slate-100 shrink-0">
                    <DialogTitle className="flex items-center justify-between text-xl font-bold font-display text-slate-800">
                        {view === "list" ? (
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Manage Client Groups
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 truncate">
                                <button onClick={() => setView("list")} className="hover:bg-slate-100 p-1.5 rounded-lg transition-colors mr-1 shrink-0">
                                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                {editingGroupId === selectedGroup?.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveGroupName(selectedGroup.id);
                                                if (e.key === 'Escape') setEditingGroupId(null);
                                            }}
                                            className="h-8 text-sm font-bold bg-white w-48"
                                            autoFocus
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveGroupName(selectedGroup.id)}
                                            disabled={renameLoading || !editingName.trim()}
                                            className="h-8 px-2 font-bold text-xs"
                                        >
                                            {renameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingGroupId(null)}
                                            disabled={renameLoading}
                                            className="h-8 px-2 text-xs text-slate-500"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">Edit Members: {selectedGroup?.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingGroupId(selectedGroup?.id);
                                                setEditingName(selectedGroup?.name || "");
                                            }}
                                            title="Edit Group Name"
                                            className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md shrink-0"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Dialogue modal to create, list, edit, or delete sports athlete client groups.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 pr-1 min-h-[300px] no-scrollbar">
                    {view === "list" ? (
                        <div className="space-y-6">
                            {/* Create Group Form */}
                            <form onSubmit={handleCreateGroup} className="flex gap-2 items-end bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex-1 space-y-1.5">
                                    <Label htmlFor="group-name" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Group Name</Label>
                                    <Input
                                        id="group-name"
                                        placeholder="e.g. Under-19 Football Squad"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="h-10 bg-white dark:bg-slate-950"
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={createLoading || !newGroupName.trim()}
                                    className="h-10 font-bold px-4 hover:scale-95 transition-all duration-150"
                                >
                                    {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                                    Create
                                </Button>
                            </form>

                            {/* Groups List */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Existing Groups ({groups.length})</Label>
                                {groupsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                        <span className="text-xs">Loading groups...</span>
                                    </div>
                                ) : groups.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No Groups Found</p>
                                    </div>
                                ) : (
                                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                        {groups.map((group) => (
                                            <div key={group.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                {editingGroupId === group.id ? (
                                                    <div className="flex-1 flex items-center gap-2 mr-2">
                                                        <Input
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleSaveGroupName(group.id);
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    setEditingGroupId(null);
                                                                }
                                                            }}
                                                            placeholder="Group name"
                                                            className="h-9 text-sm font-bold bg-white dark:bg-slate-900 border-primary/50"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => handleSaveGroupName(group.id)}
                                                            disabled={renameLoading || !editingName.trim()}
                                                            className="h-9 px-3 font-bold text-xs shrink-0"
                                                        >
                                                            {renameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingGroupId(null)}
                                                            disabled={renameLoading}
                                                            className="h-9 px-2 text-xs shrink-0 text-slate-500 hover:bg-slate-100"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{group.name}</h4>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setEditingGroupId(group.id);
                                                                        setEditingName(group.name);
                                                                    }}
                                                                    title="Rename Group"
                                                                    className="h-6 w-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md shrink-0 transition-colors"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                👥 {group.client_group_members?.length || 0} Members
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleStartEditMembers(group)}
                                                                className="h-8 gap-1 font-bold text-[10px] uppercase tracking-wider rounded-lg border-slate-200 dark:border-slate-800"
                                                            >
                                                                <Edit className="w-3 h-3" /> Members
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Search Client Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search athletes by name or UHID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10 border-slate-200 dark:border-slate-800"
                                />
                            </div>

                            {/* Selection checklist */}
                            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
                                {clientsLoading ? (
                                    <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary mb-1" />
                                        Loading client roster...
                                    </div>
                                ) : filteredClients.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic text-center py-8">No matching athletes found.</p>
                                ) : (
                                    filteredClients.map((client) => {
                                        const isChecked = selectedMemberIds.includes(client.id);
                                        const clientName = [client.honorific, client.first_name, client.last_name].filter(Boolean).join(" ");
                                        return (
                                            <div
                                                key={client.id}
                                                onClick={() => {
                                                    if (isChecked) {
                                                        setSelectedMemberIds(selectedMemberIds.filter(id => id !== client.id));
                                                    } else {
                                                        setSelectedMemberIds([...selectedMemberIds, client.id]);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-950 cursor-pointer transition-all",
                                                    isChecked && "bg-primary/5 hover:bg-primary/5 hover:border-primary/10 border-primary/5"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() => {}}
                                                    className="rounded-[4px] border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{clientName}</p>
                                                    <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">
                                                        {client.uhid} {client.sport ? `• ${client.sport}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {view === "edit-members" && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Selected: {selectedMemberIds.length} Athletes
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setView("list")}
                                className="h-9 font-bold text-[10px] uppercase tracking-wider rounded-lg border-slate-200 dark:border-slate-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveMembers}
                                disabled={savingMembers}
                                className="h-9 gap-1 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:scale-95 transition-all duration-150"
                            >
                                {savingMembers ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                Save Members
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
