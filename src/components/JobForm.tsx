"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const [starting, setStarting] = useState(false);

  const [previewHidden, setPreviewHidden] = useState(false);

  const status = useJobStream(jobId ?? undefined);

  useEffect(() => {
    if (!isAuthed()) setAuthOpen(true);
  }, []);

  const activeStepIndex = useMemo(() => {
    if (!status) return 0;
    const i = steps.indexOf(status.status);
    return i >= 0 ? i : 0;
  }, [status]);

  const canSubmit = mode === "upload" ? !!file : !!url;

  const onSubmit = async () => {
    if (!isAuthed()) {
      setAuthOpen(true);
      return;
    }
    if (!canSubmit || starting) return;

    setStarting(true);
    setPreviewHidden(true);
    try {
      if (mode === "upload") {
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("level", level);
        const { jobId } = await api.startUpload(fd);
        setJobId(jobId);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        toast.success("Upload started");
      } else {
        if (!url) return;
        const { jobId } = await api.startYoutube({ url, level });
        setJobId(jobId);
        setUrl("");
        toast.success("YouTube job started");
      }
      setPreviewHidden(false);
    } catch (e) {
      toast.error(
        <span data-testid="toast-job-start-error">
          Could not start the job
        </span>,
        {
          description: e instanceof Error ? e.message : "Failed to start job",
        }
      );
    } finally {
      setStarting(false);
    }
  };

  const showOverlay = starting;

  return (
    <div className="relative space-y-6">
      <div
        className={`${
          showOverlay ? "pointer-events-none opacity-60" : ""
        } space-y-4 sm:space-y-6`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-gray-100 p-1">
            <button
              className={`px-3 py-1 text-sm rounded-full cursor-pointer ${
                mode === "upload" ? "bg-white shadow" : ""
              }`}
              data-testid="jobform-mode-upload"
              onClick={() => setMode("upload")}
              disabled={starting}
            >
              Upload
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-full cursor-pointer ${
                mode === "youtube" ? "bg-white shadow" : ""
              }`}
              data-testid="jobform-mode-youtube"
              onClick={() => setMode("youtube")}
              disabled={starting}
            >
              YouTube
            </button>
          </div>

          <select
            data-testid="jobform-level-select"
            className="ml-auto rounded-lg border bg-white px-3 py-1.5 text-sm cursor-pointer"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            disabled={starting}
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
              id="jobform-file-input"
              data-testid="jobform-file-input"
              accept="audio/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              disabled={starting}
              ref={fileInputRef}
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
            id="jobform-youtube-url"
            data-testid="jobform-youtube-url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-2"
            disabled={starting}
          />
        )}

        <button
          data-testid="jobform-submit"
          onClick={onSubmit}
          disabled={!canSubmit || starting}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white hover:opacity-90 cursor-pointer ${
            !canSubmit || starting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-black"
          }`}
          aria-busy={starting}
        >
          {starting && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          <span>Start</span>
        </button>
      </div>

      {showOverlay && (
        <div
          data-testid="jobform-overlay"
          className="absolute inset-0 z-10 grid place-items-center bg-white/70"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
            <div className="text-sm text-gray-700">Starting job…</div>
          </div>
        </div>
      )}

      {!starting && jobId && !previewHidden && (
        <div
          className="relative rounded-2xl border bg-white p-4 shadow-sm"
          data-testid="jobinfo-panel"
        >
          <button
            type="button"
            aria-label="Hide job panel"
            data-testid="jobinfo-close"
            className="absolute right-2 top-2 rounded-md p-1 text-gray-500 hover:bg-gray-100"
            onClick={() => setPreviewHidden(true)}
          >
            ×
          </button>
          <div data-testid="jobinfo-id-value" className="text-xs text-gray-500">
            Job ID: {jobId}
          </div>
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
            {status ? null : (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Connecting live updates…
              </div>
            )}
            {status?.summary && (
              <a className="text-sm underline" href={`/jobs/${jobId}`}>
                Open summary
              </a>
            )}
          </div>
          {status?.message && (
            <div className="mt-2 text-xs text-gray-600">{status.message}</div>
          )}{" "}
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
