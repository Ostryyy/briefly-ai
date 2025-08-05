import { statusStore } from "@/app/lib/statusStore";
import { JobStatus } from "@/app/types/JobStatus";
import { NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const encoder = new TextEncoder();

  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (status: JobStatus) => {
        if (closed) return;

        try {
          const data = `data: ${JSON.stringify(status)}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (status.status === "READY" || status.status === "FAILED") {
            statusStore.removeListener(jobId, send);
            controller.close();
            closed = true;
          }
        } catch (err) {
          console.error("Stream enqueue error:", err);
          statusStore.removeListener(jobId, send);
          controller.close();
          closed = true;
        }
      };

      const initialStatus = statusStore.get(jobId);
      if (initialStatus) send(initialStatus);

      statusStore.onChange(jobId, send);
    },

    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
