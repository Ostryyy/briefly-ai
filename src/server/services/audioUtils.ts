import "server-only";
import { mkdir, rm, stat } from "fs/promises";
import path from "path";
import os from "os";

export function getTempDir(): string {
  return path.join(os.tmpdir(), "briefly-ai");
}

export function getTempFilePath(jobId: string, ext: string = "mp3"): string {
  return path.join(getTempDir(), `${jobId}.${ext}`);
}

export async function ensureTempDirExists(): Promise<void> {
  const dir = getTempDir();
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export async function removeTempFile(filePath: string): Promise<void> {
  try {
    await rm(filePath, { force: true });
  } catch (err) {
    console.error(`Error removing temp file: ${filePath}`, err);
  }
}
