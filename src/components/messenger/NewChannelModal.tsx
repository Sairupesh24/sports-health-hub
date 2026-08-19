import React, { useState } from "react";
import { createChannel } from "@/services/messengerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Hash, Lock, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUserRole, getRoleBadgeStyle } from "./messengerUtils";

interface OrgUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role?: string;
  profession?: string;
  email?: string;
}

interface Props {
  users: OrgUser[];
  onClose: () => void;
  onCreated: () => void;
}

const NewChannelModal: React.FC<Props> = ({ users, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channelType, setChannelType] = useState<"public" | "private">("public");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchMember, setSearchMember] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredMembers = users.filter((u) => {
    const term = searchMember.toLowerCase().trim();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const role = (u.role || "").toLowerCase();
    const profession = (u.profession || "").toLowerCase();
    return fullName.includes(term) || role.includes(term) || profession.includes(term);
  });

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createChannel({
        name: name.trim(),
        description: description.trim(),
        channel_type: channelType,
        member_ids: selectedMemberIds,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Channel / Group</h2>
              <p className="text-xs text-slate-500">Collaborate with your team on a specific topic</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Channel Type Selector */}
          <div className="flex gap-2">
            {(["public", "private"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setChannelType(type)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-xs font-bold transition-all",
                  channelType === type
                    ? "bg-teal-50 border-teal-300 text-teal-800 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                {type === "public" ? <Hash className="h-3.5 w-3.5 text-teal-600" /> : <Lock className="h-3.5 w-3.5 text-purple-600" />}
                <span>{type === "public" ? "Public (All Team Members)" : "Private (Invite-Only)"}</span>
              </button>
            ))}
          </div>

          {/* Name Field */}
          <div>
            <Label className="text-slate-700 text-xs font-semibold mb-1.5 block">Channel Name</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {channelType === "public" ? <Hash className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              </span>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  setError("");
                }}
                placeholder="e.g. medical-case-reviews, physiocare, coaches"
                className="pl-8 h-9 bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs focus-visible:ring-teal-500/30 focus-visible:border-teal-500"
              />
            </div>
          </div>

          {/* Description Field */}
          <div>
            <Label className="text-slate-700 text-xs font-semibold mb-1.5 block">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel or group about?"
              className="h-9 bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs focus-visible:ring-teal-500/30 focus-visible:border-teal-500"
            />
          </div>

          {/* Add Members Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-teal-600" />
                Add Members from Organization
              </Label>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedMemberIds.length} selected
              </span>
            </div>

            <Input
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Filter members by name or role..."
              className="h-8 bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs mb-2 focus-visible:ring-teal-500/30"
            />

            <div className="max-h-36 overflow-y-auto space-y-1 rounded-2xl border border-slate-200 p-1.5 bg-slate-50/50">
              {filteredMembers.map((user) => {
                const isSelected = selectedMemberIds.includes(user.id);
                const roleLabel = formatUserRole(user.role, user.profession);
                const roleStyle = getRoleBadgeStyle(user.role);

                return (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all",
                      isSelected ? "bg-teal-50 border border-teal-200" : "hover:bg-white"
                    )}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleMember(user.id)} />
                    <Avatar className="h-6 w-6 ring-1 ring-slate-200">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-[10px] font-bold bg-teal-600 text-white">
                        {user.first_name?.[0] || ""}{user.last_name?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-slate-900 truncate flex-1">
                      {user.first_name} {user.last_name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 py-0 rounded-md font-semibold border", roleStyle.bg, roleStyle.text, roleStyle.border)}
                    >
                      {roleLabel}
                    </Badge>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No members found</p>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
            >
              {loading ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChannelModal;
