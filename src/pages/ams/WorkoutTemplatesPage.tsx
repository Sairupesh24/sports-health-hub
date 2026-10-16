import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Layout, 
  Dumbbell, 
  ChevronDown, 
  ChevronUp, 
  History, 
  User, 
  Search, 
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AmsQuickBuilder from "@/components/ams/AmsQuickBuilder";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function WorkoutTemplatesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["ams-templates", profile?.organization_id],
    queryFn: async () => {
      const orgId = profile?.organization_id;
      if (!orgId) return [];
      return await apiFetch<any[]>('/api/ams/templates');
    },
    enabled: !!profile?.organization_id
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<void>(`/api/ams/templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ams-templates"] });
      toast({ title: "Template Deleted", description: "The template has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  });

  const handleSaveTemplate = async (days: any[]) => {
    setIsSaving(true);
    try {
      const orgId = profile?.organization_id;
      if (!orgId) throw new Error("No organization ID found");

      if (editingTemplate) {
        await apiFetch<void>(`/api/ams/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({ days, name: days[0]?.title || editingTemplate.name })
        });
      } else {
        await apiFetch<{ id: string }>('/api/ams/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: days[0]?.title || `Workout Template - ${format(new Date(), 'MMM d')}`,
            days
          })
        });
      }

      toast({ 
        title: editingTemplate ? "Template Updated" : "Template Created", 
        description: editingTemplate ? "Your modifications have been saved." : "New workout template ready for assignment." 
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

  const filteredTemplates = templates.filter((template: any) => {
    if (!searchQuery.trim()) return true;
    const nameMatch = template.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const exercisesMatch = template.days?.[0]?.items?.some((i: any) => 
      i.lift_items?.exercise?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return nameMatch || exercisesMatch;
  });

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
      weight: item.lift_items?.load_value || 0,
      tempo: item.lift_items?.tempo || '0-0-0-0',
      rest_time_secs: item.lift_items?.rest_time_secs || 60,
      workout_grouping: item.lift_items?.workout_grouping || '',
      each_side: item.lift_items?.each_side || false,
      additional_info: item.lift_items?.additional_info || ''
    }))
  })) : undefined;

  return (
    <DashboardLayout role="coach">
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
        <AmsStaffNav />
        <main className="flex-1 p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto w-full">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                  <Layout className="w-5 h-5" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 font-display">
                  Workout <span className="text-primary">Templates</span>
                </h1>
              </div>
              <p className="text-slate-500 font-bold uppercase text-[10px] sm:text-[11px] tracking-widest ml-1">
                Activity Monitoring System • Reusable Training Blueprints
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-slate-200 rounded-xl h-11 text-xs font-semibold shadow-xs"
                />
              </div>
              <Button 
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreateOpen(true);
                }} 
                className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider text-xs gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] shrink-0"
              >
                <Plus className="w-4 h-4" /> Create Template
              </Button>
            </div>
          </div>

          {/* Quick Stats or Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{templates.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Available Blueprints</p>
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">
                  {templates.reduce((acc: number, t: any) => acc + (t.days?.[0]?.items?.length || 0), 0)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Template Exercises</p>
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">Squad Ready</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">One-Click Calendar Assignment</p>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white p-8 max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <Layout className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {searchQuery ? "No templates match your search" : "No Workout Templates Yet"}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 mb-6 max-w-sm mx-auto">
                {searchQuery 
                  ? "Try adjusting your search keywords to find the desired training blueprint." 
                  : "Create your first single-day training blueprint to quickly reuse and assign workouts."}
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery("");
                  setIsCreateOpen(true);
                }} 
                className="rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 mr-1.5" /> {searchQuery ? "Clear Search & New Template" : "Create First Template"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => {
                const firstDay = (template as any).days?.[0];
                const exerciseCount = firstDay?.items?.length || 0;
                const firstExercises = firstDay?.items?.slice(0, 3) || [];
                const isExpanded = expandedTemplateId === (template as any).id;

                return (
                  <Card key={(template as any).id} className="hover:shadow-md transition-all border-slate-200 group bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex justify-between items-start gap-2">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                          <Dumbbell className="w-5 h-5" />
                        </div>
                        <div className="flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                              "h-8 w-8 rounded-lg transition-colors",
                              isExpanded ? "text-primary bg-primary/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTemplateId(isExpanded ? null : (template as any).id);
                            }}
                            title={isExpanded ? "Collapse Exercises" : "Expand All Exercises"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={(e) => { e.stopPropagation(); handleEditClick(template); }}
                            title="Edit Template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (confirm(`Are you sure you want to delete "${(template as any).name}"?`)) {
                                deleteMutation.mutate((template as any).id); 
                              }
                            }}
                            title="Delete Template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-base font-black tracking-tight text-slate-900 mt-2 truncate">
                        {(template as any).name}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold text-slate-500">
                        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'} configured
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        {isExpanded ? (
                          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1.5 border-l-2 border-primary/30 pl-3">
                              {(template as any).days?.[0]?.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-0">
                                  <span className="font-bold text-slate-800 truncate pr-2">
                                    {item.lift_items?.exercise?.name || 'Unknown Exercise'}
                                  </span>
                                  <span className="text-primary font-black whitespace-nowrap text-[11px]">
                                    {item.lift_items?.sets}x{item.lift_items?.reps} {item.lift_items?.load_value > 0 ? `@${item.lift_items?.load_value}kg` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                  <User className="w-3 h-3" /> Author
                                </div>
                                <p className="text-xs font-bold text-slate-700 truncate">
                                  {(template as any).coach?.full_name || 'Staff Coach'}
                                </p>
                              </div>
                              <div className="space-y-0.5 text-right">
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-wider justify-end">
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
                                <span className="font-semibold text-slate-700 truncate pr-2">
                                  {item.lift_items?.exercise?.name || 'Unknown Exercise'}
                                </span>
                                <span className="text-slate-400 whitespace-nowrap font-medium text-[11px]">
                                  {item.lift_items?.sets}x{item.lift_items?.reps} {item.lift_items?.load_value > 0 ? `@${item.lift_items?.load_value}kg` : ''}
                                </span>
                              </div>
                            ))}
                            {exerciseCount > 3 && (
                              <button 
                                onClick={() => setExpandedTemplateId((template as any).id)}
                                className="text-xs font-bold text-primary hover:underline pt-1 text-left"
                              >
                                +{exerciseCount - 3} more exercises (view all)
                              </button>
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

          {/* Builder Modal */}
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setEditingTemplate(null);
          }}>
            <DialogContent className="w-[95vw] max-w-4xl p-6 bg-[#1A1F26] border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
              <div className="mb-4">
                <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-white mb-1">
                  {(editingTemplate as any) ? "Edit Workout Template" : "Build Workout Template"}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  {(editingTemplate as any) ? "Modify this blueprint's exercises and target parameters." : "Add exercises and set target rep/set/load parameters to build a reusable template."}
                </DialogDescription>
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
        </main>
      </div>
    </DashboardLayout>
  );
}
