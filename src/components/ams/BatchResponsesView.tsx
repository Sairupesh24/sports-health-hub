import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Search,
  Eye,
  FileText,
  User,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ResponseReviewModal from "./ResponseReviewModal";

interface BatchResponsesViewProps {
  assignmentId: string;
  assignmentName: string;
}

export default function BatchResponsesView({ assignmentId, assignmentName }: BatchResponsesViewProps) {
  const { roles } = useAuth();
  const isClinical = roles.some(r => ["coach", "sports_scientist", "sports_physician", "physiotherapist", "nutritionist"].includes(r));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { data: responses, isLoading } = useQuery({
    queryKey: ["batch-responses", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_responses")
        .select(`
          *,
          client:profiles!client_id(full_name, uhid)
        `)
        .eq("bulk_assignment_id", assignmentId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data;
    }
  });

  const filteredResponses = responses?.filter((r: any) => 
    r.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.client?.uhid?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReview = (response: any) => {
    if (!isClinical) return;
    setSelectedResponse(response);
    setReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search clients by name or UHID..." 
            className="pl-11 h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-900 focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
            ))
          ) : filteredResponses?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No matching responses</p>
            </div>
          ) : (
            filteredResponses?.map((response: any) => (
              <div 
                key={response.id} 
                className={cn(
                  "p-5 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all group",
                  response.status === 'completed' ? "border-l-4 border-l-green-500" : "border-l-4 border-l-amber-500"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 uppercase italic tracking-tight leading-tight">
                        {response.client?.full_name}
                      </h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        UHID: {response.client?.uhid}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <Badge className={cn(
                        "rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]",
                        response.status === 'completed' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}>
                        {response.status}
                      </Badge>
                      {response.responded_at && (
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1.5 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                          {new Date(response.responded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {isClinical && response.status === 'completed' && (
                      <Button 
                        size="sm"
                        onClick={() => handleReview(response)}
                        className="h-10 rounded-xl bg-slate-900 hover:bg-primary text-white font-black uppercase tracking-widest text-[9px] gap-2 transition-all"
                      >
                        Review <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {selectedResponse && (
        <ResponseReviewModal 
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          response={selectedResponse}
          assignmentName={assignmentName}
        />
      )}
    </div>
  );
}
