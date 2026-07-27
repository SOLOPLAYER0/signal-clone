"use client";

import { useMemo, useState } from "react";
import { Search, SquarePen, Users, LogOut, Settings, Moon, Sun } from "lucide-react";
import { Conversation, User } from "@/lib/types";
import { conversationTitle, otherMember, formatTime } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import Avatar, { initials } from "./Avatar";

export default function Sidebar({
  conversations,
  currentUser,
  activeId,
  onSelect,
  onNewDirect,
  onNewGroup,
  onLogout,
  typingByConv,
}: {
  conversations: Conversation[];
  currentUser: User;
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewDirect: () => void;
  onNewGroup: () => void;
  onLogout: () => void;
  typingByConv: Record<number, Set<number>>;
}) {
  const [query, setQuery] = useState("");
  const { theme, toggleTheme } = useTheme();

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => conversationTitle(c, currentUser.id).toLowerCase().includes(q));
  }, [conversations, query, currentUser.id]);

  return (
    <div className="w-[360px] flex-shrink-0 h-full flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2.5">
          <Avatar name={currentUser.display_name} color={currentUser.avatar_color} size={36} />
          <div>
            <div className="text-sm font-semibold leading-tight">{currentUser.display_name}</div>
            <div className="text-xs text-[var(--text-secondary)]">@{currentUser.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} title="Toggle dark mode" className="p-2 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onNewGroup} title="New group" className="p-2 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
            <Users size={18} />
          </button>
          <button onClick={onNewDirect} title="New chat" className="p-2 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
            <SquarePen size={18} />
          </button>
          <button onClick={onLogout} title="Log out" className="p-2 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[var(--sidebar-border)]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-[var(--row-hover)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--signal-blue)]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-[var(--text-secondary)] mt-10 px-6">
            {conversations.length === 0
              ? "No conversations yet. Start one with the pencil icon above."
              : "No conversations match your search."}
          </div>
        )}
        {filtered.map((conv) => {
          const title = conversationTitle(conv, currentUser.id);
          const other = conv.type === "direct" ? otherMember(conv, currentUser.id) : undefined;
          const isTyping = (typingByConv[conv.id]?.size ?? 0) > 0;
          const isActive = conv.id === activeId;
          const lastMine = conv.last_message?.sender_id === currentUser.id;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                isActive ? "bg-[var(--row-active)]" : "hover:bg-[var(--row-hover)]"
              }`}
            >
              <Avatar name={title} color={conv.avatar_color} online={other?.is_online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{title}</span>
                  {conv.last_message && (
                    <span className="text-[11px] text-[var(--text-secondary)] flex-shrink-0 ml-2">
                      {formatTime(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {isTyping ? (
                      <span className="text-[var(--signal-blue)] font-medium">typing…</span>
                    ) : conv.last_message ? (
                      `${lastMine ? "You: " : ""}${conv.last_message.content}`
                    ) : (
                      "No messages yet"
                    )}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 flex-shrink-0 bg-[var(--unread-badge)] text-white text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-[var(--sidebar-border)] flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Settings size={14} />
        <span>Privacy, notifications & appearance — coming soon</span>
      </div>
    </div>
  );
}

export { initials };
