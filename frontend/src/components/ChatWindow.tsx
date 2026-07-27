"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Info, ShieldCheck, Paperclip, Smile } from "lucide-react";
import { Conversation, Message, User } from "@/lib/types";
import { conversationTitle, otherMember, lastSeenLabel } from "@/lib/format";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  conversation,
  messages,
  currentUser,
  typingUserIds,
  onSend,
  onTyping,
  onOpenInfo,
}: {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  typingUserIds: Set<number>;
  onSend: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  onOpenInfo: () => void;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = conversationTitle(conversation, currentUser.id);
  const other = conversation.type === "direct" ? otherMember(conversation, currentUser.id) : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation.id]);

  function handleChange(v: string) {
    setDraft(v);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
    onTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }

  const membersById = new Map(conversation.members.map((m) => [m.user.id, m.user]));
  const typingNames = Array.from(typingUserIds)
    .map((id) => membersById.get(id)?.display_name)
    .filter(Boolean) as string[];

  let lastDate = "";

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--sidebar-border)] bg-white">
        <button onClick={onOpenInfo} className="flex items-center gap-3 text-left">
          <Avatar name={title} color={conversation.avatar_color} online={other?.is_online} />
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-[var(--text-secondary)]">
              {conversation.type === "group"
                ? `${conversation.members.length} members`
                : other?.is_online
                ? "Online"
                : other
                ? `Last seen ${lastSeenLabel(other.last_seen)}`
                : ""}
            </div>
          </div>
        </button>
        <button onClick={onOpenInfo} className="p-2 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
          <Info size={18} />
        </button>
      </div>

      {/* Encryption banner */}
      <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-[var(--text-secondary)] bg-[var(--chat-bg)] border-b border-[var(--sidebar-border)]">
        <ShieldCheck size={12} />
        Messages are simulated end-to-end encrypted for this demo
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[var(--chat-bg)] px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--text-secondary)] mt-10">
            No messages yet. Say hello 👋
          </div>
        )}
        {messages.map((m, idx) => {
          const dateStr = new Date(m.created_at).toDateString();
          const showDivider = dateStr !== lastDate;
          lastDate = dateStr;
          const isOwn = m.sender_id === currentUser.id;
          const prevSameSender = idx > 0 && messages[idx - 1].sender_id === m.sender_id;
          const sender = membersById.get(m.sender_id);

          return (
            <div key={m.id}>
              {showDivider && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-[11px] bg-white text-[var(--text-secondary)] px-3 py-1 rounded-full shadow-sm">
                    {new Date(m.created_at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}
                  </span>
                </div>
              )}
              <MessageBubble
                message={m}
                isOwn={isOwn}
                showSender={conversation.type === "group" && !prevSameSender}
                senderName={sender?.display_name}
                senderColor={sender?.avatar_color}
              />
            </div>
          );
        })}

        {typingNames.length > 0 && (
          <div className="flex justify-start px-1 mt-1">
            <div className="bg-white border border-[var(--sidebar-border)] rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">{typingNames.join(", ")}</span>
              <span className="flex gap-0.5">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] inline-block" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--sidebar-border)] bg-white">
        <button title="Attachments — coming soon" className="p-2 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
          <Paperclip size={20} />
        </button>
        <div className="flex-1 flex items-end bg-[var(--row-hover)] rounded-2xl px-3 py-2">
          <textarea
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Type a message"
            className="flex-1 bg-transparent resize-none outline-none text-sm max-h-32"
          />
          <button title="Emoji — coming soon" className="p-1 text-[var(--text-secondary)]">
            <Smile size={18} />
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="p-2.5 rounded-full bg-[var(--signal-blue)] text-white disabled:opacity-40 hover:bg-[var(--signal-blue-dark)] transition"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
