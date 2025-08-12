import { stat } from "node:fs/promises";

export async function fileSize(path: string): Promise<number | undefined> {
  try {
    const s = await stat(path);
    return s.size;
  } catch {
    return undefined;
  }
}
