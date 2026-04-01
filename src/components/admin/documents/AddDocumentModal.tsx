import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, X, FileText, FileImage, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  "Exercise Charts",
  "Scan Reports",
  "Insurance",
  "Consent Forms",
  "Prescriptions",
  "Other"
];

export function AddDocumentModal({ isOpen, onClose, clientId, onSuccess }: AddDocumentModalProps) {
  const { user, profile, roles } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("");
  const [notes, setNotes] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const clearFile = () => setFile(null);

  const handleUpload = async () => {
    if (!file || !category) {
      toast({ title: "Please select a file and category", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Identify Role/Profession for metadata
      const userRoleDisplay = profile?.profession || (roles.includes('admin') ? 'Administrator' : 'Medical Staff');

      // 3. Insert into Database
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          organization_id: profile?.organization_id,
          document_name: file.name,
          category: category as any,
          file_path: filePath,
          uploaded_by: user?.id,
          uploaded_by_role: userRoleDisplay,
          notes: notes.trim() || null,
          access_level: 'Medical_Staff_Only'
        });

      if (dbError) throw dbError;

      toast({ title: "Document uploaded successfully" });
      resetForm();
      onSuccess();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setCategory("");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Patient Document</DialogTitle>
          <DialogDescription>
            Attach medical reports, charts, or insurance files strictly for medical staff access.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Select File (PDF or Image)</Label>
            {!file ? (
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center hover:bg-muted/30 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Click to select file</span>
                  <span className="text-xs text-muted-foreground">PDF, JPG, PNG (Max 10MB)</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  {file.type === "application/pdf" ? <FileText className="w-5 h-5 text-primary" /> : <FileImage className="w-5 h-5 text-primary" />}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFile}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Document Category <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="Add relevant medical context or reminders..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !file || !category}
            className="gap-2"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
