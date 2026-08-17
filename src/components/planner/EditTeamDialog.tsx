import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, Shield, Palette, CheckCircle2, UserCheck, X } from "lucide-react";
import { TaskTeam } from "@/types/planner";
import { plannerStore } from "@/services/plannerStore";
import { toast } from "@/hooks/use-toast";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TaskTeam | null;
  onTeamUpdated?: () => void;
}

const COLOR_OPTIONS = [
  { label: "Purple / Fuchsia", value: "hsl(251 74% 60%)" },
  { label: "Emerald Green", value: "hsl(152 60% 42%)" },
  { label: "Ocean Blue", value: "hsl(210 72% 50%)" },
  { label: "Amber Orange", value: "hsl(32 95% 44%)" },
  { label: "Rose Pink", value: "hsl(340 75% 55%)" },
];

export default function EditTeamDialog({
  open,
  onOpenChange,
  team,
  onTeamUpdated,
}: EditTeamDialogProps) {
  const members = plannerStore.getMembers();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("Clinical & Rehab");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [leadId, setLeadId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (team && open) {
      setName(team.name || "");
      setCode(team.code || "");
      setDepartment(team.department || "Clinical & Rehab");
      setDescription(team.description || "");
      setColor(team.color || COLOR_OPTIONS[0].value);
      setLeadId(team.lead_id || (members[0]?.id || ""));
      setSelectedMemberIds(Array.isArray(team.member_ids) ? [...team.member_ids] : []);
    }
  }, [team, open]);

  if (!team) return null;

  const handleMemberToggle = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Team Name Required", description: "Please enter a team name.", variant: "destructive" });
      return;
    }

    if (selectedMemberIds.length === 0) {
      toast({ title: "At Least 1 Member Required", description: "Please select at least one staff member.", variant: "destructive" });
      return;
    }

    const lead = members.find((m) => m.id === leadId);
    const generatedCode = (code || name.slice(0, 3)).toUpperCase();

    plannerStore.updateTeam(team.id, {
      name: name.trim(),
      code: generatedCode,
      department,
      description: description.trim(),
      color,
      lead_id: lead?.id || leadId,
      lead_name: lead?.name || "Unassigned",
      member_ids: selectedMemberIds,
    });

    toast({
      title: "Team Updated",
      description: `Team "${name}" updated with ${selectedMemberIds.length} active member(s).`,
    });

    onOpenChange(false);
    if (onTeamUpdated) setTimeout(() => onTeamUpdated(), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && team && (
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white border border-purple-100 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-900">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                style={{ background: color }}
              >
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-[#1e295b]">
                  Edit Team
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Add or remove staff members and update squad responsibilities
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            
            {/* Team Name & Code */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Team Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Clinical & Rehab Team"
                  className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/60"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g., CRT"
                  maxLength={5}
                  className="h-10 text-xs uppercase font-extrabold rounded-xl border-purple-100 bg-slate-50/60"
                />
              </div>
            </div>

            {/* Department & Color */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clinical Medicine">Clinical Medicine</SelectItem>
                    <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                    <SelectItem value="Sports Science">Sports Science</SelectItem>
                    <SelectItem value="Clinical Nutrition">Clinical Nutrition</SelectItem>
                    <SelectItem value="Administration">Administration</SelectItem>
                    <SelectItem value="Performance Squad">Performance Squad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Accent Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/60">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-2xs" style={{ background: color }} />
                      <span className="truncate">{COLOR_OPTIONS.find((c) => c.value === color)?.label || "Color"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ background: c.value }} />
                          <span>{c.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Team Lead */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-fuchsia-600" />
                Team Lead / Manager
              </Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="h-10 text-xs rounded-xl border-purple-100 bg-slate-50/60">
                  <SelectValue placeholder="Select Team Lead" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-bold">{m.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({m.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Responsibilities / Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Team responsibilities and daily scope..."
                className="text-xs rounded-xl min-h-[60px] border-purple-100 bg-slate-50/60 resize-none"
              />
            </div>

            {/* Team Members Selection (Add / Remove Members) */}
            <div className="space-y-2 pt-1 border-t border-purple-100/70">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-fuchsia-600" />
                  Team Roster Members ({selectedMemberIds.length} / {members.length})
                </Label>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] font-bold text-fuchsia-700 hover:bg-fuchsia-50 px-2 rounded-lg"
                  onClick={handleSelectAll}
                >
                  {selectedMemberIds.length === members.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50/90 rounded-2xl border border-slate-200/70">
                {members.map((m) => {
                  const isChecked = selectedMemberIds.includes(m.id);
                  const isLead = m.id === leadId;

                  return (
                    <div
                      key={m.id}
                      onClick={() => handleMemberToggle(m.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        isChecked
                          ? "bg-purple-50/90 border border-purple-200/90 shadow-2xs"
                          : "bg-white border border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleMemberToggle(m.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md data-[state=checked]:bg-fuchsia-600"
                        />
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarFallback className="text-[9px] bg-fuchsia-600 text-white font-extrabold">
                            {m.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                            {isLead && (
                              <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                                LEAD
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{m.role}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isChecked ? "bg-fuchsia-100 text-fuchsia-800" : "text-slate-400"
                      }`}>
                        {isChecked ? "Member" : "Add"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs font-bold rounded-xl h-10 flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl h-10 px-5 flex-1 sm:flex-none shadow-xs gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Team Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
