import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Trash2, Paperclip, ExternalLink, Ban } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import AutomatedMessageCard from "@/components/messenger/AutomatedMessageCard";
import { toggleReaction, deleteMessage } from "@/services/messengerService";
import { formatUserRole, getRoleBadgeStyle } from "./messengerUtils";
import type { ChatMessage } from "@/hooks/useMessenger";
import type { OrgUser } from "@/pages/messenger/MessengerPage";

interface Props {
  message: ChatMessage;
  isGrouped: boolean;
  isOwn: boolean;
  users: OrgUser[];
  currentUserId: string;
  onThreadOpen: (msg: ChatMessage) => void;
  messengerCtx?: ReturnType<typeof import("@/hooks/useMessenger").useMessenger>;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙌", "🔥"];

const MessageBubble: React.FC<Props> = ({
  message,
  isGrouped,
  isOwn,
  users,
  currentUserId,
  onThreadOpen,
  messengerCtx,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isDeleted, setIsDeleted] = useState(Boolean(message.is_deleted || message.deleted_at));

  useEffect(() => {
    setIsDeleted(Boolean(message.is_deleted || message.deleted_at));
  }, [message.is_deleted, message.deleted_at]);

  const isAutomated = message.message_type !== "user";
  const isSystem = message.message_type === "system";

  // Find sender info
  const senderUser = users.find((u) => u.id === message.user_id);
  const senderName = message.first_name
    ? `${message.first_name} ${message.last_name || ""}`.trim()
    : senderUser
    ? `${senderUser.first_name} ${senderUser.last_name || ""}`.trim()
    : isOwn
    ? "You"
    : "Team Member";

  const senderAvatar = message.avatar_url || senderUser?.avatar_url;
  const senderRole = message.role || senderUser?.role;
  const roleStyle = getRoleBadgeStyle(senderRole);
  const initials = isOwn
    ? "YOU"
    : senderName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

  // Deleted message rendering
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex w-full my-1.5 transition-all",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "relative flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%]",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Avatar */}
          <div className="w-8 flex-shrink-0 flex items-end mb-1">
            {!isGrouped ? (
              <Avatar className="h-8 w-8 ring-2 ring-slate-100 shadow-2xs opacity-40">
                <AvatarImage src={senderAvatar} />
                <AvatarFallback className="bg-slate-200 text-slate-500 text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8" />
            )}
          </div>

          <div className={cn("flex flex-col min-w-0", isOwn ? "items-end" : "items-start")}>
            {!isGrouped && (
              <div
                className={cn(
                  "flex items-center gap-1.5 mb-1 px-1 opacity-70",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                <span className="text-xs font-bold text-slate-600">{senderName}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatTime(message.created_at)}
                </span>
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-3.5 py-2 border text-xs italic flex items-center gap-2 select-none shadow-2xs",
                isOwn
                  ? "bg-slate-50/90 border-slate-200 text-slate-400 rounded-tr-xs"
                  : "bg-slate-50/90 border-slate-200 text-slate-400 rounded-tl-xs"
              )}
            >
              <Ban className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span>This message was deleted</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // System message — centered pill
  if (isSystem) {
    return (
      <div className="flex justify-center w-full my-2">
        <div className="flex items-center gap-2 max-w-md w-full px-4">
          <div className="flex-1 h-px bg-slate-200" />
          <p className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full text-center">
            {message.content}
          </p>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      </div>
    );
  }

  // Automated message — rich card centered
  if (isAutomated) {
    return (
      <div className="flex justify-center w-full py-1 px-2">
        <AutomatedMessageCard message={message} />
      </div>
    );
  }

  const [reactions, setReactions] = useState<Array<{ emoji: string; count: number; users: string[] }>>(
    message.reactions || []
  );

  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  const handleReact = async (emoji: string) => {
    // Optimistic UI reaction update
    setReactions((prev) => {
      const idx = prev.findIndex((r) => r.emoji === emoji);
      if (idx >= 0) {
        const item = prev[idx];
        const hasReacted = item.users?.includes(currentUserId);
        if (hasReacted) {
          const newUsers = item.users.filter((u) => u !== currentUserId);
          const newCount = item.count - 1;
          if (newCount <= 0) {
            return prev.filter((_, i) => i !== idx);
          }
          const updated = [...prev];
          updated[idx] = { ...item, count: newCount, users: newUsers };
          return updated;
        } else {
          const updated = [...prev];
          updated[idx] = {
            ...item,
            count: item.count + 1,
            users: [...(item.users || []), currentUserId],
          };
          return updated;
        }
      } else {
        return [...prev, { emoji, count: 1, users: [currentUserId] }];
      }
    });

    try {
      const res = await toggleReaction(message.id, emoji);
      if (res.reactions) {
        setReactions(res.reactions);
      }
    } catch (err) {
      console.error("[MessageBubble] Error toggling reaction:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    setIsDeleted(true);
    try {
      if (messengerCtx) {
        messengerCtx.deleteMessage(
          message.id,
          message.channel_id || undefined,
          message.dm_thread_id || undefined
        );
      } else {
        await deleteMessage(message.id);
      }
    } catch (err) {
      console.error("[MessageBubble] Error deleting message:", err);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex w-full my-1.5 transition-all",
        isOwn ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Message Row Wrapper with Avatar and Content */}
      <div
        className={cn(
          "relative flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] md:max-w-[65%]",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div className="w-8 flex-shrink-0 flex items-end mb-1">
          {!isGrouped ? (
            <Avatar className="h-8 w-8 ring-2 ring-slate-100 shadow-2xs">
              <AvatarImage src={senderAvatar} />
              <AvatarFallback
                className={cn(
                  "text-white text-xs font-bold",
                  isOwn
                    ? "bg-teal-700"
                    : "bg-gradient-to-br from-teal-600 to-emerald-600"
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Bubble Box and Content */}
        <div className={cn("flex flex-col min-w-0", isOwn ? "items-end" : "items-start")}>
          {/* Header Metadata (Name & Time) */}
          {!isGrouped && (
            <div
              className={cn(
                "flex items-center gap-1.5 mb-1 px-1",
                isOwn ? "flex-row-reverse" : "flex-row"
              )}
            >
              <span className="text-xs font-bold text-slate-900">{senderName}</span>
              {senderRole && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 rounded-md font-semibold border",
                    roleStyle.bg,
                    roleStyle.text,
                    roleStyle.border
                  )}
                >
                  {formatUserRole(senderRole, senderUser?.profession)}
                </Badge>
              )}
              <span className="text-[10px] text-slate-400 font-medium">
                {formatTime(message.created_at)}
              </span>
              {message.is_edited && (
                <span className="text-[10px] text-slate-400 italic">(edited)</span>
              )}
            </div>
          )}

          {/* Bubble Card Container */}
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2.5 shadow-2xs border text-xs leading-relaxed break-words max-w-full",
              isOwn
                ? "bg-teal-50/95 border-teal-200/90 text-slate-900 rounded-tr-xs"
                : "bg-white border-slate-200/90 text-slate-900 rounded-tl-xs"
            )}
          >
            {/* Message reference header if this is a reply */}
            {message.parent_message_id && (
              <button
                onClick={() => onThreadOpen(message)}
                className="flex items-center gap-1.5 text-[10px] text-teal-700 hover:text-teal-900 font-bold mb-1.5 pb-1 border-b border-slate-200/60 w-full text-left"
              >
                <MessageSquare className="h-3 w-3 text-teal-600" />
                <span>Thread reply</span>
              </button>
            )}

            {/* Message body */}
            {message.content_html ? (
              <div
                className="prose prose-sm prose-slate max-w-none text-slate-900"
                dangerouslySetInnerHTML={{ __html: message.content_html }}
              />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Attachments inside bubble */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 pt-1 border-t border-slate-200/60">
                {message.attachments.map((att, idx) => {
                  const ext = att.file_name?.split(".").pop()?.toLowerCase();
                  const isExcel = ["xlsx", "xls", "csv"].includes(ext || "");
                  const isDoc = ["doc", "docx", "pdf", "txt"].includes(ext || "");
                  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "");
                  const isArchive = ["zip", "rar", "7z", "tar", "gz"].includes(ext || "");

                  return (
                    <a
                      key={att.id || idx}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.file_name}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 border transition-all shadow-2xs group/att bg-white hover:border-teal-400 hover:bg-teal-50/50 text-slate-900"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs">
                        {isExcel ? "📊" : isDoc ? "📄" : isImage ? "🖼️" : isArchive ? "📦" : "📎"}
                      </div>
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="text-xs font-bold truncate max-w-[190px]">
                          {att.file_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : "View / Download"}
                        </span>
                      </div>
                      <ExternalLink className="h-3 w-3 opacity-40 group-hover/att:opacity-100 text-teal-600 transition-opacity ml-auto" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reactions */}
          {reactions && reactions.length > 0 && (
            <div className={cn("flex flex-wrap gap-1 mt-1 px-1", isOwn ? "justify-end" : "justify-start")}>
              {reactions.map((r) => {
                const hasReacted = r.users?.includes(currentUserId);
                return (
                  <button
                    key={r.emoji}
                    onClick={() => handleReact(r.emoji)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs border transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95",
                      hasReacted
                        ? "bg-teal-50 border-teal-300 text-teal-800 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[10px] font-bold">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Thread replies count */}
          {(message.reply_count || 0) > 0 && (
            <button
              onClick={() => onThreadOpen(message)}
              className="mt-1 px-1 flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>

        {/* Action toolbar on hover */}
        {showActions && (
          <div
            className={cn(
              "absolute -top-7 flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-md z-10",
              isOwn ? "right-10" : "left-10"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-xs transition-colors"
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
              onClick={() => onThreadOpen(message)}
              title="Reply in thread"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            {isOwn && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                onClick={handleDelete}
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
