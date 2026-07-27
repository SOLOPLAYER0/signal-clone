"use client";

import { useState } from "react";
import { Check, CheckCheck, Clock, SmilePlus } from "lucide-react";
import { Message } from "@/lib/types";
import { formatMessageTime } from "@/lib/format";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function StatusTicks({ status }: { status: Message["status"] }) {
  if (status === "sending") return <Clock size={13} className="text-white/70" />;
  if (status === "sent") return <Check size={15} className="text-white/70" />;
  if (status === "delivered") return <CheckCheck size={15} className="text-white/70" />;
  return <CheckCheck size={15} className="text-sky-300" />;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  senderName,
  senderColor,
  currentUserId,
  onReact,
}: {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  senderName?: string;
  senderColor?: string;
  currentUserId: number;
  onReact: (emoji: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Group individual reactions into { emoji -> count, reactedByMe }
  const grouped = message.reactions.reduce<Record<string, { count: number; mine: boolean }>>((acc, r) => {
    const entry = acc[r.emoji] || { count: 0, mine: false };
    entry.count += 1;
    if (r.user_id === currentUserId) entry.mine = true;
    acc[r.emoji] = entry;
    return acc;
  }, {});
  const reactionEntries = Object.entries(grouped);

  return (
    <div className={`group flex ${isOwn ? "justify-end" : "justify-start"} mb-1.5 px-1`}>
      <div className={`flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        <div className="relative">
          <div
            className={`max-w-[480px] rounded-2xl px-3.5 py-2 shadow-sm ${
              isOwn
                ? "bg-[var(--bubble-sent)] text-white rounded-br-md"
                : "bg-[var(--bubble-received)] text-[var(--text-primary)] rounded-bl-md border border-[var(--sidebar-border)]"
            }`}
          >
            {showSender && !isOwn && senderName && (
              <div className="text-xs font-semibold mb-0.5" style={{ color: senderColor }}>
                {senderName}
              </div>
            )}
            <div className="text-sm whitespace-pre-wrap break-words leading-snug">{message.content}</div>
            <div className={`flex items-center gap-1 justify-end mt-1 ${isOwn ? "text-white/70" : "text-[var(--text-secondary)]"}`}>
              <span className="text-[10px]">{formatMessageTime(message.created_at)}</span>
              {isOwn && <StatusTicks status={message.status} />}
            </div>
          </div>

          {reactionEntries.length > 0 && (
            <div className={`flex gap-1 mt-1 flex-wrap ${isOwn ? "justify-end" : "justify-start"}`}>
              {reactionEntries.map(([emoji, info]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={`text-xs rounded-full px-1.5 py-0.5 border shadow-sm flex items-center gap-1 ${
                    info.mine
                      ? "bg-[var(--row-active)] border-[var(--signal-blue)]"
                      : "bg-[var(--bubble-received)] border-[var(--sidebar-border)]"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[var(--text-secondary)]">{info.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover-to-react trigger */}
        <div className="relative opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="p-1.5 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]"
            title="React"
          >
            <SmilePlus size={16} />
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div
                className={`absolute z-20 top-full mt-1 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-full shadow-lg px-2 py-1.5 flex gap-1 ${
                  isOwn ? "right-0" : "left-0"
                }`}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setPickerOpen(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
