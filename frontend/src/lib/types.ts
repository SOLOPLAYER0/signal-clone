export interface User {
  id: number;
  username: string;
  phone: string | null;
  display_name: string;
  avatar_url: string | null;
  avatar_color: string;
  is_online: boolean;
  last_seen: string;
}

export interface Member {
  user: User;
  role: "member" | "admin";
}

export interface MessagePreview {
  content: string;
  created_at: string;
  sender_id: number;
  status: string;
}

export interface Conversation {
  id: number;
  type: "direct" | "group";
  name: string | null;
  avatar_color: string;
  members: Member[];
  last_message: MessagePreview | null;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  status: "sending" | "sent" | "delivered" | "read";
  created_at: string;
}
