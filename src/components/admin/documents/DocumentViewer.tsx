import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileText, FileImage, Download, Loader2, X, ExternalLink } from "lucide-react";

interface DocumentViewerProps {
  document: any | null;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localDoc, setLocalDoc] = useState<any>(null);

  // Keep a local copy of the document to prevent crashes during closing animations
  useEffect(() => {
    if (document) {
      setLocalDoc(document);
    }
  }, [document]);

  useEffect(() => {
    async function fetchSignedUrl() {
      if (!document) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(document.file_path, 3600); // 1 hour

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        toast({ title: "Failed to load document", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }

    if (document) {
      fetchSignedUrl();
    } else {
      setSignedUrl(null);
    }
  }, [document]);

  const isPDF = (document?.file_path || localDoc?.file_path)?.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={!!document} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                {isPDF ? <FileText className="w-5 h-5 text-primary" /> : <FileImage className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-sm font-bold truncate max-w-[400px]">
                  {document?.document_name || localDoc?.document_name}
                </DialogTitle>
                <div className="text-[10px] text-muted-foreground">
                  {document?.category || localDoc?.category} • {document?.uploaded_by_role || localDoc?.uploaded_by_role}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-8">
              {signedUrl && (
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5"
                >
                  <a href={signedUrl} download={document?.document_name || localDoc?.document_name} target="_blank">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-slate-900/5 overflow-auto flex items-center justify-center p-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Loading medical record...</span>
            </div>
          ) : signedUrl ? (
            isPDF ? (
              <iframe
                src={`${signedUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full min-h-[70vh] rounded-md shadow-lg bg-white border"
                title={document?.document_name || localDoc?.document_name}
              />
            ) : (
              <div className="relative group max-w-full">
                <img
                  src={signedUrl}
                  alt={document?.document_name || localDoc?.document_name}
                  className="max-w-full max-h-[75vh] object-contain rounded-md shadow-2xl border bg-white"
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button asChild variant="secondary" size="sm" className="h-8 shadow-md">
                      <a href={signedUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Full View
                      </a>
                   </Button>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-20 opacity-50">
               <AlertCircle className="w-12 h-12 text-muted-foreground" />
               <p className="text-sm">Unable to render document preview.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AlertCircle({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
