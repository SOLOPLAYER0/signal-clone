import { Check, CheckCheck, Clock } from "lucide-react";
import { Message } from "@/lib/types";
import { formatMessageTime } from "@/lib/format";

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
}: {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
  senderName?: string;
  senderColor?: string;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1.5 px-1`}>
      <div
        className={`max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm ${
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
    </div>
  );
}
