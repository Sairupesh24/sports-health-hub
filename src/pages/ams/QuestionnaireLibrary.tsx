import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Plus, 
  Users, 
  History, 
  Search, 
  LayoutGrid, 
  List,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Inbox
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import BulkAssignmentModal from "@/components/ams/BulkAssignmentModal";
import BulkStatusDashboard from "@/components/ams/BulkStatusDashboard";
import FormBuilder from "@/components/ams/FormBuilder";

export default function QuestionnaireLibrary() {
  const { profile, roles } = useAuth();
  const isClinical = roles.some(r => ["coach", "sports_scientist", "sports_physician", "physiotherapist", "nutritionist"].includes(r));
  const isAdminOrFoe = roles.some(r => ["admin", "foe"].includes(r));
  
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [editingForm, setEditingForm] = useState<any>(null);

  const { data: forms, isLoading: formsLoading, refetch: refetchForms } = useQuery({
    queryKey: ["ams-questionnaires", profile?.organization_id],
    queryFn: async () => {
      const orgId = profile?.organization_id;
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("questionnaires" as any)
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id
  });

  const { data: recentAssignments } = useQuery({
    queryKey: ["ams-bulk-assignments", profile?.organization_id],
    queryFn: async () => {
      const orgId = profile?.organization_id;
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("bulk_assignments" as any)
        .select(`
          *,
          questionnaire:questionnaires(name),
          specialist:profiles!specialist_id(full_name)
        `)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (error) throw error;
      return data;
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
    setSelectedForm(form);
    setAssignmentModalOpen(true);
  };

  const handleEditTemplate = (form: any) => {
    setEditingForm(form);
    setBuilderOpen(true);
  };

  const handleCreateNew = () => {
    setEditingForm(null);
    setBuilderOpen(true);
  };

  return (
    <DashboardLayout role={profile?.role || "coach"}>
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">

        
        <main className="flex-1 p-6 md:p-10 space-y-10 max-w-[1600px] mx-auto w-full">
          {/* Hero Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 italic">
                  Questionnaire <span className="text-primary">Library</span>
                </h1>
              </div>
              <p className="text-slate-600 font-black uppercase text-[11px] tracking-[0.2em] ml-1">
                Manage Squad-Wide Assessments & Clinical interpretation
              </p>
            </div>
            
            {isClinical && (
              <Button 
                onClick={handleCreateNew}
                className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Create New Form
              </Button>
            )}
          </div>

          <Tabs defaultValue="library" className="w-full">
            <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 custom-scrollbar">
              <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-200">
                <TabsTrigger value="library" className="rounded-xl px-6 py-2.5 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <LayoutGrid className="w-3.5 h-3.5" /> Library
                </TabsTrigger>
                <TabsTrigger value="status" className="rounded-xl px-6 py-2.5 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                  <TrendingUp className="w-3.5 h-3.5" /> Active Status
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="library" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Library Area */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 md:p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <Tabs value={filter} onValueChange={(val) => setFilter(val as any)} className="w-full md:w-auto">
                      <TabsList className="bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="all" className="rounded-lg px-6 font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white shadow-sm">All</TabsTrigger>
                        <TabsTrigger value="performance" className="rounded-lg px-6 font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary shadow-sm">Performance</TabsTrigger>
                        <TabsTrigger value="clinical" className="rounded-lg px-6 font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-rose-500 shadow-sm">Clinical</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="relative flex-1 group max-w-md">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Search forms..." 
                        className="border-none bg-slate-50 h-12 pl-16 rounded-xl text-slate-900 placeholder:text-slate-400 font-bold focus-visible:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {formsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  ) : filteredForms?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 mb-6 font-black italic">
                        ?
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">No forms found</h3>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Try adjusting your search or create a new one.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredForms?.map((form) => (
                        <Card key={form.id} className="group relative overflow-hidden border-slate-200 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5 rounded-[2.5rem] bg-white">
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                             <ClipboardList className="w-24 h-24 rotate-12" />
                          </div>
                          
                          <CardContent className="p-8">
                            <div className="flex justify-between items-start mb-6">
                              <Badge className={cn(
                                "rounded-full px-4 py-1 text-[8px] font-black uppercase tracking-[0.15em] border-none shadow-sm",
                                form.classification === 'clinical' 
                                  ? "bg-rose-50 text-rose-500 shadow-rose-500/5" 
                                  : "bg-blue-50 text-blue-500 shadow-blue-500/5"
                              )}>
                                {form.classification === 'clinical' ? "Clinical Assessment" : "Performance Protocol"}
                              </Badge>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic mb-2 leading-tight">
                              {form.name}
                            </h3>
                            
                            <div className="flex items-center gap-4 text-slate-500 font-black uppercase text-[9px] tracking-widest mb-8">
                               <div className="flex items-center gap-1.5">
                                 <Users className="w-3 h-3 text-primary" />
                                 {form.questions?.length || 0} Questions
                               </div>
                               <div className="flex items-center gap-1.5">
                                 <TrendingUp className="w-3 h-3 text-primary" />
                                 0% Response Rate
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Button 
                                onClick={() => handleAssign(form)}
                                className="h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all border-none"
                              >
                                <Users className="w-3.5 h-3.5" /> Assign
                              </Button>
                               {isClinical && (
                                <Button 
                                  variant="outline"
                                  onClick={() => handleEditTemplate(form)}
                                  className="h-12 rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50"
                                >
                                  Edit Template
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sidebar: Status & Analytics */}
                <div className="lg:col-span-4 space-y-8">
                  {/* Quick Progress Summary */}
                  <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                     <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl opacity-50" />
                     
                     <div className="relative z-10">
                       <div className="flex items-center gap-3 mb-6">
                         <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary" />
                         </div>
                         <span className="font-black uppercase tracking-widest text-[11px]">System Status</span>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6 mb-8">
                         <div>
                           <p className="text-white/40 font-black uppercase text-[9px] tracking-widest mb-1">Active Batch</p>
                           <p className="text-3xl font-black italic">{recentAssignments?.filter((a: any) => a.status === 'active').length || 0}</p>
                         </div>
                         <div>
                           <p className="text-white/40 font-black uppercase text-[9px] tracking-widest mb-1">Pending Responses</p>
                           <p className="text-3xl font-black italic text-primary">
                             {recentAssignments?.reduce((acc: number, curr: any) => acc + (curr.total_clients - curr.responded_count), 0) || 0}
                           </p>
                         </div>
                       </div>

                       <Button variant="outline" className="w-full h-14 rounded-2xl bg-white/5 border-white/10 text-white font-black uppercase tracking-widest text-[11px] gap-3 hover:bg-white/10 border-none">
                         View Full Dashboard <ArrowRight className="w-4 h-4" />
                       </Button>
                     </div>
                  </div>

                  {/* Recent Bulk Operations */}
                  <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="font-black uppercase tracking-widest text-slate-900 text-[12px] flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        Recent Operations
                      </h4>
                      <Badge className="bg-slate-50 text-slate-400 border-none rounded-lg px-2 py-0.5 text-[9px] font-black">LATEST 5</Badge>
                    </div>

                    <div className="space-y-6">
                      {recentAssignments && recentAssignments.length > 0 ? (
                        recentAssignments.map((assignment: any) => (
                          <div key={assignment.id} className="group relative">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors flex-shrink-0">
                                <Clock className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[11px] font-black text-slate-900 uppercase italic line-clamp-1">
                                  {assignment.questionnaire?.name || "Untitled Mass Assignment"}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {assignment.responded_count} / {assignment.total_clients} RESPONDED
                                  </p>
                                  <p className="text-[9px] font-black text-primary uppercase italic">
                                    {Math.round((assignment.responded_count / assignment.total_clients) * 100)}%
                                  </p>
                                </div>
                                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-1000" 
                                    style={{ width: `${(assignment.responded_count / assignment.total_clients) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-0">
              <div className="max-w-4xl">
                 <div className="mb-8">
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Batch Distribution Status</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Track responses and manage reminders for all active squads.</p>
                 </div>
                 <BulkStatusDashboard />
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {selectedForm && (
          <BulkAssignmentModal 
            isOpen={assignmentModalOpen}
            onClose={() => setAssignmentModalOpen(false)}
            onSuccess={() => {
              setAssignmentModalOpen(false);
              // Refresh query
            }}
            form={selectedForm}
          />
        )}

        <FormBuilder 
          isOpen={builderOpen}
          onClose={() => setBuilderOpen(false)}
          onSuccess={() => {
            setBuilderOpen(false);
            refetchForms();
          }}
          initialData={editingForm}
        />
      </div>
    </DashboardLayout>
  );
}
