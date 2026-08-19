import React, { useState } from "react";
import { updateChannel } from "@/services/messengerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Hash, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUserRole, getRoleBadgeStyle } from "./messengerUtils";
import type { Channel, OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  channel: Channel;
  users: OrgUser[];
  onClose: () => void;
  onUpdated: () => void;
}

const ChannelSettingsModal: React.FC<Props> = ({ channel, users, onClose, onUpdated }) => {
  const [tab, setTab] = useState<"settings" | "members">("settings");
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      await updateChannel(channel.id, { name: name.trim(), description: description.trim() });
      onUpdated();
    } catch (err: any) {
      setError(err?.message || "Failed to update channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{channel.name}</h2>
              <p className="text-xs text-slate-500 capitalize">{channel.channel_type} Channel</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-3">
          {[
            { id: "settings", label: "Settings", icon: Settings },
            { id: "members", label: "Team Members", icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2",
                tab === id
                  ? "border-teal-600 text-teal-800 bg-white shadow-2xs rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "settings" && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 text-xs font-semibold mb-1.5 block">Channel Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  className="h-9 bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs focus-visible:ring-teal-500/30"
                />
              </div>
              <div>
                <Label className="text-slate-700 text-xs font-semibold mb-1.5 block">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this channel about?"
                  className="h-9 bg-slate-50 border-slate-200 text-slate-900 rounded-xl text-xs focus-visible:ring-teal-500/30"
                />
              </div>

              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading} className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {users.map((user) => {
                const roleLabel = formatUserRole(user.role, user.profession);
                const roleStyle = getRoleBadgeStyle(user.role);

                return (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                    <Avatar className="h-8 w-8 ring-1 ring-slate-200">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-teal-600 text-white text-xs font-bold">
                        {user.first_name?.[0] || ""}{user.last_name?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      {user.email && <p className="text-[10px] text-slate-400 truncate">{user.email}</p>}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 py-0.2 rounded-md font-semibold border", roleStyle.bg, roleStyle.text, roleStyle.border)}
                    >
                      {roleLabel}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelSettingsModal;
