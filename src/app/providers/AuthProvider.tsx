"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@lib/api";
import { clearToken, getToken, setToken } from "@lib/auth";
import Splash from "@components/Splash";

type User = { id: string; email: string; username: string };

type AuthContextType = {
  user: User | null;
  isAuthed: boolean;
  ready: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthCtx = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const me = await api.me();
        if (!cancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setUser(me.user as any);
          setReady(true);
        }
      } catch {
        clearToken();
        if (!cancelled) {
          setUser(null);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthed: !!user,
      ready,
      login: (token, u) => {
        setToken(token);
        setUser(u);
      },
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, ready]
  );

  if (!ready) return <Splash />;

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
