"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { User } from "@/lib/types";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function NewChatModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (username: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .searchUsers(query.trim())
        .then(setResults)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Modal title="New chat" onClose={onClose}>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or name"
          className="w-full bg-[var(--row-hover)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--signal-blue)]/30"
        />
      </div>

      {loading && <div className="text-xs text-[var(--text-secondary)] px-1">Searching…</div>}
      {!loading && query && results.length === 0 && (
        <div className="text-xs text-[var(--text-secondary)] px-1">No users found for &quot;{query}&quot;</div>
      )}

      <div className="space-y-1">
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => onStart(u.username)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--row-hover)] text-left"
          >
            <Avatar name={u.display_name} color={u.avatar_color} size={38} />
            <div>
              <div className="text-sm font-medium">{u.display_name}</div>
              <div className="text-xs text-[var(--text-secondary)]">@{u.username}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
