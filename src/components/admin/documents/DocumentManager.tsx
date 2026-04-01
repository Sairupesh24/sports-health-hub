import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, FileImage, Plus, Search, Filter, Calendar, User, Eye, Download, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { AddDocumentModal } from "./AddDocumentModal";
import { DocumentViewer } from "./DocumentViewer";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface DocumentManagerProps {
  clientId: string;
  isVIP?: boolean;
}

const CATEGORIES = [
  "All",
  "Exercise Charts",
  "Scan Reports",
  "Insurance",
  "Consent Forms",
  "Prescriptions",
  "Other"
];

const CATEGORY_COLORS: Record<string, string> = {
  "Exercise Charts": "bg-blue-50 text-blue-700 border-blue-200",
  "Scan Reports": "bg-red-50 text-red-700 border-red-200",
  "Insurance": "bg-green-50 text-green-700 border-green-200",
  "Consent Forms": "bg-purple-50 text-purple-700 border-purple-200",
  "Prescriptions": "bg-amber-50 text-amber-700 border-amber-200",
  "Other": "bg-slate-50 text-slate-700 border-slate-200",
};

export function DocumentManager({ clientId, isVIP }: DocumentManagerProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ["patient-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredDocs = documents?.filter((doc) => {
    const matchesCategory = activeCategory === "All" || doc.category === activeCategory;
    const matchesSearch = doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (doc.notes?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // 1. Delete from storage
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // 2. Delete from database
      const { error: dbError } = await supabase
        .from("client_documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast({ title: "Document deleted successfully" });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed to delete document", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 transition-all ${
                activeCategory === cat ? "" : "hover:bg-muted"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Document
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename or notes..."
          className="pl-9 bg-muted/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !filteredDocs || filteredDocs.length === 0 ? (
        <Card className="border-dashed py-20 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-muted/20 rounded-full">
              <AlertCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">No documents found</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {activeCategory === "All" 
                  ? "No files have been uploaded for this patient yet."
                  : `No documents uploaded under the "${activeCategory}" category.`}
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card 
              key={doc.id} 
              className={`group hover:shadow-md transition-all border-l-4 ${
                isVIP ? "border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]" : "border-primary/20"
              }`}
            >
              <CardHeader className="pb-2 space-y-1">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${CATEGORY_COLORS[doc.category] || "bg-muted"}`}>
                    {doc.file_path.toLowerCase().endsWith('.pdf') ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setSelectedDoc(doc)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(doc.id, doc.file_path)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-sm font-bold truncate mt-2" title={doc.document_name}>
                  {doc.document_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] uppercase px-1.5 ${CATEGORY_COLORS[doc.category]}`}>
                    {doc.category}
                  </Badge>
                  {isVIP && <span className="text-[10px] font-black text-yellow-600">VIP</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {doc.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic italic-notes p-2 bg-muted/10 rounded min-h-[40px]">
                    "{doc.notes}"
                  </p>
                )}
                <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground border-t pt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(doc.created_at), "dd MMM yyyy, hh:mm a")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Uploaded by: <span className="font-semibold text-foreground">{doc.uploaded_by_role || "Staff"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddDocumentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        clientId={clientId}
        onSuccess={() => {
          setIsAddModalOpen(false);
          refetch();
        }}
      />

      <DocumentViewer
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </div>
  );
}
