"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@lib/api";
import { isAuthed } from "@lib/auth";
import AuthModal from "@components/AuthModal";
import { useJobStream } from "@lib/sse";
import StatusBadge from "./StatusBadge";
import type { JobStatusType } from "@shared/types/jobs";

type Level = "short" | "medium" | "detailed" | "extreme";

const steps: JobStatusType[] = [
  "PENDING",
  "DOWNLOADING",
  "TRANSCRIBING",
  "SUMMARIZING",
  "READY",
];

export default function JobForm() {
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
  const [level, setLevel] = useState<Level>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const status = useJobStream(jobId ?? undefined);

  useEffect(() => {
    if (!isAuthed()) setAuthOpen(true);
  }, []);

  const activeStepIndex = useMemo(() => {
    if (!status) return 0;
    const i = steps.indexOf(status.status);
    return i >= 0 ? i : 0;
  }, [status]);

  const onSubmit = async () => {
    if (!isAuthed()) {
      setAuthOpen(true);
      return;
    }
    try {
      if (mode === "upload") {
        if (!file) return alert("Choose a file");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("level", level);
        const { jobId } = await api.startUpload(fd);
        setJobId(jobId);
      } else {
        if (!url) return alert("Paste a YouTube URL");
        const { jobId } = await api.startYoutube({ url, level });
        setJobId(jobId);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start job");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          <button
            className={`px-3 py-1 text-sm rounded-full ${
              mode === "upload" ? "bg-white shadow" : ""
            }`}
            onClick={() => setMode("upload")}
          >
            Upload
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full ${
              mode === "youtube" ? "bg-white shadow" : ""
            }`}
            onClick={() => setMode("youtube")}
          >
            YouTube
          </button>
        </div>

        <select
          className="ml-auto rounded-lg border bg-white px-3 py-1.5 text-sm"
          value={level}
          onChange={(e) => setLevel(e.target.value as Level)}
        >
          <option value="short">short</option>
          <option value="medium">medium</option>
          <option value="detailed">detailed</option>
          <option value="extreme">extreme</option>
        </select>
      </div>

      {mode === "upload" ? (
        <label className="block w-full cursor-pointer rounded-xl border border-dashed bg-gray-50 p-6 text-center hover:bg-gray-100">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div className="text-sm text-gray-600">
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              "Drag & drop or click to select file"
            )}
          </div>
        </label>
      ) : (
        <input
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl border bg-white px-4 py-2"
        />
      )}

      <button
        onClick={onSubmit}
        className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
      >
        Start
      </button>

      {jobId && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Job ID: {jobId}</div>

          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-1.5 w-6 rounded ${
                    i <= activeStepIndex ? "bg-black" : "bg-gray-200"
                  }`}
                  aria-hidden
                />
                <span className="text-xs text-gray-700">{s}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div>{status ? <StatusBadge status={status.status} /> : null}</div>
            {status?.summary && (
              <a className="text-sm underline" href={`/jobs/${jobId}`}>
                Open summary
              </a>
            )}
          </div>

          {status?.message && (
            <div className="mt-2 text-xs text-gray-600">{status.message}</div>
          )}
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
