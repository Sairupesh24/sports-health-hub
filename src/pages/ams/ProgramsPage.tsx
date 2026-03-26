import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Calendar, 
  Users, 
  ArrowRight,
  Archive,
  Edit,
  Trash2,
  Copy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import ProgramAssignmentModal from "@/components/ams/ProgramAssignmentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  sport_tags: string[];
  created_at: string;
  coach_id: string;
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_programs' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching programs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProgram = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await (supabase
        .from('training_programs' as any)
        .insert({
          name: "New Training Program",
          description: "Click to edit description",
          coach_id: user.id,
          org_id: profile.organization_id,
          status: 'draft'
        } as any) as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Program created",
        description: "Redirecting to builder...",
      });

      navigate(`/ams/programs/${data.id}/builder`);
    } catch (error: any) {
      toast({
        title: "Error creating program",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openAssignModal = (program: any) => {
    setSelectedProgram(program);
    setIsAssignModalOpen(true);
  };

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="coach">
      <AmsStaffNav />
      
      <main className="container py-8 max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Training Programs</h1>
            <p className="text-muted-foreground mt-1">
              Design and manage training plans for your athletes.
            </p>
          </div>
          <Button onClick={createProgram} className="w-full md:w-auto gap-2 h-11 px-6 font-bold uppercase tracking-wider text-xs">
            <Plus className="w-4 h-4" /> Create New Program
          </Button>
        </div>

        {/* Filters/Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search programs..." 
              className="pl-10 h-11 glass border-none ring-1 ring-border/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 font-bold uppercase tracking-wider text-[10px] glass border-none ring-1 ring-border/50">
              Recent
            </Button>
            <Button variant="outline" className="h-11 font-bold uppercase tracking-wider text-[10px] glass border-none ring-1 ring-border/50">
              Active
            </Button>
          </div>
        </div>

        {/* Program Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse h-64 bg-muted/50 border-none" />
            ))}
          </div>
        ) : filteredPrograms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrograms.map((program) => (
              <Card key={program.id} className="group overflow-hidden glass border-none ring-1 ring-border/50 hover:ring-primary/40 transition-all duration-300">
                <CardHeader className="pb-3 px-6 pt-6">
                  <div className="flex justify-between items-start">
                    <Badge variant={program.status === 'active' ? 'default' : 'secondary'} className="mb-2 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md">
                      {program.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass border-none shadow-2xl w-48">
                        <DropdownMenuItem className="gap-2 cursor-pointer p-3 font-bold text-[11px] uppercase tracking-wider" onClick={() => navigate(`/ams/programs/${program.id}/builder`)}>
                          <Edit className="w-3.5 h-3.5" /> Edit Program
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer p-3 font-bold text-[11px] uppercase tracking-wider" onClick={() => openAssignModal(program)}>
                          <Users className="w-3.5 h-3.5" /> Assign to Athletes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer p-3 font-bold text-[11px] uppercase tracking-wider">
                          <Copy className="w-3.5 h-3.5" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem className="gap-2 cursor-pointer p-3 font-bold text-[11px] uppercase tracking-wider text-destructive focus:text-destructive focus:bg-destructive/5">
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{program.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2 leading-relaxed h-10">
                    {program.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 ">
                      <Calendar className="w-3.5 h-3.5" /> 12 Weeks
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> 24 Athletes
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-6 py-4 bg-muted/20 flex justify-between items-center group-hover:bg-primary/5 transition-colors border-t border-border/50">
                  <div className="flex -space-x-2 overflow-hidden">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-muted border border-border/10" />
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="h-8 gap-2 font-black uppercase tracking-tighter text-[11px] group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-lg px-3"
                    onClick={() => navigate(`/ams/programs/${program.id}/builder`)}
                  >
                    Open Builder <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-3xl border-2 border-dashed border-border/50">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-muted/20">
              <Plus className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No programs found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't created any training programs yet. Get started by clicking the button below.
            </p>
            <Button onClick={createProgram} className="gap-2 h-11 px-8 font-bold uppercase tracking-widest text-xs">
              <Plus className="w-4 h-4" /> Create First Program
            </Button>
          </div>
        )}
      </main>

      <ProgramAssignmentModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        program={selectedProgram}
        onSuccess={fetchPrograms}
      />
    </DashboardLayout>
  );
}
