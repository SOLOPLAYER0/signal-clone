"use client";

import { useEffect, useState } from "react";
import { Search, Check } from "lucide-react";
import { User } from "@/lib/types";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import Modal from "./Modal";

export default function NewGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, usernames: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);

  useEffect(() => {
    api.listContacts().then((contacts) => setResults(contacts.map((c) => c.contact_user)));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      api.listContacts().then((contacts) => setResults(contacts.map((c) => c.contact_user)));
      return;
    }
    const handle = setTimeout(() => {
      api.searchUsers(query.trim()).then(setResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function toggle(u: User) {
    setSelected((prev) => (prev.find((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]));
  }

  function handleCreate() {
    if (!name.trim() || selected.length === 0) return;
    onCreate(name.trim(), selected.map((u) => u.username));
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        className="w-full bg-[var(--row-hover)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--signal-blue)]/30 mb-3"
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((u) => (
            <span
              key={u.id}
              onClick={() => toggle(u)}
              className="cursor-pointer text-xs bg-[var(--row-active)] text-[var(--signal-blue-dark)] px-2 py-1 rounded-full"
            >
              {u.display_name} ×
            </span>
          ))}
        </div>
      )}

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people to add"
          className="w-full bg-[var(--row-hover)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--signal-blue)]/30"
        />
      </div>

      <div className="space-y-1 mb-4">
        {results.map((u) => {
          const isSelected = !!selected.find((x) => x.id === u.id);
          return (
            <button
              key={u.id}
              onClick={() => toggle(u)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--row-hover)] text-left"
            >
              <Avatar name={u.display_name} color={u.avatar_color} size={38} />
              <div className="flex-1">
                <div className="text-sm font-medium">{u.display_name}</div>
                <div className="text-xs text-[var(--text-secondary)]">@{u.username}</div>
              </div>
              {isSelected && (
                <span className="w-5 h-5 rounded-full bg-[var(--signal-blue)] flex items-center justify-center">
                  <Check size={13} className="text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleCreate}
        disabled={!name.trim() || selected.length === 0}
        className="w-full bg-[var(--signal-blue)] hover:bg-[var(--signal-blue-dark)] disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition"
      >
        Create group
      </button>
    </Modal>
  );
}
