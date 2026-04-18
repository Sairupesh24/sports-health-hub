import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Link as LinkIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, uhid")
      .eq("organization_id", profile?.organization_id)
      .is("deleted_at", null)
      .order("last_name", { ascending: true });
    if (data) setClients(data);
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `resources/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("scientist-resources")
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            finalUrl = filePath;
        }

        // 2. Insert into DB
        const { error: dbError } = await (supabase
            .from("scientist_resources") as any)
            .insert({
                organization_id: profile!.organization_id,
                uploaded_by: user!.id,
                athlete_id: category === 'athlete_document' ? selectedAthleteId : null,
                title,
                description,
                resource_type: resourceType,
                category,
                url: finalUrl,
            });

        if (dbError) throw dbError;

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
      <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 border-none shadow-2xl overflow-hidden bg-white">
        <ScrollArea className="max-h-[85vh] p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Add New Resource</DialogTitle>
            <div className="h-1 w-12 bg-primary rounded-full mt-2" />
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</Label>
              <Input 
                placeholder="Enter resource title..." 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athlete_document">Athlete File</SelectItem>
                    <SelectItem value="research">Research Article</SelectItem>
                    <SelectItem value="video">Video Link</SelectItem>
                    <SelectItem value="other">Other Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</Label>
                <Select value={resourceType} onValueChange={(v: any) => setResourceType(v)}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">File Upload</SelectItem>
                    <SelectItem value="link">External Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {category === 'athlete_document' && (
              <div className="grid gap-2 animate-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Associate Athlete</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={!!initialAthleteId}
                      className={cn("w-full justify-between h-12 bg-slate-50 border-slate-100 rounded-2xl font-bold", !selectedAthleteId && "text-slate-400")}
                    >
                      {selectedAthleteId 
                          ? clients.find(c => c.id === selectedAthleteId)?.first_name + " " + clients.find(c => c.id === selectedAthleteId)?.last_name
                          : "Search athlete..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 rounded-2xl overflow-hidden border-none shadow-2xl">
                    <Command>
                      <CommandInput placeholder="Search athlete by name or UHID..." className="h-12" />
                      <CommandList>
                        <CommandEmpty>No athlete found.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.first_name} ${c.last_name} ${c.uhid}`}
                              onSelect={() => setSelectedAthleteId(c.id)}
                              className="h-12"
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedAthleteId === c.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-bold">{c.first_name} {c.last_name}</span>
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
              <div className="grid gap-2 animate-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="https://example.com/research" 
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="h-12 pl-11 bg-slate-50 border-slate-100 rounded-2xl font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2 animate-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">File Attachment</Label>
                <div className="relative h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <Input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {file ? file.name : "Click or drag file to upload"}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description / Notes</Label>
              <Textarea 
                placeholder="Additional information about this resource..." 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="resize-none h-24 bg-slate-50 border-slate-100 rounded-2xl font-bold text-xs"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={loading} 
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/10 mt-4 mb-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Resource"}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
