import {
  PaginatedJobs,
  SingleJobResponse,
  JobStatusType,
} from "@shared/types/jobs";
import { getToken } from "./auth";

function needsAuth(url: string) {
  return !/\/api\/auth\/(login|register)(\/|$)/.test(url);
}

async function http<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const url = typeof input === "string" ? input : input.url;

  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (needsAuth(url)) {
    const t = getToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || res.statusText);
  }
  return json as T;
}

export const api = {
  register(body: { email: string; username: string; password: string }) {
    return http<{
      token: string;
      user: { id: string; email: string; username: string };
    }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
  },

  login(body: { email: string; password: string }) {
    return http<{
      token: string;
      user: { id: string; email: string; username: string };
    }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
  },

  me() {
    return http<{ user: unknown }>("/api/auth/me", { method: "GET" });
  },

  startYoutube(body: {
    url: string;
    level: "short" | "medium" | "detailed" | "extreme";
  }) {
    return http<{ jobId: string }>("/api/youtube", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  startUpload(fd: FormData) {
    const token = getToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    return fetch(`/api/upload`, {
      method: "POST",
      headers,
      body: fd,
      credentials: "include",
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error((j as { error?: string }).error || r.statusText);
      return j as { jobId: string };
    });
  },

  jobs(
    params: {
      status?: JobStatusType | "active";
      page?: number;
      limit?: number;
    } = {}
  ) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", String(params.status));
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return http<PaginatedJobs>(`/api/jobs${qs ? `?${qs}` : ""}`);
  },

  job(jobId: string) {
    return http<SingleJobResponse>(`/api/jobs/${jobId}`);
  },
};
