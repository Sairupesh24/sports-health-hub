import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Shield, Palette } from "lucide-react";
import { plannerStore } from "@/services/plannerStore";
import { toast } from "@/hooks/use-toast";

interface NewTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated?: () => void;
  onTaskCreated?: () => void;
}

const COLOR_OPTIONS = [
  { label: "Purple / Fuchsia", value: "hsl(251 74% 60%)" },
  { label: "Emerald Green", value: "hsl(152 60% 42%)" },
  { label: "Ocean Blue", value: "hsl(210 72% 50%)" },
  { label: "Amber Orange", value: "hsl(32 95% 44%)" },
  { label: "Rose Pink", value: "hsl(340 75% 55%)" },
];

export default function NewTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
  onTaskCreated,
}: NewTeamDialogProps) {
  const members = plannerStore.getMembers();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("Clinical & Rehab");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [leadId, setLeadId] = useState(members[0]?.id || "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([members[0]?.id || ""]);

  const handleMemberToggle = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Team Name Required", description: "Please enter a team name.", variant: "destructive" });
      return;
    }

    const lead = members.find((m) => m.id === leadId);
    const generatedCode = (code || name.slice(0, 3)).toUpperCase();

    plannerStore.createTeam({
      name: name.trim(),
      code: generatedCode,
      department,
      description: description.trim(),
      color,
      lead_id: lead?.id,
      lead_name: lead?.name,
      member_ids: selectedMemberIds,
    });

    toast({
      title: "Team Formed Successfully",
      description: `Team "${name}" formed with ${selectedMemberIds.length} member(s).`,
    });

    setName("");
    setCode("");
    setDescription("");
    onOpenChange(false);
    const cb = onTeamCreated || onTaskCreated;
    if (cb) setTimeout(() => cb(), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border rounded-2xl shadow-xl p-4 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-fuchsia-600" />
              Form New Team
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Form a functional team, assign a team lead, and select members for task delegation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Team Name & Code */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Team Name *</Label>
                <Input
                  placeholder="e.g. Sports Performance Squad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Short Code</Label>
                <Input
                  placeholder="SPS"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="h-9 text-xs uppercase"
                />
              </div>
            </div>

            {/* Department & Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department</Label>
                <Input
                  placeholder="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  Badge Color
                </Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c.value }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Team Description</Label>
              <Textarea
                placeholder="Responsibilities, scope, and objectives of this team..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
              />
            </div>

            {/* Team Lead */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-fuchsia-600" />
                Team Lead / Manager
              </Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Lead" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Selection */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                  Select Team Members
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {selectedMemberIds.length} selected
                </span>
              </Label>
              <div className="max-h-40 overflow-y-auto rounded-xl border p-2 space-y-1.5 bg-slate-50/50">
                {members.map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleMemberToggle(m.id)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleMemberToggle(m.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{m.name}</p>
                          <p className="text-[11px] text-slate-500">{m.role} • {m.department}</p>
                        </div>
                      </div>
                      {m.id === leadId && (
                        <span className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-100 px-2 py-0.5 rounded-md">
                          LEAD
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold">
                Form Team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
