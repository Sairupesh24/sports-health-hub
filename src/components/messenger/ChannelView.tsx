import React, { useState, useEffect, useRef, useCallback } from "react";
import { getMessages } from "@/services/messengerService";
import MessageList from "@/components/messenger/MessageList";
import MessageInput from "@/components/messenger/MessageInput";
import TypingIndicator from "@/components/messenger/TypingIndicator";
import ThreadPanel from "@/components/messenger/ThreadPanel";
import ChannelSettingsModal from "@/components/messenger/ChannelSettingsModal";
import { Hash, Settings, Lock, Megaphone, Bot, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useMessenger";
import type { Channel, OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  channelId: string;
  channel: Channel | null;
  messengerCtx: ReturnType<typeof import("@/hooks/useMessenger").useMessenger>;
  users: OrgUser[];
  currentUserId: string;
  onChannelUpdated: () => void;
  onBack?: () => void;
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  public: <Hash className="h-4 w-4 text-teal-600" />,
  private: <Lock className="h-4 w-4 text-purple-600" />,
  announcement: <Megaphone className="h-4 w-4 text-amber-600" />,
  automated: <Bot className="h-4 w-4 text-sky-600" />,
};

const ChannelView: React.FC<Props> = ({
  channelId,
  channel,
  messengerCtx,
  users,
  currentUserId,
  onChannelUpdated,
  onBack,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const prevChannelId = useRef<string | null>(null);

  const fetchLatestMessages = useCallback(() => {
    if (!channelId) return;
    getMessages(channelId)
      .then((res) => {
        if (res?.messages) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            res.messages.forEach((m) => map.set(m.id, m));
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          messengerCtx.markChannelRead(channelId);
        }
      })
      .catch(() => {});
  }, [channelId, messengerCtx]);

  // Load initial messages and join channel room
  useEffect(() => {
    if (!channelId) return;
    setMessages([]);
    setLoading(true);
    getMessages(channelId)
      .then((res) => {
        setMessages(res.messages || []);
        setHasMore(res.has_more || false);
        messengerCtx.markChannelRead(channelId);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Join socket room
    if (prevChannelId.current && prevChannelId.current !== channelId) {
      messengerCtx.leaveChannel(prevChannelId.current);
    }
    messengerCtx.joinChannel(channelId);
    prevChannelId.current = channelId;

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
    };
  }, [channelId, messengerCtx, fetchLatestMessages]);

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

  // Socket: real-time new messages
  useEffect(() => {
    const unsub = messengerCtx.onNewMessage((msg) => {
      if (msg.channel_id === channelId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.user_id !== currentUserId) {
          messengerCtx.markChannelRead(channelId);
        }
      }
    });
    return unsub;
  }, [channelId, messengerCtx, currentUserId]);

  // Socket: real-time reaction updates
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

  // Socket: real-time message deleted updates
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

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0];
      const res = await getMessages(channelId, oldest.created_at);
      setMessages((prev) => [...(res.messages || []), ...prev]);
      setHasMore(res.has_more || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOlder(false);
    }
  }, [channelId, messages, hasMore, loadingOlder]);

  const handleSend = useCallback(
    (content: string, contentHtml: string, attachments?: import("@/services/messengerService").AttachmentItem[]) => {
      messengerCtx.sendMessage({ channel_id: channelId, content, content_html: contentHtml, attachments });
    },
    [channelId, messengerCtx]
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (isTyping) messengerCtx.startTyping(channelId);
      else messengerCtx.stopTyping(channelId);
    },
    [channelId, messengerCtx]
  );

  const typingInChannel = messengerCtx.typingUsers
    .filter((u) => u.channel_id === channelId && u.user_id !== currentUserId)
    .map((u) => {
      const found = users.find((usr) => usr.id === u.user_id);
      return found ? `${found.first_name} ${found.last_name}` : "Someone";
    });

  return (
    <div className="flex flex-1 min-h-0 h-full overflow-hidden bg-slate-50/50 w-full">
      {/* Main chat pane */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Channel Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 bg-white min-h-[52px] sm:min-h-[56px] shadow-2xs flex-shrink-0 z-10 pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-8 w-8 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl md:hidden flex-shrink-0 -ml-1 mr-0.5"
                title="Back to channels"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0 text-teal-700 font-bold text-xs sm:text-sm">
              #
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                  {channel?.name || "Channel"}
                </h2>
                {channel?.channel_type === "announcement" && (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                    Announcements
                  </Badge>
                )}
                {channel?.channel_type === "automated" && (
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                    System
                  </Badge>
                )}
              </div>
              {channel?.description && (
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-xs sm:max-w-sm">
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message list */}
        <MessageList
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          onLoadOlder={loadOlderMessages}
          currentUserId={currentUserId}
          users={users}
          onThreadOpen={setThreadMessage}
          channelId={channelId}
          messengerCtx={messengerCtx}
        />

        {/* Typing indicator */}
        {typingInChannel.length > 0 && <TypingIndicator names={typingInChannel} />}

        {/* Input */}
        <div className="border-t border-slate-200/80 bg-white flex-shrink-0 z-10">
          <MessageInput
            placeholder={`Message #${channel?.name || "..."}`}
            onSend={handleSend}
            onTypingChange={handleTyping}
            users={users}
            disabled={channel?.channel_type === "automated"}
          />
        </div>
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          users={users}
          currentUserId={currentUserId}
          messengerCtx={messengerCtx}
          onClose={() => setThreadMessage(null)}
        />
      )}

      {/* Settings modal */}
      {showSettings && channel && (
        <ChannelSettingsModal
          channel={channel}
          users={users}
          onClose={() => setShowSettings(false)}
          onUpdated={() => {
            setShowSettings(false);
            onChannelUpdated();
          }}
        />
      )}
    </div>
  );
};

export default ChannelView;
