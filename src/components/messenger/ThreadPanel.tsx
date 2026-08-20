import React, { useState, useEffect } from "react";
import { getThread } from "@/services/messengerService";
import { useMessenger } from "@/hooks/useMessenger";
import MessageBubble from "@/components/messenger/MessageBubble";
import MessageInput from "@/components/messenger/MessageInput";
import { Button } from "@/components/ui/button";
import { X, MessageSquare, ArrowLeft, Paperclip } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/hooks/useMessenger";
import type { OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  message: ChatMessage;
  users: OrgUser[];
  currentUserId: string;
  messengerCtx: ReturnType<typeof useMessenger>;
  onClose: () => void;
}

const ThreadPanel: React.FC<Props> = ({ message, users, currentUserId, messengerCtx, onClose }) => {
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getThread(message.id)
      .then((res) => setReplies(res.replies || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [message.id]);

  useEffect(() => {
    const unsub1 = messengerCtx.onNewMessage((msg) => {
      if (msg.parent_message_id === message.id) {
        setReplies((prev) => (prev.some((r) => r.id === msg.id) ? prev : [...prev, msg]));
      }
    });
    const unsub2 = messengerCtx.onNewDMMessage((msg) => {
      if (msg.parent_message_id === message.id) {
        setReplies((prev) => (prev.some((r) => r.id === msg.id) ? prev : [...prev, msg]));
      }
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [message.id, messengerCtx]);

  const handleSendReply = (
    content: string,
    contentHtml: string,
    attachments?: import("@/services/messengerService").AttachmentItem[]
  ) => {
    // Send via real-time socket
    messengerCtx.sendMessage({
      channel_id: message.channel_id || undefined,
      dm_thread_id: message.dm_thread_id || undefined,
      content,
      content_html: contentHtml,
      parent_message_id: message.id,
      attachments,
    });
  };

  const senderUser = users.find((u) => u.id === message.user_id);
  const senderName = message.first_name
    ? `${message.first_name} ${message.last_name || ""}`.trim()
    : senderUser
    ? `${senderUser.first_name} ${senderUser.last_name || ""}`.trim()
    : "Team Member";

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto flex flex-col w-full md:w-80 xl:w-96 flex-shrink-0 border-l border-slate-200/80 bg-white shadow-xl md:shadow-none h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200/80 bg-white min-h-[52px] sm:min-h-[56px] pt-[env(safe-area-inset-top,0px)] flex-shrink-0">
        <div className="flex items-center gap-2 text-slate-900 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl md:hidden -ml-1 mr-0.5 flex-shrink-0"
            onClick={onClose}
            title="Back to conversation"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">Thread Reply</span>
            <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">Replying to {senderName}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg hidden md:flex flex-shrink-0"
          onClick={onClose}
          title="Close Thread"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message preview */}
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-3 sm:px-4 py-2.5 sm:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-teal-800 font-bold truncate">{senderName}</p>
          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">Original Message</span>
        </div>
        <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
          {message.content || (message.attachments && message.attachments.length > 0 ? "Attachment" : "No content")}
        </p>
      </div>

      {/* Replies list */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1 min-h-0 overscroll-contain">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs font-semibold">No replies yet</p>
            <p className="text-[10px] mt-0.5">Start the conversation below</p>
          </div>
        ) : (
          replies.map((reply, i) => (
            <MessageBubble
              key={reply.id}
              message={reply}
              isGrouped={i > 0 && replies[i - 1].user_id === reply.user_id}
              isOwn={reply.user_id === currentUserId}
              users={users}
              currentUserId={currentUserId}
              onThreadOpen={() => {}}
              messengerCtx={messengerCtx}
            />
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="border-t border-slate-200/80 bg-white flex-shrink-0 z-10">
        <MessageInput
          placeholder={`Reply to ${senderName}...`}
          onSend={handleSendReply}
          onTypingChange={() => {}}
          users={users}
        />
      </div>
    </div>
  );
};

export default ThreadPanel;
