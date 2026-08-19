import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessenger, type ChatMessage } from "@/hooks/useMessenger";
import { playNotificationSound } from "@/utils/sound";
import { MessageSquare, ExternalLink, X, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatUserRole, getRoleBadgeStyle } from "./messengerUtils";

interface PopupNotification {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  senderProfession?: string;
  channelName?: string;
  isDM: boolean;
  timestamp: string;
}

export const TeamCommsGlobalNotifier: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const messengerCtx = useMessenger();
  const [activePopup, setActivePopup] = useState<PopupNotification | null>(null);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const triggerNotification = useCallback(
    (msg: ChatMessage, isDM: boolean) => {
      // Don't notify if the user themselves sent the message
      if (msg.user_id === user?.id || msg.user_id === profile?.id) return;

      // Don't show in-app popup if currently in messenger
      const isCurrentlyInMessenger = location.pathname.startsWith("/messenger");

      const senderName =
        msg.first_name || msg.last_name
          ? `${msg.first_name || ""} ${msg.last_name || ""}`.trim()
          : msg.bot_name || "Team Member";

      const senderRole = (msg as any).role || (msg as any).ams_role;
      const senderProfession = (msg as any).profession;

      // 1. Play sound chime
      playNotificationSound();

      // 2. Trigger native browser push notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const notifTitle = isDM
            ? `New message from ${senderName}`
            : `New message from ${senderName}`;

          const n = new Notification(notifTitle, {
            body: "New message received • Click to open in TeamComms",
            icon: "/favicon.ico",
          });

          n.onclick = () => {
            window.focus();
            window.open("/messenger", "_blank");
            n.close();
          };
        } catch (e) {
          // Ignore notification constructor errors
        }
      }

      // 3. Show in-app popup banner if on any other module
      if (!isCurrentlyInMessenger) {
        const popup: PopupNotification = {
          id: `${msg.id || Date.now()}`,
          senderName,
          senderAvatar: msg.avatar_url,
          senderRole,
          senderProfession,
          channelName: (msg as any).channel_name,
          isDM,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setActivePopup(popup);
      }
    },
    [user?.id, profile?.id, location.pathname]
  );

  // Listen to channel messages
  useEffect(() => {
    const unsub = messengerCtx.onNewMessage((msg) => {
      triggerNotification(msg, false);
    });
    return unsub;
  }, [messengerCtx, triggerNotification]);

  // Listen to DM messages
  useEffect(() => {
    const unsub = messengerCtx.onNewDMMessage((msg) => {
      triggerNotification(msg, true);
    });
    return unsub;
  }, [messengerCtx, triggerNotification]);

  // Auto-dismiss popup after 7 seconds
  useEffect(() => {
    if (!activePopup) return;
    const timer = setTimeout(() => {
      setActivePopup(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activePopup]);

  if (!activePopup) return null;

  const roleLabel = formatUserRole(activePopup.senderRole, activePopup.senderProfession);
  const roleBadge = getRoleBadgeStyle(activePopup.senderRole);
  const initials = activePopup.senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleOpenMessenger = () => {
    window.open("/messenger", "_blank");
    setActivePopup(null);
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto max-w-sm w-full">
      <div
        onClick={handleOpenMessenger}
        className="group flex items-start gap-3 bg-white/95 backdrop-blur-md border border-teal-200/90 hover:border-teal-400 rounded-3xl p-3.5 shadow-2xl hover:shadow-teal-500/10 cursor-pointer transition-all duration-200"
      >
        {/* Sender Avatar */}
        <Avatar className="h-10 w-10 ring-2 ring-teal-500/20 flex-shrink-0 mt-0.5">
          <AvatarImage src={activePopup.senderAvatar} />
          <AvatarFallback className="bg-gradient-to-tr from-teal-600 to-emerald-600 text-white text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content Box with Hidden Message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-black text-slate-900 truncate">
                {activePopup.senderName}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1.5 py-0 rounded-md font-semibold border truncate max-w-[100px]",
                  roleBadge.bg,
                  roleBadge.text,
                  roleBadge.border
                )}
              >
                {roleLabel}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
              {activePopup.timestamp}
            </span>
          </div>

          {/* Privacy Note / Hidden Message Body */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-semibold text-teal-800">
              New message received
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              · Message content hidden
            </span>
          </div>

          {/* Open in new tab prompt */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-teal-700 mt-2 group-hover:text-teal-800">
            <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
            <span>Click to open TeamComms in new tab</span>
            <ExternalLink className="h-3 w-3 ml-0.5 opacity-70 group-hover:opacity-100" />
          </div>
        </div>

        {/* Dismiss Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setActivePopup(null);
          }}
          className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full flex-shrink-0 -mt-1 -mr-1"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default TeamCommsGlobalNotifier;
