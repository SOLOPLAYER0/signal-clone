"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/chat" : "/login");
  }, [user, loading, router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[var(--chat-bg)]">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--signal-blue)] border-t-transparent animate-spin" />
    </div>
  );
}
