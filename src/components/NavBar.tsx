"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@providers/AuthProvider";
import AuthModal from "@components/AuthModal";

export default function Navbar() {
  const { isAuthed, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-xl">
          Briefly<span className="text-blue-600">.AI</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthed ? (
            <>
              <Link href="/jobs" className="hover:underline">
                Jobs
              </Link>
              <button
                className="rounded bg-black px-3 py-1 text-white"
                onClick={logout}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="rounded bg-black px-3 py-1 text-white"
              onClick={() => setAuthOpen(true)}
            >
              Sign in
            </button>
          )}
        </nav>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </nav>
  );
}
