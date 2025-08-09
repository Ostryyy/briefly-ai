type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

export const TOKEN_KEY = "briefly_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  notify();
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  notify();
}

export function onAuthChange(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isAuthed(): boolean {
  return !!getToken();
}
