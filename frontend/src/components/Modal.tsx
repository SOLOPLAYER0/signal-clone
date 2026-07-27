"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  width = 420,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--sidebar-border)]">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--row-hover)] text-[var(--text-secondary)]">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
