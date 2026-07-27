"use client";

import { useState } from "react";
import { UserPlus, UserMinus, Crown } from "lucide-react";
import { Conversation, User } from "@/lib/types";
import { conversationTitle, otherMember, lastSeenLabel } from "@/lib/format";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function InfoPanel({
  conversation,
  currentUser,
  onClose,
  onAddMembers,
  onRemoveMember,
}: {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
  onAddMembers: (usernames: string[]) => void;
  onRemoveMember: (userId: number) => void;
}) {
  const [addValue, setAddValue] = useState("");
  const title = conversationTitle(conversation, currentUser.id);
  const other = conversation.type === "direct" ? otherMember(conversation, currentUser.id) : undefined;
  const myMembership = conversation.members.find((m) => m.user.id === currentUser.id);
  const isAdmin = myMembership?.role === "admin";

  return (
    <Modal title={conversation.type === "group" ? "Group info" : "Contact info"} onClose={onClose} width={380}>
      <div className="flex flex-col items-center text-center mb-5">
        <Avatar name={title} color={conversation.avatar_color} size={72} online={other?.is_online} />
        <div className="text-base font-semibold mt-3">{title}</div>
        {conversation.type === "direct" && other && (
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {other.is_online ? "Online" : `Last seen ${lastSeenLabel(other.last_seen)}`} · @{other.username}
          </div>
        )}
        {conversation.type === "group" && (
          <div className="text-xs text-[var(--text-secondary)] mt-1">{conversation.members.length} members</div>
        )}
      </div>

      {conversation.type === "group" && (
        <>
          {isAdmin && (
            <div className="flex gap-2 mb-4">
              <input
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="Add member by username"
                className="flex-1 bg-[var(--row-hover)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--signal-blue)]/30"
              />
              <button
                onClick={() => {
                  if (!addValue.trim()) return;
                  onAddMembers([addValue.trim()]);
                  setAddValue("");
                }}
                className="p-2 rounded-lg bg-[var(--signal-blue)] text-white hover:bg-[var(--signal-blue-dark)]"
              >
                <UserPlus size={16} />
              </button>
            </div>
          )}

          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Members</div>
          <div className="space-y-1">
            {conversation.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-3 px-1 py-1.5">
                <Avatar name={m.user.display_name} color={m.user.avatar_color} size={36} online={m.user.is_online} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {m.user.display_name}
                    {m.role === "admin" && <Crown size={12} className="text-amber-500" />}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">@{m.user.username}</div>
                </div>
                {isAdmin && m.user.id !== currentUser.id && (
                  <button
                    onClick={() => onRemoveMember(m.user.id)}
                    title="Remove from group"
                    className="p-1.5 rounded-full hover:bg-red-50 text-red-500"
                  >
                    <UserMinus size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 pt-4 border-t border-[var(--sidebar-border)] space-y-2">
        {["Mute notifications", "Disappearing messages", "Block contact"].map((label) => (
          <div key={label} className="text-sm text-[var(--text-secondary)] flex items-center justify-between">
            <span>{label}</span>
            <span className="text-xs bg-[var(--row-hover)] px-2 py-0.5 rounded-full">Coming soon</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
