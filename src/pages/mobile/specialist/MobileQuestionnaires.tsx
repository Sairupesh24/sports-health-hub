import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  ClipboardList, 
  Plus, 
  Search, 
  TrendingUp, 
  Clock, 
  Users,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import BulkAssignmentModal from "@/components/ams/BulkAssignmentModal";
import BulkStatusDashboard from "@/components/ams/BulkStatusDashboard";
import FormBuilder from "@/components/ams/FormBuilder";

export default function MobileQuestionnaires() {
  const { profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [editingForm, setEditingForm] = useState<any>(null);

  const isClinical = roles?.some(r => ["coach", "sports_scientist", "sports_physician", "physiotherapist", "nutritionist"].includes(r));

  // Fetch Forms
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ["mobile-ams-questionnaires", profile?.organization_id],
    queryFn: async () => {
      const orgId = profile?.organization_id;
      if (!orgId) return [];
      const { data } = await supabase
        .from("questionnaires" as any)
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.organization_id
  });

  const [filter, setFilter] = useState<'all' | 'performance' | 'clinical'>("all");

  const filteredForms = forms?.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || f.classification === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAssign = (form: any) => {
    haptic.light();
    setSelectedForm(form);
    setAssignmentModalOpen(true);
  };

  const handleCreateNew = () => {
    haptic.success();
    setEditingForm(null);
    setBuilderOpen(true);
  };

  return (
    <MobileSpecialistLayout title="Questionnaires">
      <div className="space-y-6 pb-24">
        
        <Tabs defaultValue="library" className="w-full">
          {/* Sticky Header for Tabs */}
          <div className="sticky top-[-24px] z-30 -mx-6 px-6 py-4 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-border/30">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-1 h-14 shadow-sm">
              <TabsTrigger value="library" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 shadow-none border-none">
                Library
              </TabsTrigger>
              <TabsTrigger value="status" className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 shadow-none border-none">
                Live Status
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="library" className="space-y-6 mt-6">
            {/* Filters & Search */}
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                 {[
                   { id: 'all', label: 'All', icon: Filter },
                   { id: 'performance', label: 'Performance', icon: TrendingUp },
                   { id: 'clinical', label: 'Clinical', icon: ClipboardList },
                 ].map((item) => (
                   <button
                     key={item.id}
                     onClick={() => { haptic.impact('light'); setFilter(item.id as any); }}
                     className={cn(
                       "flex items-center gap-2 px-6 h-11 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
                       filter === item.id 
                         ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10" 
                         : "bg-white border-slate-100 text-slate-400"
                     )}
                   >
                      <item.icon className="w-3 h-3" />
                      {item.label}
                   </button>
                 ))}
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search forms..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-11 rounded-2xl bg-white dark:bg-slate-900 border-border/50 font-bold"
                  />
                </div>
                {isClinical && (
                  <Button 
                    onClick={handleCreateNew}
                    className="h-12 w-12 rounded-2xl bg-primary text-white p-0 shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                )}
              </div>
            </div>

            {/* Forms List */}
            <div className="grid grid-cols-1 gap-4">
              {formsLoading ? (
                [1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-[2rem] animate-pulse" />)
              ) : filteredForms?.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                   <ClipboardList className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest">No forms found</p>
                </div>
              ) : (
                filteredForms?.map((form) => (
                  <Card key={form.id} className="bg-white dark:bg-slate-900 border-border/50 rounded-[2rem] overflow-hidden shadow-sm active:scale-[0.98] transition-all">
                     <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex-1 min-w-0">
                              <Badge className={cn(
                                "mb-2 rounded-full px-3 py-0.5 text-[7px] font-black uppercase tracking-widest border-none",
                                form.classification === 'clinical' ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                              )}>
                                {form.classification === 'clinical' ? "Clinical" : "Performance"}
                              </Badge>
                              <h3 className="text-lg font-black text-slate-900 dark:text-white italic truncate leading-tight">
                                {form.name}
                              </h3>
                           </div>
                           <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-400 border-none text-[9px] font-black uppercase flex-shrink-0 ml-2">
                             {form.questions?.length || 0} Qs
                           </Badge>
                        </div>
                       
                       <div className="flex gap-2">
                          <Button 
                            onClick={() => handleAssign(form)}
                            className="flex-1 h-11 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] gap-2"
                          >
                             <Users className="w-3.5 h-3.5" /> Assign
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => { haptic.light(); setEditingForm(form); setBuilderOpen(true); }}
                            className="h-11 px-4 rounded-xl border-border/50 text-[10px] font-black uppercase tracking-widest"
                          >
                             Edit
                          </Button>
                       </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-6">
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-border/50 p-4">
                <BulkStatusDashboard />
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedForm && (
        <BulkAssignmentModal 
          isOpen={assignmentModalOpen}
          onClose={() => setAssignmentModalOpen(false)}
          onSuccess={() => {
            haptic.success();
            setAssignmentModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["mobile-ams-bulk-assignments"] });
          }}
          form={selectedForm}
        />
      )}

      <FormBuilder 
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSuccess={() => {
          haptic.success();
          setBuilderOpen(false);
          queryClient.invalidateQueries({ queryKey: ["mobile-ams-questionnaires"] });
        }}
        initialData={editingForm}
      />
    </MobileSpecialistLayout>
  );
}
