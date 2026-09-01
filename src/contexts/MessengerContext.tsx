import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { registerServiceWorker } from "@/services/pushNotificationService";

export interface ChatMessage {
  id: string;
  channel_id?: string | null;
  dm_thread_id?: string | null;
  user_id?: string | null;
  bot_id?: string | null;
  parent_message_id?: string | null;
  message_type: string;
  content: string | null;
  content_html?: string | null;
  metadata?: Record<string, unknown> | null;
  is_edited: boolean;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_deleted?: boolean;
  created_at: string;
  // Joined fields
  first_name?: string;
  last_name?: string;
  role?: string;
  avatar_url?: string;
  bot_name?: string;
  bot_avatar?: string;
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  reply_count?: number;
  attachments?: Array<{ id: string; file_name: string; file_url: string; file_size?: number; mime_type?: string }>;
  is_automated?: boolean;
}

export interface TypingUser {
  user_id: string;
  channel_id: string;
}

export interface MessengerContextType {
  socket: Socket | null;
  isConnected: boolean;
  typingUsers: TypingUser[];
  syncTrigger: number;
  sendMessage: (data: {
    channel_id?: string;
    dm_thread_id?: string;
    content: string;
    content_html?: string;
    parent_message_id?: string;
    attachments?: Array<{ file_name: string; file_url: string; file_size?: number; mime_type?: string }>;
  }) => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  joinDM: (threadId: string) => void;
  leaveDM: (threadId: string) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  markRead: (channelId: string) => void;
  markChannelRead: (channelId: string) => void;
  markDMRead: (threadId: string) => void;
  toggleReaction: (data: { message_id: string; emoji: string; channel_id?: string; dm_thread_id?: string }) => void;
  deleteMessage: (messageId: string, channelId?: string, dmThreadId?: string) => void;
  triggerCatchUpSync: () => void;
  onNewMessage: (handler: (msg: ChatMessage) => void) => () => void;
  onNewDMMessage: (handler: (msg: ChatMessage) => void) => () => void;
  onReactionUpdated: (handler: (data: { message_id: string; reactions: Array<{ emoji: string; count: number; users: string[] }>; user_id: string; emoji: string; action: string }) => void) => () => void;
  onMessageDeleted: (handler: (data: { message_id: string; channel_id?: string; dm_thread_id?: string; deleted_at: string; user_id: string }) => void) => () => void;
  onDMNotification: (handler: (data: { dm_thread_id: string; sender_id: string; sender_name: string; content: string; created_at: string }) => void) => () => void;
  onPersonalNotification: (handler: (data: unknown) => void) => () => void;
  onSyncNeeded: (handler: () => void) => () => void;
}

const MessengerContext = createContext<MessengerContextType | null>(null);

function getSocketUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;
    // In dev mode (port 3001, 5173, etc. or localhost/LAN IP), target backend port 3000
    if (port === "3001" || port === "5173" || port === "8080" || hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }
    return window.location.origin;
  }
  return "http://localhost:3000";
}

export const MessengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeRoomRef = useRef<{ type: "channel" | "dm"; id: string } | null>(null);

  // Persistent listener registries
  const newMessageHandlers = useRef<Set<(msg: ChatMessage) => void>>(new Set());
  const newDMMessageHandlers = useRef<Set<(msg: ChatMessage) => void>>(new Set());
  const reactionHandlers = useRef<Set<(data: { message_id: string; reactions: Array<{ emoji: string; count: number; users: string[] }>; user_id: string; emoji: string; action: string }) => void>>(new Set());
  const deletedHandlers = useRef<Set<(data: { message_id: string; channel_id?: string; dm_thread_id?: string; deleted_at: string; user_id: string }) => void>>(new Set());
  const dmNotificationHandlers = useRef<Set<(data: { dm_thread_id: string; sender_id: string; sender_name: string; content: string; created_at: string }) => void>>(new Set());
  const personalNotificationHandlers = useRef<Set<(data: unknown) => void>>(new Set());
  const syncNeededHandlers = useRef<Set<() => void>>(new Set());

  const triggerCatchUpSync = useCallback(() => {
    setSyncTrigger(Date.now());
    syncNeededHandlers.current.forEach((fn) => fn());
  }, []);

  // Register service worker once when provider mounts
  useEffect(() => {
    registerServiceWorker().catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ishpo_jwt");
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const targetUrl = getSocketUrl();
    console.log("[TeamComms] Initializing persistent socket to:", targetUrl);

    const socket = io(targetUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[TeamComms] Socket connected:", socket.id);
      // Re-join active room after reconnect
      if (activeRoomRef.current?.type === "channel") {
        socket.emit("join_channel", { channel_id: activeRoomRef.current.id });
      } else if (activeRoomRef.current?.type === "dm") {
        socket.emit("join_dm", { dm_thread_id: activeRoomRef.current.id });
      }
      // Trigger catch-up sync across components on reconnect
      triggerCatchUpSync();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[TeamComms] Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("[TeamComms] Socket connection error:", err.message);
    });

    // Real-time message events dispatch to persistent registries
    socket.on("new_message", (msg: ChatMessage) => {
      newMessageHandlers.current.forEach((fn) => fn(msg));
    });

    socket.on("new_dm_message", (msg: ChatMessage) => {
      newDMMessageHandlers.current.forEach((fn) => fn(msg));
    });

    socket.on("reaction_updated", (data) => {
      reactionHandlers.current.forEach((fn) => fn(data));
    });

    socket.on("message_deleted", (data) => {
      deletedHandlers.current.forEach((fn) => fn(data));
    });

    socket.on("dm_notification", (data) => {
      dmNotificationHandlers.current.forEach((fn) => fn(data));
    });

    socket.on("personal_notification", (data) => {
      personalNotificationHandlers.current.forEach((fn) => fn(data));
    });

    // Typing indicators
    socket.on("user_typing", (data: TypingUser) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.user_id === data.user_id && u.channel_id === data.channel_id))
          return prev;
        return [...prev, data];
      });
      const key = `${data.user_id}:${data.channel_id}`;
      if (typingTimers.current.has(key)) clearTimeout(typingTimers.current.get(key)!);
      typingTimers.current.set(
        key,
        setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => !(u.user_id === data.user_id && u.channel_id === data.channel_id))
          );
        }, 4000)
      );
    });

    socket.on("typing_stopped", (data: TypingUser) => {
      const key = `${data.user_id}:${data.channel_id}`;
      if (typingTimers.current.has(key)) clearTimeout(typingTimers.current.get(key)!);
      setTypingUsers((prev) =>
        prev.filter((u) => !(u.user_id === data.user_id && u.channel_id === data.channel_id))
      );
    });

    // Mobile background sleep / tab wakeup recovery
    const handleWake = () => {
      if (document.visibilityState === "visible") {
        if (socketRef.current && !socketRef.current.connected) {
          console.log("[TeamComms] Tab visible: reconnecting socket...");
          socketRef.current.connect();
        } else {
          // Tab became visible while connected: run catch-up delta sync
          triggerCatchUpSync();
        }
      }
    };

    document.addEventListener("visibilitychange", handleWake);
    window.addEventListener("focus", handleWake);
    window.addEventListener("online", handleWake);

    return () => {
      document.removeEventListener("visibilitychange", handleWake);
      window.removeEventListener("focus", handleWake);
      window.removeEventListener("online", handleWake);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, triggerCatchUpSync]);

  const sendMessage = useCallback(
    (data: {
      channel_id?: string;
      dm_thread_id?: string;
      content: string;
      content_html?: string;
      parent_message_id?: string;
      attachments?: Array<{ file_name: string; file_url: string; file_size?: number; mime_type?: string }>;
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", data);
      } else {
        // Fallback to REST API if socket is disconnected/reconnecting
        if (data.channel_id) {
          import("@/services/messengerService").then(({ sendChannelMessage }) => {
            sendChannelMessage(data.channel_id!, {
              content: data.content,
              content_html: data.content_html,
              parent_message_id: data.parent_message_id,
              attachments: data.attachments,
            })
              .then((res) => {
                if (res?.message) {
                  newMessageHandlers.current.forEach((fn) => fn(res.message));
                }
              })
              .catch((err) => console.error("[TeamComms] Failed to send channel message via REST fallback:", err));
          });
        } else if (data.dm_thread_id) {
          import("@/services/messengerService").then(({ sendDMMessage }) => {
            sendDMMessage(data.dm_thread_id!, {
              content: data.content,
              content_html: data.content_html,
              attachments: data.attachments,
            })
              .then((res) => {
                if (res?.message) {
                  newDMMessageHandlers.current.forEach((fn) => fn(res.message));
                }
              })
              .catch((err) => console.error("[TeamComms] Failed to send DM message via REST fallback:", err));
          });
        }
      }
    },
    []
  );

  const joinChannel = useCallback((channelId: string) => {
    activeRoomRef.current = { type: "channel", id: channelId };
    socketRef.current?.emit("join_channel", { channel_id: channelId });
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (activeRoomRef.current?.id === channelId) activeRoomRef.current = null;
    socketRef.current?.emit("leave_channel", { channel_id: channelId });
  }, []);

  const joinDM = useCallback((threadId: string) => {
    activeRoomRef.current = { type: "dm", id: threadId };
    socketRef.current?.emit("join_dm", { dm_thread_id: threadId });
  }, []);

  const leaveDM = useCallback((threadId: string) => {
    if (activeRoomRef.current?.id === threadId) activeRoomRef.current = null;
    socketRef.current?.emit("leave_dm", { dm_thread_id: threadId });
  }, []);

  const startTyping = useCallback((channelId: string) => {
    socketRef.current?.emit("typing_start", { channel_id: channelId });
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    socketRef.current?.emit("typing_stop", { channel_id: channelId });
  }, []);

  const markRead = useCallback((channelId: string) => {
    socketRef.current?.emit("mark_read", { channel_id: channelId });
  }, []);

  const markChannelRead = useCallback((channelId: string) => {
    socketRef.current?.emit("mark_channel_read", { channel_id: channelId });
    import("@/services/messengerService").then(({ markChannelRead: apiCall }) => {
      apiCall(channelId).catch(() => {});
    });
  }, []);

  const markDMRead = useCallback((threadId: string) => {
    socketRef.current?.emit("mark_dm_read", { dm_thread_id: threadId });
    import("@/services/messengerService").then(({ markDMRead: apiCall }) => {
      apiCall(threadId).catch(() => {});
    });
  }, []);

  const toggleReaction = useCallback((data: { message_id: string; emoji: string; channel_id?: string; dm_thread_id?: string }) => {
    socketRef.current?.emit("toggle_reaction", data);
    import("@/services/messengerService").then(({ toggleReaction: apiCall }) => {
      apiCall(data.message_id, data.emoji).catch(() => {});
    });
  }, []);

  const deleteMessage = useCallback((messageId: string, channelId?: string, dmThreadId?: string) => {
    socketRef.current?.emit("delete_message", { message_id: messageId, channel_id: channelId, dm_thread_id: dmThreadId });
    import("@/services/messengerService").then(({ deleteMessage: apiCall }) => {
      apiCall(messageId).catch(() => {});
    });
  }, []);

  const onNewMessage = useCallback((handler: (msg: ChatMessage) => void) => {
    newMessageHandlers.current.add(handler);
    return () => { newMessageHandlers.current.delete(handler); };
  }, []);

  const onNewDMMessage = useCallback((handler: (msg: ChatMessage) => void) => {
    newDMMessageHandlers.current.add(handler);
    return () => { newDMMessageHandlers.current.delete(handler); };
  }, []);

  const onReactionUpdated = useCallback((handler: (data: { message_id: string; reactions: Array<{ emoji: string; count: number; users: string[] }>; user_id: string; emoji: string; action: string }) => void) => {
    reactionHandlers.current.add(handler);
    return () => { reactionHandlers.current.delete(handler); };
  }, []);

  const onMessageDeleted = useCallback((handler: (data: { message_id: string; channel_id?: string; dm_thread_id?: string; deleted_at: string; user_id: string }) => void) => {
    deletedHandlers.current.add(handler);
    return () => { deletedHandlers.current.delete(handler); };
  }, []);

  const onDMNotification = useCallback((handler: (data: { dm_thread_id: string; sender_id: string; sender_name: string; content: string; created_at: string }) => void) => {
    dmNotificationHandlers.current.add(handler);
    return () => { dmNotificationHandlers.current.delete(handler); };
  }, []);

  const onPersonalNotification = useCallback((handler: (data: unknown) => void) => {
    personalNotificationHandlers.current.add(handler);
    return () => { personalNotificationHandlers.current.delete(handler); };
  }, []);

  const onSyncNeeded = useCallback((handler: () => void) => {
    syncNeededHandlers.current.add(handler);
    return () => { syncNeededHandlers.current.delete(handler); };
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    typingUsers,
    syncTrigger,
    sendMessage,
    joinChannel,
    leaveChannel,
    joinDM,
    leaveDM,
    startTyping,
    stopTyping,
    markRead,
    markChannelRead,
    markDMRead,
    toggleReaction,
    deleteMessage,
    triggerCatchUpSync,
    onNewMessage,
    onNewDMMessage,
    onReactionUpdated,
    onMessageDeleted,
    onDMNotification,
    onPersonalNotification,
    onSyncNeeded,
  };

  return <MessengerContext.Provider value={value}>{children}</MessengerContext.Provider>;
};

export const useMessengerContext = (): MessengerContextType => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error("useMessengerContext must be used within a MessengerProvider");
  }
  return context;
};
