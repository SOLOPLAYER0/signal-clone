import { Conversation, Message, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("signal_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  requestOtp: (phone: string) =>
    request<{ message: string; hint: string }>("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  register: (payload: { username: string; phone: string; password: string; display_name: string; otp: string }) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (username: string, password: string) =>
    request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<User>("/auth/me"),

  searchUsers: (q: string) => request<User[]>(`/contacts/search?q=${encodeURIComponent(q)}`),

  listContacts: () => request<{ id: number; contact_user: User }[]>("/contacts"),

  addContact: (username: string) =>
    request<{ id: number; contact_user: User }>("/contacts", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  listConversations: () => request<Conversation[]>("/conversations"),

  createDirect: (username: string) =>
    request<Conversation>("/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  createGroup: (name: string, member_usernames: string[]) =>
    request<Conversation>("/conversations/group", {
      method: "POST",
      body: JSON.stringify({ name, member_usernames }),
    }),

  getMessages: (conversationId: number) => request<Message[]>(`/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: number, content: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  markRead: (conversationId: number) =>
    request<{ ok: boolean }>(`/conversations/${conversationId}/read`, { method: "POST" }),

  addMembers: (conversationId: number, usernames: string[]) =>
    request<{ added: number[] }>(`/conversations/${conversationId}/members`, {
      method: "POST",
      body: JSON.stringify({ usernames }),
    }),

  removeMember: (conversationId: number, userId: number) =>
    request<{ ok: boolean }>(`/conversations/${conversationId}/members/${userId}`, { method: "DELETE" }),
};

export function setToken(token: string) {
  localStorage.setItem("signal_token", token);
}

export function clearToken() {
  localStorage.removeItem("signal_token");
}

export { getToken, API_URL };
