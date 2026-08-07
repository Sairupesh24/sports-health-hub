import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PostNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function PostNoticeModal({ open, onOpenChange, onSuccess }: PostNoticeModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [targetRole, setTargetRole] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast({ title: "Title Required", description: "Please enter a notice title.", variant: "destructive" });
    if (!content.trim()) return toast({ title: "Content Required", description: "Please enter notice details.", variant: "destructive" });

    setLoading(true);
    try {
      await apiFetch('/admin/notifications', {
        method: 'POST',
        data: {
          title: title.trim(),
          content: content.trim(),
          priority,
          category: 'notice_board',
          type: 'notice_board',
          is_broadcast: targetRole === "all",
          target_role: targetRole !== "all" ? targetRole : null,
        }
      });

      toast({
        title: "Notice Published ✓",
        description: "The notice is now live on the Employee Notice Board.",
      });

      setTitle("");
      setContent("");
      setPriority("normal");
      setTargetRole("all");
      queryClient.invalidateQueries({ queryKey: ["global-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["staff-notifications-history"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Failed to Post Notice", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Megaphone className="w-5 h-5 text-primary" />
            Post Employee Notice
          </DialogTitle>
          <DialogDescription>
            Publish an announcement or official notice to the organization's Notice Board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Notice Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notice Title</label>
            <Input
              placeholder="e.g. Independence Day Holiday / Policy Update"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-11 rounded-xl font-bold"
            />
          </div>

          {/* Priority & Target Audience */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Notice</SelectItem>
                  <SelectItem value="high">Urgent / High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Audience</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="specialist">Sports Scientists</SelectItem>
                  <SelectItem value="consultant">Consultants & Physios</SelectItem>
                  <SelectItem value="client">Clients & Athletes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notice Details</label>
            <Textarea
              placeholder="Write the full announcement message here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[100px] rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 font-bold px-6">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish Notice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
