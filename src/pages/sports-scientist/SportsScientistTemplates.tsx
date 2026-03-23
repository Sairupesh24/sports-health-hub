import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Play, Loader2, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function SportsScientistTemplates() {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [sessionTypeId, setSessionTypeId] = useState("");
    const [duration, setDuration] = useState(60);
    const [notes, setNotes] = useState("");

    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: ["session-templates", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("session_templates")
                .select("*, session_type:session_types(name)")
                .eq("scientist_id", user?.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    const { data: sessionTypes } = useQuery({
        queryKey: ["session-types", profile?.organization_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("session_types")
                .select("*")
                .eq("organization_id", profile?.organization_id);
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.organization_id
    });

    const createMutation = useMutation({
        mutationFn: async (newTemplate: any) => {
            const { data, error } = await supabase
                .from("session_templates")
                .insert([newTemplate])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session-templates"] });
            toast({ title: "Success", description: "Template created successfully" });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("session_templates")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session-templates"] });
            toast({ title: "Deleted", description: "Template removed" });
        }
    });

    const resetForm = () => {
        setName("");
        setDescription("");
        setSessionTypeId("");
        setDuration(60);
        setNotes("");
    };

    const handleCreate = () => {
        if (!name || !sessionTypeId) {
            toast({ title: "Error", description: "Name and Session Type are required", variant: "destructive" });
            return;
        }
        createMutation.mutate({
            organization_id: profile?.organization_id,
            scientist_id: user?.id,
            name,
            description,
            session_type_id: sessionTypeId,
            default_duration: duration,
            template_data: { notes }
        });
    };

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            <Layout className="w-8 h-8 text-primary" />
                            Session Templates
                        </h1>
                        <p className="text-muted-foreground mt-1">Design and reuse training blueprints</p>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl h-11 px-6 shadow-md gap-2">
                                <Plus className="w-5 h-5" /> Create Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>New Session Template</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Template Name</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Explosive Power Block" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="desc">Description (Optional)</Label>
                                    <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief summary of the session" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Session Type</Label>
                                        <Select value={sessionTypeId} onValueChange={setSessionTypeId}>
                                            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                                            <SelectContent>
                                                {sessionTypes?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Default Duration (min)</Label>
                                        <Input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Default Notes / Plan</Label>
                                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detailed session breakdown..." className="h-32" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Template
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {templatesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
                    </div>
                ) : !templates?.length ? (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-muted/5">
                        <Layout className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-bold text-muted-foreground">No templates yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">Create your first training blueprint to save time scheduling.</p>
                        <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create Template</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(template => (
                            <Card key={template.id} className="hover:shadow-lg transition-all border-border/50 group">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                                            <Layout className="w-5 h-5" />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                                                onClick={() => deleteMutation.mutate(template.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                    <CardDescription className="line-clamp-2">{template.description || "No description provided."}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                        <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                            {template.session_type?.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Play className="w-3 h-3" /> {template.default_duration}m
                                        </span>
                                    </div>
                                    <Button className="w-full mt-6 bg-muted hover:bg-primary/[0.08] text-foreground hover:text-primary border-none shadow-none rounded-xl text-xs font-bold uppercase tracking-wider">
                                        Use in Schedule
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
