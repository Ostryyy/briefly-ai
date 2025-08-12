"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@lib/api";
import { useAuth } from "@providers/AuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
};

export default function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: Props) {
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const userRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMode(initialMode);
      setEmail("");
      setUsername("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      (mode === "register" ? userRef.current : emailRef.current)?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [open, mode]);

  if (!open || typeof document === "undefined") return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        const res = await api.login({ email, password });
        login(res.token, res.user);
      } else {
        const res = await api.register({ email, username, password });
        login(res.token, res.user);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="auth-modal"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <button
            data-testid="auth-close"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <input
            ref={emailRef}
            className="w-full rounded border px-3 py-2"
            placeholder="Email"
            type="email"
            id="auth-email"
            data-testid="auth-email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode === "register" && (
            <input
              id="auth-username"
              data-testid="auth-username"
              ref={userRef}
              className="w-full rounded border px-3 py-2"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Password"
            type="password"
            id="auth-password"
            data-testid="auth-password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            data-testid="auth-submit"
            disabled={busy}
            onClick={submit}
            className="mt-1 w-full rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
          </button>

          <div className="pt-1 text-center text-xs text-gray-500">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  data-testid="auth-goto-register"
                  type="button"
                  className="underline cursor-pointer"
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  data-testid="auth-goto-login"
                  type="button"
                  className="underline cursor-pointer"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
