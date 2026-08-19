import { apiFetch } from "@/utils/api";
import type { ChatMessage } from "@/hooks/useMessenger";

const BASE = "/api/messenger";

export interface ChannelData {
  id: string;
  name: string;
  channel_type: string;
  unread_count: number;
  last_message?: { content: string; created_at: string; id?: string; user_id?: string } | null;
  description?: string;
  member_role?: string;
  muted?: boolean;
  last_read_at?: string;
}

export interface DMThreadData {
  id: string;
  other_user_id: string;
  other_first_name: string;
  other_last_name: string;
  other_avatar_url?: string;
  other_role?: string;
  last_message?: { content: string; created_at: string; user_id?: string } | null;
}

export interface OrgUserData {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role?: string;
  email?: string;
}

export interface UnreadCountData {
  channel_id: string;
  name: string;
  unread_count: number;
}

// ─── Organization ───────────────────────────────────────────
export const getMyOrganizations = () =>
  apiFetch<{ organizations: Array<{ id: string; name: string; logo_url?: string; role: string; joined_at: string }> }>(
    `${BASE}/my-organizations`
  );

// ─── Channels ───────────────────────────────────────────────
export const getChannels = (orgId?: string) =>
  apiFetch<{ channels: ChannelData[] }>(`${BASE}/channels${orgId ? `?org_id=${orgId}` : ""}`);

export const createChannel = (body: {
  name: string;
  description?: string;
  channel_type?: string;
  member_ids?: string[];
  org_id?: string;
}) =>
  apiFetch<{ channel: ChannelData }>(`${BASE}/channels`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateChannel = (id: string, body: { name?: string; description?: string }) =>
  apiFetch<{ channel: ChannelData }>(`${BASE}/channels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const joinChannel = (id: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/channels/${id}/join`, { method: "POST" });

export const inviteToChannel = (id: string, userIds: string[]) =>
  apiFetch<{ success: boolean; added: number }>(`${BASE}/channels/${id}/invite`, {
    method: "POST",
    body: JSON.stringify({ user_ids: userIds }),
  });

export const removeMember = (channelId: string, memberId: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/channels/${channelId}/members/${memberId}`, {
    method: "DELETE",
  });

export const getChannelMembers = (channelId: string) =>
  apiFetch<{ members: any[] }>(`${BASE}/channels/${channelId}/members`);

export interface AttachmentItem {
  id?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
}

// ─── File Uploads ───────────────────────────────────────────
export const uploadMessengerFiles = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  return apiFetch<{
    files: Array<{
      file_name: string;
      file_url: string;
      file_size: number;
      mime_type: string;
    }>;
  }>(`${BASE}/upload`, {
    method: "POST",
    body: formData,
  });
};

// ─── Messages ───────────────────────────────────────────────
export const getMessages = (channelId: string, before?: string, limit = 50) =>
  apiFetch<{ messages: ChatMessage[]; has_more: boolean }>(
    `${BASE}/channels/${channelId}/messages?limit=${limit}${before ? `&before=${before}` : ""}`
  );

export const sendMessage = (
  channelId: string,
  body: {
    content: string;
    content_html?: string;
    parent_message_id?: string;
    attachments?: AttachmentItem[];
  }
) =>
  apiFetch<{ message: ChatMessage }>(`${BASE}/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const editMessage = (
  messageId: string,
  body: { content: string; content_html?: string }
) =>
  apiFetch<{ message: ChatMessage }>(`${BASE}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const deleteMessage = (messageId: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/messages/${messageId}`, { method: "DELETE" });

export const getThread = (messageId: string) =>
  apiFetch<{ replies: ChatMessage[] }>(`${BASE}/messages/${messageId}/thread`);

// ─── Reactions ──────────────────────────────────────────────
export const toggleReaction = (messageId: string, emoji: string) =>
  apiFetch<{
    action: "added" | "removed";
    emoji: string;
    reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  }>(`${BASE}/messages/${messageId}/react`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });

// ─── Read / Unread ──────────────────────────────────────────
export const markRead = (messageId: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/messages/${messageId}/read`, { method: "POST" });

export const markDMRead = (threadId: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/dms/${threadId}/read`, { method: "POST" });

export const markChannelRead = (channelId: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/channels/${channelId}/read`, { method: "POST" });

export const getUnreadCounts = (orgId?: string) =>
  apiFetch<{
    channels: UnreadCountData[];
    dms?: Array<{ dm_thread_id: string; unread_count: number }>;
    total_unread: number;
  }>(`${BASE}/unread${orgId ? `?org_id=${orgId}` : ""}`);

// ─── Direct Messages ────────────────────────────────────────
export const getDMs = (orgId?: string) =>
  apiFetch<{ dms: DMThreadData[] }>(`${BASE}/dms${orgId ? `?org_id=${orgId}` : ""}`);

export const startDM = (otherUserId: string, orgId?: string) =>
  apiFetch<{ dm_thread: { id: string; [key: string]: any } }>(`${BASE}/dms`, {
    method: "POST",
    body: JSON.stringify({ other_user_id: otherUserId, org_id: orgId }),
  });

export const getDMMessages = (threadId: string, before?: string, limit = 50) =>
  apiFetch<{ messages: ChatMessage[]; has_more: boolean }>(
    `${BASE}/dms/${threadId}/messages?limit=${limit}${before ? `&before=${before}` : ""}`
  );

export const sendDMMessage = (
  threadId: string,
  body: { content: string; content_html?: string; attachments?: AttachmentItem[] }
) =>
  apiFetch<{ message: ChatMessage }>(`${BASE}/dms/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Search ─────────────────────────────────────────────────
export const searchMessages = (query: string, orgId?: string) =>
  apiFetch<{ results: any[]; query: string }>(
    `${BASE}/search?q=${encodeURIComponent(query)}${orgId ? `&org_id=${orgId}` : ""}`
  );

// ─── People ─────────────────────────────────────────────────
export const getUsers = (orgId?: string) =>
  apiFetch<{ users: OrgUserData[] }>(`${BASE}/users${orgId ? `?org_id=${orgId}` : ""}`);

// ─── Settings ───────────────────────────────────────────────
export const getMessengerSettings = () =>
  apiFetch<{ settings: any; scheduled_reports?: any[] }>(`${BASE}/settings`);

export const updateMessengerSettings = (body: Record<string, unknown>) =>
  apiFetch<{ settings: any }>(`${BASE}/settings`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

// ─── Scheduled Reports ──────────────────────────────────────
export const createScheduledReport = (body: {
  channel_id: string;
  report_type: string;
  cron_expression: string;
}) =>
  apiFetch<{ report: any }>(`${BASE}/scheduled-reports`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteScheduledReport = (id: string) =>
  apiFetch<{ success: boolean }>(`${BASE}/scheduled-reports/${id}`, { method: "DELETE" });
