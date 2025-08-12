import { getDb } from "@server/db/mongodb";
import type { Metrics } from "@server/workers/metrics";

export async function saveJobMetrics(jobId: string, metrics: Metrics) {
  const db = await getDb();
  await db
    .collection("jobs")
    .updateOne(
      { jobId },
      { $set: { metrics, finishedAt: new Date(), updatedAt: new Date() } }
    );
}
