import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Play, Loader2, Layout, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AmsQuickBuilder from "@/components/ams/AmsQuickBuilder";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SportsScientistTemplates() {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: ["ams-templates", profile?.organization_id],
        queryFn: async () => {
            const orgId = profile?.organization_id;
            if (!orgId) return [];
            
            const { data, error } = await supabase
                .from("training_programs" as any)
                .select(`
                    *,
                    coach:profiles!coach_id(full_name),
                    days:workout_days(
                        *,
                        items:workout_items(
                            *,
                            lift_items(
                                *,
                                exercise:exercises(name)
                            )
                        )
                    )
                `)
                .eq("org_id", orgId)
                .eq("is_template", true)
                .order("created_at", { ascending: false });
                
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.organization_id
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("training_programs" as any)
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ams-templates"] });
            toast({ title: "Deleted", description: "Template removed" });
        }
    });

    const handleSaveTemplate = async (days: any[]) => {
        setIsSaving(true);
        try {
            const orgId = profile?.organization_id;
            if (!orgId) throw new Error("No organization ID found");

            let programId = editingTemplate?.id;

            if (editingTemplate) {
                // 1. Update Existing Template Program
                const { error: pError } = await supabase
                  .from('training_programs' as any)
                  .update({
                    name: days[0]?.title || editingTemplate.name,
                    updated_at: new Date().toISOString()
                  } as any)
                  .eq('id', editingTemplate.id);

                if (pError) throw pError;

                // 2. Delete old days (cascade deletes items)
                const { error: delError } = await supabase
                    .from('workout_days' as any)
                    .delete()
                    .eq('program_id', editingTemplate.id);
                
                if (delError) throw delError;
            } else {
                // 1. Create New Template Program
                const { data: programData, error: pError } = await (supabase
                  .from('training_programs' as any)
                  .insert({
                    name: days[0]?.title || `Workout Template - ${format(new Date(), 'MMM d')}`,
                    description: 'Pre-built workout template',
                    org_id: orgId,
                    coach_id: user?.id,
                    status: 'active',
                    is_template: true
                  } as any) as any)
                  .select()
                  .single();

                if (pError) throw pError;
                programId = programData.id;
            }

            // 3. Create Day and Items
            for (const day of days) {
                const { data: dayData, error: dError } = await (supabase
                  .from('workout_days' as any)
                  .insert({
                    program_id: programId,
                    org_id: orgId,
                    title: day.title || 'Untitled Workout',
                    display_order: days.indexOf(day)
                  } as any) as any)
                  .select()
                  .single();

                if (dError) throw dError;

                for (const item of day.items) {
                    const { data: itemData, error: iError } = await (supabase
                      .from('workout_items' as any)
                      .insert({
                        workout_day_id: dayData.id,
                        org_id: orgId,
                        item_type: 'lift',
                        display_order: day.items.indexOf(item)
                      } as any) as any)
                      .select()
                      .single();

                    if (iError) throw iError;

                    const { error: liftError } = await supabase
                      .from('lift_items' as any)
                      .insert({
                        id: itemData.id,
                        org_id: orgId,
                        exercise_id: item.exerciseId,
                        sets: item.sets,
                        reps: item.reps,
                        load_value: item.weight
                      } as any);

                    if (liftError) throw liftError;
                }
            }

            toast({ 
                title: editingTemplate ? "Template Updated" : "Success", 
                description: editingTemplate ? "Template changes saved" : "Template saved successfully" 
            });
            setIsCreateOpen(false);
            setEditingTemplate(null);
            queryClient.invalidateQueries({ queryKey: ["ams-templates"] });
        } catch (error: any) {
            toast({ title: "Error saving template", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditClick = (template: any) => {
        setEditingTemplate(template);
        setIsCreateOpen(true);
    };

    const mappedInitialDays = editingTemplate ? (editingTemplate as any).days.map((day: any) => ({
        id: day.id,
        title: day.title,
        date: new Date().toISOString().split('T')[0],
        items: day.items.map((item: any) => ({
            id: item.id,
            exerciseId: item.lift_items?.exercise_id,
            exerciseName: item.lift_items?.exercise?.name || 'Unknown',
            type: item.item_type,
            sets: item.lift_items?.sets || 3,
            reps: item.lift_items?.reps || '10',
            weight: item.lift_items?.load_value || 0
        }))
    })) : undefined;

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            <Layout className="w-8 h-8 text-primary" />
                            Workout Templates
                        </h1>
                        <p className="text-muted-foreground mt-1">Design and reuse single-day training blueprints</p>
                    </div>
                    
                    <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl h-11 px-6 shadow-md gap-2">
                        <Plus className="w-5 h-5" /> Create Template
                    </Button>
                </div>

                {templatesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
                    </div>
                ) : !templates?.length ? (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-muted/5">
                        <Layout className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-bold text-muted-foreground">No templates yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">Create your first training blueprint to save time assigning workouts.</p>
                        <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create Template</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map(template => {
                            const firstDay = (template as any).days?.[0];
                            const exerciseCount = firstDay?.items?.length || 0;
                            const firstExercises = firstDay?.items?.slice(0, 3) || [];

                            return (
                                <Card key={(template as any).id} className="hover:shadow-lg transition-all border-border/50 group bg-white">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                                                <Dumbbell className="w-5 h-5" />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className={cn(
                                                        "h-8 w-8 transition-colors",
                                                        expandedTemplateId === (template as any).id ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedTemplateId(expandedTemplateId === (template as any).id ? null : (template as any).id);
                                                    }}
                                                >
                                                    {expandedTemplateId === (template as any).id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(template); }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                                                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate((template as any).id); }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg">{(template as any).name}</CardTitle>
                                        <CardDescription className="line-clamp-2">{exerciseCount} exercises included</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4 mt-2">
                                            {expandedTemplateId === (template as any).id ? (
                                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                    {/* Expanded Exercise List */}
                                                    <div className="space-y-2 border-l-2 border-primary/20 pl-4">
                                                        {(template as any).days?.[0]?.items?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-muted/30 last:border-0">
                                                                <span className="font-bold text-slate-800 italic uppercase">
                                                                    {item.lift_items?.exercise?.name || 'Unknown'}
                                                                </span>
                                                                <span className="text-primary font-black italic">
                                                                    {item.lift_items?.sets}x{item.lift_items?.reps} {item.lift_items?.load_value > 0 ? `@${item.lift_items?.load_value}KG` : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Metadata Section */}
                                                    <div className="pt-4 mt-4 border-t border-muted grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                                <User className="w-3 h-3" /> Created By
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700 truncate">
                                                                {(template as any).coach?.full_name || 'Staff Member'}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1 text-right">
                                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest justify-end">
                                                                <History className="w-3 h-3" /> Updated
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700">
                                                                {format(new Date((template as any).updated_at || (template as any).created_at), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {firstExercises.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs">
                                                            <span className="font-medium text-slate-700 truncate pr-2">
                                                                {item.lift_items?.exercise?.name || 'Unknown'}
                                                            </span>
                                                            <span className="text-slate-400 whitespace-nowrap">
                                                                {item.lift_items?.sets}x{item.lift_items?.reps} {item.lift_items?.load_value > 0 ? `@${item.lift_items?.load_value}kg` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {exerciseCount > 3 && (
                                                        <div className="text-xs text-slate-400 italic pt-1">
                                                            +{exerciseCount - 3} more exercises
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) setEditingTemplate(null);
                }}>
                    <DialogContent className="max-w-4xl p-6 bg-[#1A1F26] border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4">
                            <h2 className="text-xl font-black uppercase italic tracking-tight text-white mb-2">
                                {(editingTemplate as any) ? "Edit Training Template" : "Build Training Template"}
                            </h2>
                            <p className="text-sm text-white/40">
                                {(editingTemplate as any) ? "Modify this template's exercises and structure." : "Add your exercises to construct a reusable workout template."}
                            </p>
                        </div>
                        <AmsQuickBuilder 
                            startDate={new Date().toISOString().split('T')[0]} 
                            onSave={handleSaveTemplate}
                            onCancel={() => {
                                setIsCreateOpen(false);
                                setEditingTemplate(null);
                            }}
                            loading={isSaving}
                            templateMode={true}
                            initialDays={mappedInitialDays}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
