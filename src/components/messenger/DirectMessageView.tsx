import React, { useState, useEffect, useCallback } from "react";
import { getDMMessages } from "@/services/messengerService";
import MessageList from "@/components/messenger/MessageList";
import MessageInput from "@/components/messenger/MessageInput";
import ThreadPanel from "@/components/messenger/ThreadPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatUserRole, getRoleBadgeStyle } from "./messengerUtils";
import type { ChatMessage } from "@/hooks/useMessenger";
import type { OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  threadId: string;
  otherUserId: string;
  messengerCtx: ReturnType<typeof import("@/hooks/useMessenger").useMessenger>;
  users: OrgUser[];
  currentUserId: string;
  onBack?: () => void;
}

const DirectMessageView: React.FC<Props> = ({
  threadId,
  otherUserId,
  messengerCtx,
  users,
  currentUserId,
  onBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null);

  const otherUser = users.find((u) => u.id === otherUserId);
  const otherInitials = otherUser
    ? `${otherUser.first_name?.[0] || ""}${otherUser.last_name?.[0] || ""}`.toUpperCase()
    : "?";
  const roleLabel = formatUserRole(otherUser?.role, otherUser?.profession);
  const roleStyle = getRoleBadgeStyle(otherUser?.role);

  const fetchLatestMessages = useCallback(() => {
    if (!threadId) return;
    getDMMessages(threadId)
      .then((res) => {
        if (res?.messages) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            res.messages.forEach((m) => map.set(m.id, m));
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          messengerCtx.markDMRead(threadId);
        }
      })
      .catch(() => {});
  }, [threadId, messengerCtx]);

  useEffect(() => {
    if (!threadId) return;
    setMessages([]);
    setLoading(true);
    getDMMessages(threadId)
      .then((res) => {
        setMessages(res.messages || []);
        setHasMore(res.has_more || false);
        messengerCtx.markDMRead(threadId);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    messengerCtx.joinDM(threadId);

    const handleWakeSync = () => {
      if (document.visibilityState === "visible") {
        fetchLatestMessages();
      }
    };

    document.addEventListener("visibilitychange", handleWakeSync);
    window.addEventListener("focus", handleWakeSync);

    return () => {
      document.removeEventListener("visibilitychange", handleWakeSync);
      window.removeEventListener("focus", handleWakeSync);
      messengerCtx.leaveDM(threadId);
    };
  }, [threadId, messengerCtx, fetchLatestMessages]);

  // Catch-up delta sync whenever socket reconnects or background sync triggers
  useEffect(() => {
    if (messengerCtx.syncTrigger) {
      fetchLatestMessages();
    }
  }, [messengerCtx.syncTrigger, fetchLatestMessages]);

  useEffect(() => {
    const unsub = messengerCtx.onSyncNeeded?.(() => {
      fetchLatestMessages();
    });
    return unsub;
  }, [messengerCtx, fetchLatestMessages]);

  // Real-time DM messages
  useEffect(() => {
    const unsub = messengerCtx.onNewDMMessage((msg) => {
      if (msg.dm_thread_id === threadId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.user_id !== currentUserId) {
          messengerCtx.markDMRead(threadId);
        }
      }
    });
    return unsub;
  }, [threadId, messengerCtx, currentUserId]);

  // Real-time reaction updates
  useEffect(() => {
    const unsub = messengerCtx.onReactionUpdated((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.message_id ? { ...m, reactions: data.reactions } : m
        )
      );
    });
    return unsub;
  }, [messengerCtx]);

  // Real-time deleted message updates
  useEffect(() => {
    const unsub = messengerCtx.onMessageDeleted((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.message_id
            ? { ...m, is_deleted: true, deleted_at: data.deleted_at, content: null, content_html: null, attachments: [] }
            : m
        )
      );
    });
    return unsub;
  }, [messengerCtx]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0];
      const res = await getDMMessages(threadId, oldest.created_at);
      setMessages((prev) => [...(res.messages || []), ...prev]);
      setHasMore(res.has_more || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOlder(false);
    }
  }, [threadId, messages, hasMore, loadingOlder]);

  const handleSend = useCallback(
    (content: string, contentHtml: string, attachments?: import("@/services/messengerService").AttachmentItem[]) => {
      messengerCtx.sendMessage({ dm_thread_id: threadId, content, content_html: contentHtml, attachments });
    },
    [threadId, messengerCtx]
  );

  return (
    <div className="flex flex-1 min-h-0 h-full overflow-hidden bg-slate-50/50 w-full">
      {/* Main DM pane */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 bg-white min-h-[52px] sm:min-h-[56px] shadow-2xs flex-shrink-0 z-10 pt-[env(safe-area-inset-top,0px)]">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl md:hidden flex-shrink-0 -ml-1 mr-0.5"
              title="Back to direct messages"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-teal-500/20 flex-shrink-0">
            <AvatarImage src={otherUser?.avatar_url} />
            <AvatarFallback className="bg-teal-600 text-white text-xs font-bold">
              {otherInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                {otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : "Direct Message"}
              </h2>
              <Badge
                variant="outline"
                className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-md font-semibold border truncate max-w-[100px] sm:max-w-[120px] ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
              >
                {roleLabel}
              </Badge>
            </div>
            {otherUser?.email && (
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{otherUser.email}</p>
            )}
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          onLoadOlder={loadOlderMessages}
          currentUserId={currentUserId}
          users={users}
          onThreadOpen={setThreadMessage}
          channelId={null}
          messengerCtx={messengerCtx}
        />

        {/* Input */}
        <div className="border-t border-slate-200/80 bg-white flex-shrink-0 z-10">
          <MessageInput
            placeholder={`Message ${otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : "..."}`}
            onSend={handleSend}
            onTypingChange={() => {}}
            users={users}
          />
        </div>
      </div>

      {/* Thread / Reference Panel */}
      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          users={users}
          currentUserId={currentUserId}
          messengerCtx={messengerCtx}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
};

export default DirectMessageView;
