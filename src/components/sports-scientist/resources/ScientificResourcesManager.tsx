import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileStack, Plus, Search, Filter, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AddResourceModal } from "./AddResourceModal";
import { ResourceCard } from "./ResourceCard";

interface ScientificResourcesManagerProps {
  athleteId?: string; // Optional: If provided, filter by this athlete and show "Athlete Profile" mode
}

const CATEGORIES = [
  { id: "all", label: "All Resources" },
  { id: "athlete_document", label: "Athlete Files" },
  { id: "research", label: "Research Articles" },
  { id: "video", label: "Video Links" },
  { id: "other", label: "Other Reference" }
];

export function ScientificResourcesManager({ athleteId }: ScientificResourcesManagerProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: resources, isLoading, refetch } = useQuery({
    queryKey: ["scientist-resources", athleteId, activeCategory],
    queryFn: async () => {
      let query = supabase
        .from("scientist_resources")
        .select(`
          *,
          athlete:clients(first_name, last_name, uhid)
        `)
        .order("created_at", { ascending: false });

      if (athleteId) {
        query = query.eq("athlete_id", athleteId);
      }

      if (activeCategory !== "all") {
        query = query.eq("category", activeCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredResources = resources?.filter((res) => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (res.description?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                         (res.athlete?.first_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                         (res.athlete?.last_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDelete = async (id: string, filePath?: string, resourceType?: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      // 1. If it's a file, delete from storage first
      if (resourceType === 'file' && filePath) {
        const { error: storageError } = await supabase.storage
          .from("scientist-resources")
          .remove([filePath]);
        if (storageError) throw storageError;
      }

      // 2. Delete from database
      const { error: dbError } = await (supabase
        .from("scientist_resources") as any)
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast({ title: "Resource deleted successfully" });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed to delete resource", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              className={`cursor-pointer px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                activeCategory === cat.id ? "bg-primary shadow-lg shadow-primary/20" : "hover:bg-primary/5 text-slate-500"
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest h-11 px-6 rounded-xl shadow-lg shadow-slate-900/10">
          <Plus className="w-4 h-4" /> Add Resource
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search research titles, athlete names, or descriptions..."
          className="pl-11 h-12 bg-white border-slate-200 rounded-[18px] text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing scientist library...</p>
        </div>
      ) : !filteredResources || filteredResources.length === 0 ? (
        <Card className="border-dashed border-2 py-24 bg-slate-50/50 rounded-[32px]">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
              <FileStack className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-lg text-slate-900">Library Empty</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight max-w-xs">
                {searchQuery 
                  ? "No matches found for your current search criteria."
                  : "Start building your scientific repository by adding research, videos, or athlete docs."}
              </p>
            </div>
            <Button variant="outline" className="mt-4 rounded-xl border-slate-200 font-bold" onClick={() => setIsAddModalOpen(true)}>
              Upload First Resource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <ResourceCard 
              key={res.id} 
              resource={res} 
              onDelete={() => handleDelete(res.id, res.url, res.resource_type)}
            />
          ))}
        </div>
      )}

      <AddResourceModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        initialAthleteId={athleteId}
        onSuccess={() => {
          setIsAddModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
