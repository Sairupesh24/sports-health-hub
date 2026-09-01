import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessenger } from "@/hooks/useMessenger";
import { getChannels, getDMs, getUnreadCounts, getUsers } from "@/services/messengerService";
import {
  isPushSupported,
  checkPushSubscriptionStatus,
  subscribeToPush,
  sendTestPush,
  isIOS,
  isStandalone,
} from "@/services/pushNotificationService";
import {
  MessengerSidebar,
  ChannelView,
  DirectMessageView,
} from "@/components/messenger";
import {
  MessageSquare,
  ArrowLeft,
  LayoutGrid,
  Building2,
  ShieldCheck,
  Bell,
  BellRing,
  CheckCircle2,
  Share2,
  Send,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatUserRole } from "@/components/messenger/messengerUtils";
import { playNotificationSound } from "@/utils/sound";
import { toast } from "sonner";

export type ViewMode = { type: "channel"; id: string } | { type: "dm"; threadId: string; otherUserId: string } | null;

export interface Channel {
  id: string;
  name: string;
  channel_type: string;
  unread_count: number;
  last_message?: { content: string; created_at: string } | null;
  description?: string;
  member_role?: string;
}

export interface DMThread {
  id: string;
  other_user_id: string;
  other_first_name: string;
  other_last_name: string;
  other_avatar_url?: string;
  other_role?: string;
  other_profession?: string;
  last_message_at?: string;
  created_at?: string;
  unread_count?: number;
  last_message?: { content: string; created_at: string } | null;
}

export interface OrgUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role?: string;
  profession?: string;
  email?: string;
}

const MessengerPage: React.FC = () => {
  const { profile, roles } = useAuth();
  const messengerCtx = useMessenger();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDMs] = useState<DMThread[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [activeView, setActiveView] = useState<ViewMode>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Push notification state
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [dismissedPushBanner, setDismissedPushBanner] = useState<boolean>(false);

  // Check push subscription status
  const checkPush = useCallback(async () => {
    if (isPushSupported()) {
      const active = await checkPushSubscriptionStatus();
      setIsPushSubscribed(active);
    }
  }, []);

  useEffect(() => {
    checkPush();
  }, [checkPush]);

  // Handle push subscription click
  const handleEnablePush = async () => {
    setIsSubscribingPush(true);
    try {
      const res = await subscribeToPush();
      if (res.success) {
        setIsPushSubscribed(true);
        toast.success("Push notifications enabled!", {
          description: "You will now receive alerts even when browser is closed or phone is locked.",
        });
      } else {
        toast.error("Failed to enable push notifications", {
          description: res.error || "Please allow notifications in your browser settings.",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enable push notifications");
    } finally {
      setIsSubscribingPush(false);
    }
  };

  // Handle test push notification
  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      const res = await sendTestPush();
      if (res.success) {
        toast.success("Test notification sent!", {
          description: "Check your screen / notification center for the TeamComms alert.",
        });
      } else {
        toast.error(res.message || "Failed to trigger test push");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to test push");
    } finally {
      setIsTestingPush(false);
    }
  };

  // Helper to sort DMs by latest message/activity timestamp descending
  const sortDMs = (list: DMThread[]) => {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.last_message?.created_at || a.last_message_at || (a as any).created_at || 0).getTime();
      const timeB = new Date(b.last_message?.created_at || b.last_message_at || (b as any).created_at || 0).getTime();
      return timeB - timeA;
    });
  };

  // Helper to sort channels by latest message timestamp descending
  const sortChannels = (list: Channel[]) => {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.last_message?.created_at || 0).getTime();
      const timeB = new Date(b.last_message?.created_at || 0).getTime();
      return timeB - timeA;
    });
  };

  // Load data & catch-up sync
  const loadData = useCallback(async () => {
    try {
      const orgId = profile?.organization_id || undefined;
      const [chRes, dmRes, unreadRes, usersRes] = await Promise.allSettled([
        getChannels(orgId),
        getDMs(orgId),
        getUnreadCounts(orgId),
        getUsers(orgId),
      ]);

      if (chRes.status === "fulfilled" && chRes.value?.channels) {
        setChannels(sortChannels(chRes.value.channels));
      }
      if (dmRes.status === "fulfilled" && dmRes.value?.dms) {
        setDMs(sortDMs(dmRes.value.dms));
      }
      if (usersRes.status === "fulfilled" && usersRes.value?.users) {
        setUsers(usersRes.value.users);
      }
      if (unreadRes.status === "fulfilled" && unreadRes.value) {
        const map: Record<string, number> = {};
        (unreadRes.value.channels || []).forEach((c: { channel_id: string; unread_count: number }) => {
          map[c.channel_id] = c.unread_count;
        });
        (unreadRes.value.dms || []).forEach((d) => {
          map[d.dm_thread_id] = d.unread_count;
        });
        if (dmRes.status === "fulfilled" && dmRes.value?.dms) {
          dmRes.value.dms.forEach((d: any) => {
            if (d.unread_count) {
              map[d.id] = d.unread_count;
            }
          });
        }
        setUnreadMap(map);
      }
    } catch (err) {
      console.error("[MessengerPage] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    loadData();
    const handleWake = () => {
      if (document.visibilityState === "visible") {
        loadData();
        checkPush();
      }
    };
    document.addEventListener("visibilitychange", handleWake);
    window.addEventListener("focus", handleWake);
    return () => {
      document.removeEventListener("visibilitychange", handleWake);
      window.removeEventListener("focus", handleWake);
    };
  }, [loadData, checkPush]);

  // Delta catch-up sync whenever socket reconnects or background sync triggers
  useEffect(() => {
    if (messengerCtx.syncTrigger) {
      loadData();
    }
  }, [messengerCtx.syncTrigger, loadData]);

  useEffect(() => {
    const unsub = messengerCtx.onSyncNeeded?.(() => {
      loadData();
    });
    return unsub;
  }, [messengerCtx, loadData]);

  // Deep linking via URL query params (?channel=... or ?dm=...) and mobile view sync
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    const dmParam = searchParams.get("dm");

    if (channelParam && channels.length > 0) {
      const match = channels.find((c) => c.id === channelParam);
      if (match) {
        if (!activeView || activeView.type !== "channel" || activeView.id !== match.id) {
          setActiveView({ type: "channel", id: match.id });
          messengerCtx.joinChannel(match.id);
          messengerCtx.markChannelRead(match.id);
        }
      }
    } else if (dmParam && dms.length > 0) {
      const match = dms.find((d) => d.id === dmParam);
      if (match) {
        if (!activeView || activeView.type !== "dm" || activeView.threadId !== match.id) {
          setActiveView({ type: "dm", threadId: match.id, otherUserId: match.other_user_id });
          messengerCtx.joinDM(match.id);
          messengerCtx.markDMRead(match.id);
        }
      }
    } else if (!channelParam && !dmParam) {
      if (typeof window !== "undefined" && window.innerWidth >= 768 && channels.length > 0) {
        if (!activeView) {
          setActiveView({ type: "channel", id: channels[0].id });
        }
      } else if (typeof window !== "undefined" && window.innerWidth < 768) {
        if (activeView !== null) {
          setActiveView(null);
        }
      }
    }
  }, [channels, dms, searchParams, activeView, messengerCtx]);

  const handleBack = useCallback(() => {
    setActiveView(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Socket: update unread on new channel messages and sort to top
  useEffect(() => {
    const unsub = messengerCtx.onNewMessage((msg) => {
      if (msg.channel_id) {
        const isCurrentChannel = activeView?.type === "channel" && activeView.id === msg.channel_id;
        if (!isCurrentChannel && msg.user_id !== profile?.id) {
          playNotificationSound();
          setUnreadMap((prev) => ({
            ...prev,
            [msg.channel_id!]: (prev[msg.channel_id!] || 0) + 1,
          }));
        }
        setChannels((prev) => {
          const previewText = msg.content || (msg.attachments?.[0] ? `📎 ${msg.attachments[0].file_name}` : "Attachment");
          const updated = prev.map((c) =>
            c.id === msg.channel_id
              ? { ...c, last_message: { content: previewText, created_at: msg.created_at } }
              : c
          );
          return sortChannels(updated);
        });
      }
    });
    return unsub;
  }, [messengerCtx, activeView, profile?.id]);

  // Socket: update unread on new direct messages and sort latest to top
  useEffect(() => {
    const unsub = messengerCtx.onNewDMMessage((msg) => {
      if (msg.dm_thread_id) {
        const isCurrentDM = activeView?.type === "dm" && activeView.threadId === msg.dm_thread_id;
        if (!isCurrentDM && msg.user_id !== profile?.id) {
          playNotificationSound();
          setUnreadMap((prev) => ({
            ...prev,
            [msg.dm_thread_id!]: (prev[msg.dm_thread_id!] || 0) + 1,
            [msg.user_id!]: (prev[msg.user_id!] || 0) + 1,
          }));
        }

        const previewText = msg.content || (msg.attachments?.[0] ? `📎 ${msg.attachments[0].file_name}` : "Attachment");

        setDMs((prev) => {
          const exists = prev.some((d) => d.id === msg.dm_thread_id);
          if (exists) {
            const updated = prev.map((d) =>
              d.id === msg.dm_thread_id
                ? { ...d, last_message_at: msg.created_at, last_message: { content: previewText, created_at: msg.created_at } }
                : d
            );
            return sortDMs(updated);
          } else {
            loadData();
            return prev;
          }
        });
      }
    });
    return unsub;
  }, [messengerCtx, activeView, profile?.id, loadData]);

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveView({ type: "channel", id: channelId });
    setSearchParams({ channel: channelId });
    setUnreadMap((prev) => ({ ...prev, [channelId]: 0 }));
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c))
    );
    messengerCtx.joinChannel(channelId);
    messengerCtx.markChannelRead(channelId);
  }, [messengerCtx, setSearchParams]);

  const handleSelectDM = useCallback((thread: DMThread) => {
    setActiveView({ type: "dm", threadId: thread.id, otherUserId: thread.other_user_id });
    setSearchParams({ dm: thread.id });
    setUnreadMap((prev) => ({
      ...prev,
      [thread.id]: 0,
      [thread.other_user_id]: 0,
    }));
    setDMs((prev) =>
      prev.map((d) => (d.id === thread.id ? { ...d, unread_count: 0 } : d))
    );
    messengerCtx.joinDM(thread.id);
    messengerCtx.markDMRead(thread.id);
  }, [messengerCtx, setSearchParams]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-12 w-12 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center shadow-sm animate-pulse">
            <MessageSquare className="h-6 w-6 text-teal-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Loading TeamComms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-slate-50 text-slate-900 font-sans overscroll-none">
      {/* Top Universal App Navigation Bar */}
      <header className={cn("h-13 sm:h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex-shrink-0 items-center justify-between px-3 sm:px-4 z-30 shadow-xs pt-[env(safe-area-inset-top,0px)]", activeView ? "hidden md:flex" : "flex")}>
        {/* Left: Back to App Gallery & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app-gallery")}
            className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 text-slate-700 font-bold text-xs transition-all shadow-2xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <LayoutGrid className="h-3.5 w-3.5 text-teal-600" />
            <span>App Gallery</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 text-sm tracking-tight">TeamComms</span>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2">
              Messenger
            </Badge>
          </div>
        </div>

        {/* Right: Push status, Org, & Role info */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Push Status / Test Button */}
          {isPushSubscribed ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Push Alerts Active</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestPush}
                disabled={isTestingPush}
                className="h-6 px-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 rounded-md"
                title="Send a test notification to verify lockscreen alerts"
              >
                {isTestingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : "Test"}
              </Button>
            </div>
          ) : (
            isPushSupported() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnablePush}
                disabled={isSubscribingPush}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs gap-1.5 shadow-2xs"
              >
                {isSubscribingPush ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                ) : (
                  <BellRing className="w-3.5 h-3.5 text-teal-600" />
                )}
                <span>Enable Push</span>
              </Button>
            )
          )}

          {profile?.organization_name && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span className="truncate max-w-[180px]">{profile.organization_name}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            {formatUserRole(roles?.[0] || profile?.role, profile?.profession)}
          </div>
        </div>
      </header>

      {/* Push Notification Banner for Unsubscribed Users */}
      {!isPushSubscribed && !dismissedPushBanner && isPushSupported() && (
        <div className={cn("bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white px-3 sm:px-4 py-2 items-center justify-between gap-3 text-xs shadow-md z-20 animate-in fade-in duration-300 flex-shrink-0", activeView ? "hidden md:flex" : "flex")}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="truncate">
              <span className="font-bold">Active Background Alerts:</span>{" "}
              <span className="opacity-90 hidden sm:inline">
                Receive instant message notifications even when your browser is closed or phone is locked.
              </span>
              <span className="opacity-90 sm:hidden">Get lockscreen message alerts.</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isIOS() && !isStandalone() ? (
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                <Share2 className="w-3 h-3" /> Tap Share → Add to Home Screen
              </span>
            ) : (
              <Button
                size="sm"
                onClick={handleEnablePush}
                disabled={isSubscribingPush}
                className="h-7 px-3 bg-white text-teal-900 hover:bg-white/90 font-black text-xs rounded-xl shadow-xs"
              >
                {isSubscribingPush ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Enable Push
              </Button>
            )}
            <button
              onClick={() => setDismissedPushBanner(true)}
              className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden min-h-0 w-full">
        {/* Sidebar (Full screen on mobile when no chat is active, hidden on mobile when chat is active) */}
        <div className={cn("h-full min-h-0", activeView ? "hidden md:flex" : "flex w-full md:w-auto")}>
          <MessengerSidebar
            channels={channels}
            dms={dms}
            users={users}
            unreadMap={unreadMap}
            activeView={activeView}
            isConnected={messengerCtx.isConnected}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            onSelectChannel={handleSelectChannel}
            onSelectDM={handleSelectDM}
            onChannelsChanged={loadData}
            onDMsChanged={loadData}
            profile={profile}
          />
        </div>

        {/* Main Content Area (Full screen on mobile when chat is active, hidden on mobile when viewing list) */}
        <div className={cn("flex flex-1 flex-col min-w-0 min-h-0 bg-slate-50/70 h-full overflow-hidden", activeView ? "flex w-full" : "hidden md:flex")}>
          {activeView?.type === "channel" && (
            <ChannelView
              channelId={activeView.id}
              channel={channels.find((c) => c.id === activeView.id) || null}
              messengerCtx={messengerCtx}
              users={users}
              currentUserId={profile?.id || ""}
              onChannelUpdated={loadData}
              onBack={handleBack}
            />
          )}
          {activeView?.type === "dm" && (
            <DirectMessageView
              threadId={activeView.threadId}
              otherUserId={activeView.otherUserId}
              messengerCtx={messengerCtx}
              users={users}
              currentUserId={profile?.id || ""}
              onBack={handleBack}
            />
          )}
          {!activeView && (
            <div className="flex flex-1 items-center justify-center flex-col gap-4 p-8">
              <div className="rounded-3xl bg-teal-50 border border-teal-200/80 p-8 shadow-sm flex flex-col items-center text-center max-w-md">
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-teal-100 mb-2">
                  <MessageSquare className="h-10 w-10 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Welcome to TeamComms</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Select a channel from the left sidebar or start a direct message with any staff member, doctor, coach, or client in your organization.
                </p>

                {/* Quick Push Banner inside Empty State */}
                {!isPushSubscribed && isPushSupported() && (
                  <div className="mt-5 p-3 rounded-2xl bg-white border border-teal-200 flex flex-col items-center gap-2 w-full">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                      <BellRing className="w-4 h-4 text-teal-600" />
                      <span>Never miss important team messages</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Enable push alerts to get notified even when your phone is locked or browser is closed.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleEnablePush}
                      disabled={isSubscribingPush}
                      className="w-full h-8 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      {isSubscribingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                      Turn on Push Notifications
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessengerPage;
