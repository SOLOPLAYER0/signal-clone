"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Conversation, Message } from "@/lib/types";
import { useSocket, SocketEvent } from "@/lib/use-socket";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";
import NewGroupModal from "@/components/NewGroupModal";
import InfoPanel from "@/components/InfoPanel";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<number, Message[]>>({});
  const [typingByConv, setTypingByConv] = useState<Record<number, Set<number>>>({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = activeId;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const refreshConversations = useCallback(() => {
    api.listConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refreshConversations();
  }, [user, refreshConversations]);

  const loadMessages = useCallback(async (conversationId: number) => {
    const msgs = await api.getMessages(conversationId);
    setMessagesByConv((prev) => ({ ...prev, [conversationId]: msgs }));
  }, []);

  function selectConversation(id: number) {
    setActiveId(id);
    setShowInfo(false);
    if (!messagesByConv[id]) loadMessages(id);
    api.markRead(id).then(refreshConversations).catch(() => {});
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
  }

  const handleSocketEvent = useCallback(
    (evt: SocketEvent) => {
      if (evt.type === "new_message") {
        const msg: Message = evt.message;
        setMessagesByConv((prev) => {
          const existing = prev[msg.conversation_id] || [];
          if (existing.find((m) => m.id === msg.id)) return prev;
          return { ...prev, [msg.conversation_id]: [...existing, msg] };
        });
        if (msg.conversation_id === activeIdRef.current) {
          api.markRead(msg.conversation_id).then(refreshConversations).catch(() => {});
        } else {
          setToast("New message");
          setTimeout(() => setToast(null), 2500);
        }
        refreshConversations();
        setTypingByConv((prev) => {
          const set = new Set(prev[msg.conversation_id]);
          set.delete(msg.sender_id);
          return { ...prev, [msg.conversation_id]: set };
        });
      } else if (evt.type === "conversation_updated") {
        refreshConversations();
        if (evt.conversation_id === activeIdRef.current) {
          loadMessages(evt.conversation_id);
        }
      } else if (evt.type === "typing") {
        setTypingByConv((prev) => {
          const set = new Set(prev[evt.conversation_id] || []);
          if (evt.is_typing) set.add(evt.user_id);
          else set.delete(evt.user_id);
          return { ...prev, [evt.conversation_id]: set };
        });
      } else if (evt.type === "read_receipt") {
        setMessagesByConv((prev) => {
          const existing = prev[evt.conversation_id];
          if (!existing) return prev;
          return {
            ...prev,
            [evt.conversation_id]: existing.map((m) =>
              m.id <= evt.up_to_message_id && m.sender_id === user?.id ? { ...m, status: "read" } : m
            ),
          };
        });
      } else if (evt.type === "presence") {
        setConversations((prev) =>
          prev.map((c) => ({
            ...c,
            members: c.members.map((m) =>
              m.user.id === evt.user_id
                ? { ...m, user: { ...m.user, is_online: evt.online, last_seen: evt.last_seen || m.user.last_seen } }
                : m
            ),
          }))
        );
      }
    },
    [refreshConversations, loadMessages, user?.id]
  );

  const { sendTyping } = useSocket(handleSocketEvent, !!user);

  async function handleSend(content: string) {
    if (!activeId || !user) return;
    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      conversation_id: activeId,
      sender_id: user.id,
      content,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessagesByConv((prev) => ({ ...prev, [activeId]: [...(prev[activeId] || []), optimistic] }));

    try {
      const real = await api.sendMessage(activeId, content);
      setMessagesByConv((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] || []).map((m) => (m.id === tempId ? real : m)),
      }));
      refreshConversations();
    } catch {
      setMessagesByConv((prev) => ({
        ...prev,
        [activeId]: (prev[activeId] || []).filter((m) => m.id !== tempId),
      }));
    }
  }

  async function handleStartDirect(username: string) {
    const conv = await api.createDirect(username);
    setShowNewChat(false);
    refreshConversations();
    selectConversation(conv.id);
  }

  async function handleCreateGroup(name: string, usernames: string[]) {
    const conv = await api.createGroup(name, usernames);
    setShowNewGroup(false);
    refreshConversations();
    selectConversation(conv.id);
  }

  async function handleAddMembers(usernames: string[]) {
    if (!activeId) return;
    await api.addMembers(activeId, usernames);
    refreshConversations();
  }

  async function handleRemoveMember(userId: number) {
    if (!activeId) return;
    await api.removeMember(activeId, userId);
    refreshConversations();
  }

  if (loading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--chat-bg)]">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--signal-blue)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentUser={user}
        activeId={activeId}
        onSelect={selectConversation}
        onNewDirect={() => setShowNewChat(true)}
        onNewGroup={() => setShowNewGroup(true)}
        onLogout={logout}
        typingByConv={typingByConv}
      />

      {activeConversation ? (
        <ChatWindow
          conversation={activeConversation}
          messages={messagesByConv[activeConversation.id] || []}
          currentUser={user}
          typingUserIds={typingByConv[activeConversation.id] || new Set()}
          onSend={handleSend}
          onTyping={(isTyping) => sendTyping(activeConversation.id, isTyping)}
          onOpenInfo={() => setShowInfo(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--chat-bg)] text-[var(--text-secondary)]">
          <MessageSquare size={48} className="mb-3 opacity-40" />
          <p className="text-sm">Select a conversation or start a new one</p>
        </div>
      )}

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onStart={handleStartDirect} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreate={handleCreateGroup} />}
      {showInfo && activeConversation && (
        <InfoPanel
          conversation={activeConversation}
          currentUser={user}
          onClose={() => setShowInfo(false)}
          onAddMembers={handleAddMembers}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {toast && (
        <div className="toast-enter fixed top-4 right-4 bg-white border border-[var(--sidebar-border)] shadow-lg rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
          <MessageSquare size={14} className="text-[var(--signal-blue)]" />
          {toast}
        </div>
      )}
    </div>
  );
}
