import React, { useRef, useEffect, useCallback } from "react";
import MessageBubble from "@/components/messenger/MessageBubble";
import { Loader2, ArrowUp, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/hooks/useMessenger";
import type { OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  currentUserId: string;
  users: OrgUser[];
  onThreadOpen: (msg: ChatMessage) => void;
  channelId: string | null;
  messengerCtx?: ReturnType<typeof import("@/hooks/useMessenger").useMessenger>;
}

const MessageList: React.FC<Props> = ({
  messages,
  loading,
  hasMore,
  loadingOlder,
  onLoadOlder,
  currentUserId,
  users,
  onThreadOpen,
  messengerCtx,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const isNewMessage = messages.length === prevMessageCount.current + 1;
      prevMessageCount.current = messages.length;
      if (isNewMessage || prevMessageCount.current <= 1) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      prevMessageCount.current = messages.length;
    }
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loading]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    if (el.scrollTop < 100 && hasMore && !loadingOlder) {
      onLoadOlder();
    }
  }, [hasMore, loadingOlder, onLoadOlder]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  // Group consecutive messages by same sender
  const groupedMessages = messages.reduce<{ msg: ChatMessage; isGrouped: boolean }[]>(
    (acc, msg, i) => {
      const prev = messages[i - 1];
      const isGrouped =
        !!prev &&
        prev.user_id === msg.user_id &&
        prev.bot_id === msg.bot_id &&
        new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000 &&
        !msg.parent_message_id;
      acc.push({ msg, isGrouped });
      return acc;
    },
    []
  );

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0"
    >
      {/* Load older button */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 transition-all shadow-2xs"
          >
            {loadingOlder ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5 text-teal-600" />
            )}
            <span>{loadingOlder ? "Loading..." : "Load earlier messages"}</span>
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 py-16">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-2xs">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="text-center max-w-xs">
            <p className="text-xs font-bold text-slate-800">No messages in this chat yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Send a greeting or share an update with your team to start the conversation.
            </p>
          </div>
        </div>
      )}

      {groupedMessages.map(({ msg, isGrouped }) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isGrouped={isGrouped}
          isOwn={msg.user_id === currentUserId}
          users={users}
          currentUserId={currentUserId}
          onThreadOpen={onThreadOpen}
          messengerCtx={messengerCtx}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
