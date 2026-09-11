import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Link as LinkIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, formatClientName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAthleteId?: string;
}

export function AddResourceModal({ isOpen, onClose, onSuccess, initialAthleteId }: Props) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [resourceType, setResourceType] = useState<"file" | "link">("file");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(initialAthleteId || null);

  useEffect(() => {
    if (isOpen && profile?.organization_id) {
      fetchClients();
    }
    if (isOpen) {
      setSelectedAthleteId(initialAthleteId || null);
    }
  }, [isOpen, profile?.organization_id, initialAthleteId]);

  const fetchClients = async () => {
    try {
        const data = await apiFetch<any[]>("/api/clients");
        if (data) setClients(data);
    } catch (e) {
        console.error("Failed to fetch clients", e);
    }
  };

  const handleSave = async () => {
    if (!title) {
        toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
        return;
    }

    if (resourceType === 'link' && !url) {
        toast({ title: "Validation Error", description: "URL is required for links", variant: "destructive" });
        return;
    }

    if (resourceType === 'file' && !file) {
        toast({ title: "Validation Error", description: "File is required", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        let finalUrl = url;

        // 1. Upload file if applicable
        if (resourceType === 'file' && file) {
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem('ishpo_token');
            const res = await fetch('/api/upload/single', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const { publicUrl } = await res.json();
            finalUrl = publicUrl;
        }

        // 2. Insert into DB
        await apiFetch("/api/ams/resources", {
            method: 'POST',
            body: JSON.stringify({
                athlete_id: category === 'athlete_document' ? selectedAthleteId : null,
                title,
                description,
                type: resourceType,
                category,
                url: finalUrl,
            })
        });

        toast({ title: "Resource added successfully" });
        resetForm();
        onSuccess();
    } catch (error: any) {
        console.error(error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("other");
    setResourceType("file");
    setUrl("");
    setFile(null);
    setSelectedAthleteId(initialAthleteId || null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        aria-describedby={undefined} 
        className="w-[95vw] sm:max-w-[520px] max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden bg-white rounded-[28px] sm:rounded-[32px]"
      >
        {/* Pinned Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Add New Resource</DialogTitle>
            <div className="h-1 w-12 bg-primary rounded-full mt-1.5" />
          </DialogHeader>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-5 space-y-4 overscroll-contain">
          <div className="grid gap-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</Label>
            <Input 
              placeholder="Enter resource title..." 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-11 sm:h-12 bg-slate-50 border-slate-200/70 rounded-2xl font-bold text-sm focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 sm:h-12 bg-slate-50 border-slate-200/70 rounded-2xl font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="athlete_document">Athlete File</SelectItem>
                  <SelectItem value="research">Research Article</SelectItem>
                  <SelectItem value="video">Video Link</SelectItem>
                  <SelectItem value="other">Other Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</Label>
              <Select value={resourceType} onValueChange={(v: any) => setResourceType(v)}>
                <SelectTrigger className="h-11 sm:h-12 bg-slate-50 border-slate-200/70 rounded-2xl font-bold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="file">File Upload</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {category === 'athlete_document' && (
            <div className="grid gap-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Associate Athlete</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!!initialAthleteId}
                    className={cn(
                      "w-full justify-between h-11 sm:h-12 bg-slate-50 border-slate-200/70 rounded-2xl font-bold text-sm", 
                      !selectedAthleteId && "text-slate-400"
                    )}
                  >
                    <span className="truncate">
                      {selectedAthleteId 
                        ? formatClientName(clients.find(c => c.id === selectedAthleteId))
                        : "Search athlete..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent disablePortal={true} className="w-[calc(100vw-48px)] sm:w-[400px] max-w-full p-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl z-50">
                  <Command>
                    <CommandInput placeholder="Search athlete by name or UHID..." className="h-11 sm:h-12" />
                    <CommandList>
                      <CommandEmpty>No athlete found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${formatClientName(c)} ${c.uhid}`}
                            onSelect={() => setSelectedAthleteId(c.id)}
                            className="h-11 sm:h-12"
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedAthleteId === c.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-bold">{formatClientName(c)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{c.uhid}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {resourceType === 'link' ? (
            <div className="grid gap-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="https://example.com/research" 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="h-11 sm:h-12 pl-11 bg-slate-50 border-slate-200/70 rounded-2xl font-bold text-sm focus-visible:ring-primary"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">File Attachment</Label>
              <div className="relative min-h-[96px] py-4 px-3 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer group text-center">
                <Input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors mb-1.5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 line-clamp-1 break-all">
                  {file ? file.name : "Click or drag file to upload"}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">PDF, DOC, images, or data sheets</span>
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description / Notes</Label>
            <Textarea 
              placeholder="Additional information about this resource..." 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="resize-y min-h-[80px] h-20 bg-slate-50 border-slate-200/70 rounded-2xl font-medium text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Pinned Footer with Always-Visible Action Buttons */}
        <div className="px-6 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xs shrink-0 flex items-center justify-end gap-3">
          <Button 
            type="button"
            variant="ghost" 
            onClick={onClose}
            disabled={loading}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSave} 
            disabled={loading} 
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-slate-900/10 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Resource"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
