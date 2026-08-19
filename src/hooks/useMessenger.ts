import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";

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

interface UseMessengerReturn {
  socket: Socket | null;
  isConnected: boolean;
  typingUsers: TypingUser[];
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
  onNewMessage: (handler: (msg: ChatMessage) => void) => () => void;
  onNewDMMessage: (handler: (msg: ChatMessage) => void) => () => void;
  onReactionUpdated: (handler: (data: { message_id: string; reactions: Array<{ emoji: string; count: number; users: string[] }>; user_id: string; emoji: string; action: string }) => void) => () => void;
  onMessageDeleted: (handler: (data: { message_id: string; channel_id?: string; dm_thread_id?: string; deleted_at: string; user_id: string }) => void) => () => void;
  onDMNotification: (handler: (data: { dm_thread_id: string; sender_id: string; sender_name: string; content: string; created_at: string }) => void) => () => void;
  onPersonalNotification: (handler: (data: unknown) => void) => () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useMessenger(): UseMessengerReturn {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const token = localStorage.getItem("ishpo_jwt");
    if (!user || !token) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[TeamComms] Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[TeamComms] Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("[TeamComms] Socket connection error:", err.message);
    });

    // Typing indicators
    socket.on("user_typing", (data: TypingUser) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.user_id === data.user_id && u.channel_id === data.channel_id))
          return prev;
        return [...prev, data];
      });
      // Auto-clear after 4s if no stop event
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const sendMessage = useCallback(
    (data: {
      channel_id?: string;
      dm_thread_id?: string;
      content: string;
      content_html?: string;
      parent_message_id?: string;
      attachments?: Array<{ file_name: string; file_url: string; file_size?: number; mime_type?: string }>;
    }) => {
      socketRef.current?.emit("send_message", data);
    },
    []
  );

  const joinChannel = useCallback((channelId: string) => {
    socketRef.current?.emit("join_channel", { channel_id: channelId });
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    socketRef.current?.emit("leave_channel", { channel_id: channelId });
  }, []);

  const joinDM = useCallback((threadId: string) => {
    socketRef.current?.emit("join_dm", { dm_thread_id: threadId });
  }, []);

  const leaveDM = useCallback((threadId: string) => {
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
    const socket = socketRef.current;
    socket?.on("new_message", handler);
    return () => { socket?.off("new_message", handler); };
  }, []);

  const onNewDMMessage = useCallback((handler: (msg: ChatMessage) => void) => {
    const socket = socketRef.current;
    socket?.on("new_dm_message", handler);
    return () => { socket?.off("new_dm_message", handler); };
  }, []);

  const onReactionUpdated = useCallback((handler: (data: { message_id: string; reactions: Array<{ emoji: string; count: number; users: string[] }>; user_id: string; emoji: string; action: string }) => void) => {
    const socket = socketRef.current;
    socket?.on("reaction_updated", handler);
    return () => { socket?.off("reaction_updated", handler); };
  }, []);

  const onMessageDeleted = useCallback((handler: (data: { message_id: string; channel_id?: string; dm_thread_id?: string; deleted_at: string; user_id: string }) => void) => {
    const socket = socketRef.current;
    socket?.on("message_deleted", handler);
    return () => { socket?.off("message_deleted", handler); };
  }, []);

  const onDMNotification = useCallback((handler: (data: { dm_thread_id: string; sender_id: string; sender_name: string; content: string; created_at: string }) => void) => {
    const socket = socketRef.current;
    socket?.on("dm_notification", handler);
    return () => { socket?.off("dm_notification", handler); };
  }, []);

  const onPersonalNotification = useCallback((handler: (data: unknown) => void) => {
    const socket = socketRef.current;
    socket?.on("personal_notification", handler);
    return () => { socket?.off("personal_notification", handler); };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    typingUsers,
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
    onNewMessage,
    onNewDMMessage,
    onReactionUpdated,
    onMessageDeleted,
    onDMNotification,
    onPersonalNotification,
  };
}
