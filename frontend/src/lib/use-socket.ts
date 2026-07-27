"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getToken } from "./api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type SocketEvent =
  | { type: "new_message"; message: any }
  | { type: "conversation_updated"; conversation_id: number }
  | { type: "typing"; conversation_id: number; user_id: number; is_typing: boolean }
  | { type: "read_receipt"; conversation_id: number; reader_id: number; up_to_message_id: number }
  | { type: "reaction_updated"; conversation_id: number; message_id: number; reactions: { emoji: string; user_id: number }[] }
  | { type: "presence"; user_id: number; online: boolean; last_seen?: string }
  | { type: "pong" };

export function useSocket(onEvent: (evt: SocketEvent) => void, enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handlerRef.current(data);
        } catch {
          // ignore malformed payloads
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [enabled]);

  const sendTyping = useCallback((conversationId: number, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", conversation_id: conversationId, is_typing: isTyping }));
    }
  }, []);

  return { connected, sendTyping };
}
