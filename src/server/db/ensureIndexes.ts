import { getDb } from "./mongodb";

let ensured: Promise<void> | null = null;

export function ensureDbIndexes(): Promise<void> {
  if (!ensured) ensured = create();
  return ensured;
}

async function create() {
  const db = await getDb();
  await db
    .collection("jobs")
    .createIndex({ jobId: 1 }, { unique: true, name: "uniq_jobId" });
  await db
    .collection("jobs")
    .createIndex({ userId: 1, createdAt: -1 }, { name: "user_created" });
  await db
    .collection("jobs")
    .createIndex({ status: 1, updatedAt: -1 }, { name: "status_updated" });
}
