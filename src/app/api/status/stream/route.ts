export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { statusStore } from "@server/state/statusStore";
import type { JobStatus } from "@shared/types/job";

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) return new Response("Missing jobId", { status: 400 });

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`: open\n\n`));

      const send = (status: JobStatus) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
          );
          if (status.status === "READY" || status.status === "FAILED") {
            cleanup();
            controller.close();
            closed = true;
          }
        } catch (err) {
          console.error("[SSE] enqueue error:", err);
          cleanup();
          try {
            controller.close();
          } catch {}
          closed = true;
        }
      };

      const initial = statusStore.get(jobId);
      if (initial)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)
        );

      statusStore.onChange(jobId, send);

      heartbeat = setInterval(() => {
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            cleanup();
            try {
              controller.close();
            } catch {}
            closed = true;
          }
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
        closed = true;
      });

      function cleanup() {
        statusStore.removeListener(jobId!, send);
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
