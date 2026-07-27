import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Signal Clone",
  description: "A Signal-inspired secure messaging demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
