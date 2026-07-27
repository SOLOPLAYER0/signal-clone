"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Mode = "login" | "register";
type RegisterStep = "phone" | "details";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // register state
  const [step, setStep] = useState<RegisterStep>("phone");
  const [phone, setPhone] = useState("");
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [regPassword, setRegPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.requestOtp(phone.trim());
      setOtpHint(res.hint);
      setStep("details");
    } catch (err: any) {
      setError(err.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        username: regUsername.trim(),
        phone: phone.trim(),
        display_name: displayName.trim(),
        password: regPassword,
        otp: otp.trim(),
      });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[var(--chat-bg)] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--signal-blue)] flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Signal Clone</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Private messaging, simplified for a demo build</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[var(--sidebar-border)] p-6">
          <div className="flex mb-6 bg-[var(--row-hover)] rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "login" ? "bg-white shadow-sm text-[var(--signal-blue)]" : "text-[var(--text-secondary)]"}`}
            >
              Log in
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "register" ? "bg-white shadow-sm text-[var(--signal-blue)]" : "text-[var(--text-secondary)]"}`}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Username">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. shashank"
                  className="input"
                  required
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  required
                />
              </Field>
              <SubmitButton busy={busy} label="Log in" />
              <p className="text-xs text-center text-[var(--text-secondary)] pt-1">
                Demo accounts: shashank / aarav / priya / kabir / neha — password: password123
              </p>
            </form>
          )}

          {mode === "register" && step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Field label="Phone number">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  className="input"
                  required
                />
              </Field>
              <SubmitButton busy={busy} label="Send verification code" />
            </form>
          )}

          {mode === "register" && step === "details" && (
            <form onSubmit={handleRegister} className="space-y-4">
              {otpHint && (
                <div className="text-xs bg-blue-50 text-[var(--signal-blue-dark)] rounded-lg px-3 py-2 flex items-center gap-2">
                  <Lock size={14} />
                  Mocked SMS sent — verification code is {otpHint}
                </div>
              )}
              <Field label="Verification code">
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="input" required />
              </Field>
              <Field label="Username">
                <input value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="Choose a username" className="input" required />
              </Field>
              <Field label="Display name">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="input" required />
              </Field>
              <Field label="Password">
                <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Create a password" className="input" required />
              </Field>
              <SubmitButton busy={busy} label="Create account" />
              <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-[var(--text-secondary)] hover:underline">
                Use a different phone number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
          Built as an SDE Fullstack assignment demo. Encryption is simulated, not real.
        </p>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--sidebar-border);
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: var(--signal-blue);
          box-shadow: 0 0 0 3px rgba(58, 118, 240, 0.12);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-[var(--signal-blue)] hover:bg-[var(--signal-blue-dark)] disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2"
    >
      {busy && <Loader2 className="animate-spin" size={16} />}
      {label}
    </button>
  );
}
