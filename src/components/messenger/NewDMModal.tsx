import React, { useState } from "react";
import { startDM } from "@/services/messengerService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, MessageSquare, UserCheck } from "lucide-react";
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
  onCreated: (thread: unknown) => void;
}

const NewDMModal: React.FC<Props> = ({ users, onClose, onCreated }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrgUser | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = users.filter((u) => {
    const term = search.toLowerCase().trim();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const role = (u.role || "").toLowerCase();
    const profession = (u.profession || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return fullName.includes(term) || role.includes(term) || profession.includes(term) || email.includes(term);
  });

  const handleStart = async (targetUser?: OrgUser) => {
    const userToStart = (targetUser && typeof targetUser === "object" && "id" in targetUser && typeof targetUser.id === "string")
      ? targetUser
      : selected;
    if (!userToStart || !userToStart.id) return;
    setLoading(true);
    try {
      const res = await startDM(userToStart.id);
      const threadId = res?.dm_thread?.id || (res as any)?.id;
      if (threadId) {
        onCreated({
          id: threadId,
          other_user_id: userToStart.id,
          other_first_name: userToStart.first_name,
          other_last_name: userToStart.last_name,
          other_avatar_url: userToStart.avatar_url,
          other_role: userToStart.role,
          other_profession: userToStart.profession,
        });
      }
    } catch (err) {
      console.error("Failed to start DM:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Direct Message</h2>
              <p className="text-xs text-slate-500">Select any organization member to start chatting</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or profession..."
            autoFocus
            className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs rounded-xl focus-visible:ring-teal-500/30 focus-visible:border-teal-500"
          />
        </div>

        {/* User List with Role Badges */}
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {filtered.map((user) => {
            const roleLabel = formatUserRole(user.role, user.profession);
            const roleStyle = getRoleBadgeStyle(user.role);
            const isSelected = selected?.id === user.id;

            return (
              <button
                key={user.id}
                onClick={() => setSelected(user)}
                onDoubleClick={() => handleStart(user)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-2.5 transition-all text-left border",
                  isSelected
                    ? "bg-teal-50/80 border-teal-300 shadow-xs"
                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200/80"
                )}
              >
                <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-slate-100">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-teal-600 to-emerald-600 text-white text-xs font-bold">
                    {user.first_name?.[0] || ""}{user.last_name?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0.2 rounded-md font-semibold border",
                        roleStyle.bg, roleStyle.text, roleStyle.border
                      )}
                    >
                      {roleLabel}
                    </Badge>
                    {user.email && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <UserCheck className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              <p className="text-xs font-medium">No team members found matching "{search}"</p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100">
            Cancel
          </Button>
          <Button
            onClick={() => handleStart()}
            disabled={!selected || loading}
            className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm transition-all"
          >
            {loading ? "Starting..." : "Start Conversation"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewDMModal;
