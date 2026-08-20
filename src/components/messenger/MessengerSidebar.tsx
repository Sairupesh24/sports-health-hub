import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Hash, Lock, Megaphone, Bot, MessageSquare, ChevronDown, ChevronRight,
  Plus, Search, X, PanelLeftClose, PanelLeftOpen, UserPlus, Users
} from "lucide-react";
import NewChannelModal from "@/components/messenger/NewChannelModal";
import NewDMModal from "@/components/messenger/NewDMModal";
import { formatUserRole, getRoleBadgeStyle } from "./messengerUtils";
import type { ViewMode, Channel, DMThread, OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  channels: Channel[];
  dms: DMThread[];
  users: OrgUser[];
  unreadMap: Record<string, number>;
  activeView: ViewMode;
  isConnected: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectChannel: (id: string) => void;
  onSelectDM: (thread: DMThread) => void;
  onChannelsChanged: () => void;
  onDMsChanged: () => void;
  profile: { first_name?: string; last_name?: string; avatar_url?: string | null; role?: string | null } | null;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  public: <Hash className="h-3.5 w-3.5 text-teal-600" />,
  private: <Lock className="h-3.5 w-3.5 text-purple-600" />,
  announcement: <Megaphone className="h-3.5 w-3.5 text-amber-600" />,
  automated: <Bot className="h-3.5 w-3.5 text-sky-600" />,
  dm: <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />,
};

const SectionHeader: React.FC<{
  label: string;
  count?: number;
  unreadCount?: number;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}> = ({ label, count, unreadCount, collapsed, onToggle, onAdd }) => (
  <div className="flex items-center justify-between px-3 py-1 mt-3">
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
    >
      {collapsed ? <ChevronRight className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
      <span>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] text-slate-400 font-medium">({count})</span>
      )}
      {unreadCount !== undefined && unreadCount > 0 && (
        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
    {onAdd && (
      <Button
        variant="ghost"
        size="icon"
        onClick={onAdd}
        className="h-5 w-5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

const MessengerSidebar: React.FC<Props> = ({
  channels, dms, users, unreadMap, activeView, isConnected,
  collapsed, onToggleCollapse, onSelectChannel, onSelectDM,
  onChannelsChanged, onDMsChanged, profile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDMs = dms.filter((d) =>
    `${d.other_first_name} ${d.other_last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "?";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 w-14 py-3 bg-white border-r border-slate-200/80 shadow-2xs">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 text-slate-500 hover:text-slate-900">
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div className="relative mt-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-teal-600" />
          </div>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </div>
        <div className="mt-auto">
          <Avatar className="h-7 w-7 ring-2 ring-slate-200">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-teal-600 text-white text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full md:w-72 lg:w-80 flex-shrink-0 bg-white border-r border-slate-200/80 select-none shadow-2xs h-full">
        {/* Sidebar Top Search & Collapse Toggle */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels & people..."
              className="pl-8 h-8 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 text-xs rounded-xl focus-visible:ring-teal-500/30 focus-visible:border-teal-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl hidden md:flex"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {/* Channels Section */}
          <SectionHeader
            label="Channels"
            count={filteredChannels.length}
            collapsed={channelsCollapsed}
            onToggle={() => setChannelsCollapsed((v) => !v)}
            onAdd={() => setShowNewChannel(true)}
          />
          {!channelsCollapsed && (
            <div className="space-y-0.5 px-2 mt-1">
              {filteredChannels.map((ch) => {
                const isActive = activeView?.type === "channel" && activeView.id === ch.id;
                const unread = unreadMap[ch.id] || 0;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-all",
                      isActive
                        ? "bg-teal-50 text-teal-900 font-bold border border-teal-200/80 shadow-2xs"
                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    )}
                  >
                    <span>
                      {CHANNEL_ICON[ch.channel_type] || <Hash className="h-3.5 w-3.5 text-slate-400" />}
                    </span>
                    <span className="flex-1 truncate text-left">{ch.name}</span>
                    {unread > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-2xs">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredChannels.length === 0 && (
                <div className="px-3 py-2 text-center">
                  <p className="text-xs text-slate-400">No channels found</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChannel(true)}
                    className="mt-1 h-7 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Create Channel
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Direct Messages Section */}
          {(() => {
            const totalDMUnread = filteredDMs.reduce(
              (acc, dm) => acc + (unreadMap[dm.id] || unreadMap[dm.other_user_id] || 0),
              0
            );
            return (
              <SectionHeader
                label="Direct Messages"
                count={filteredDMs.length}
                unreadCount={totalDMUnread}
                collapsed={dmsCollapsed}
                onToggle={() => setDmsCollapsed((v) => !v)}
                onAdd={() => setShowNewDM(true)}
              />
            );
          })()}
          {!dmsCollapsed && (
            <div className="space-y-0.5 px-2 mt-1">
              {filteredDMs.map((dm) => {
                const isActive = activeView?.type === "dm" && activeView.threadId === dm.id;
                const dmInitials = `${dm.other_first_name?.[0] || ""}${dm.other_last_name?.[0] || ""}`.toUpperCase();
                const roleLabel = formatUserRole(dm.other_role, dm.other_profession);
                const roleBadge = getRoleBadgeStyle(dm.other_role);
                const dmUnread = unreadMap[dm.id] || unreadMap[dm.other_user_id] || 0;

                return (
                  <button
                    key={dm.id}
                    onClick={() => onSelectDM(dm)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all text-left group",
                      isActive
                        ? "bg-teal-50 text-teal-900 border border-teal-200/80 shadow-2xs font-semibold"
                        : dmUnread > 0
                        ? "bg-amber-50/60 text-slate-900 font-bold border border-amber-200/60"
                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    )}
                  >
                    <Avatar className="h-6 w-6 flex-shrink-0 ring-1 ring-slate-200">
                      <AvatarImage src={dm.other_avatar_url} />
                      <AvatarFallback className="bg-slate-200 text-slate-700 text-[10px] font-bold">
                        {dmInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn("text-xs truncate", dmUnread > 0 ? "font-black text-slate-900" : "font-medium")}>
                          {dm.other_first_name} {dm.other_last_name}
                        </p>
                        {dmUnread > 0 && (
                          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse">
                            {dmUnread > 99 ? "99+" : dmUnread}
                          </span>
                        )}
                      </div>
                      <p className={cn("text-[10px] truncate", dmUnread > 0 ? "text-teal-700 font-bold" : "text-slate-400")}>
                        {dm.last_message?.content ? dm.last_message.content : roleLabel}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 rounded-md font-semibold hidden group-hover:inline-flex", roleBadge.bg, roleBadge.text, roleBadge.border)}>
                      {roleLabel}
                    </Badge>
                  </button>
                );
              })}

              {filteredDMs.length === 0 && (
                <div className="px-3 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewDM(true)}
                    className="w-full h-8 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-teal-700 hover:bg-teal-50"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5 text-teal-600" /> Start Direct Message
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Quick Team Directory shortcut */}
          <div className="px-3 pt-4 pb-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-600">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-teal-600" /> Organization Team
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200/80 text-slate-700">
                  {users.length} members
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                Click below to start a chat with doctors, coaches, or staff.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewDM(true)}
                className="w-full mt-2 h-7 rounded-xl bg-white border-slate-200 text-xs text-slate-800 font-semibold hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 shadow-2xs"
              >
                Browse Members Directory
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Footer — current logged-in user details */}
        <div className="border-t border-slate-100 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] flex items-center gap-2.5 bg-slate-50/50 flex-shrink-0">
          <Avatar className="h-8 w-8 ring-2 ring-teal-500/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-teal-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {formatUserRole(profile?.role)}
            </p>
          </div>
        </div>
      </div>

      {showNewChannel && (
        <NewChannelModal
          users={users}
          onClose={() => setShowNewChannel(false)}
          onCreated={() => { setShowNewChannel(false); onChannelsChanged(); }}
        />
      )}
      {showNewDM && (
        <NewDMModal
          users={users}
          onClose={() => setShowNewDM(false)}
          onCreated={(thread) => {
            setShowNewDM(false);
            onDMsChanged();
            onSelectDM(thread as any);
          }}
        />
      )}
    </>
  );
};

export default MessengerSidebar;
