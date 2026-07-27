import { Conversation, User } from "./types";

export function conversationTitle(conv: Conversation, currentUserId: number): string {
  if (conv.type === "group") return conv.name || "Unnamed group";
  const other = conv.members.find((m) => m.user.id !== currentUserId);
  return other?.user.display_name || "Unknown";
}

export function otherMember(conv: Conversation, currentUserId: number): User | undefined {
  return conv.members.find((m) => m.user.id !== currentUserId)?.user;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });

  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function lastSeenLabel(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}
