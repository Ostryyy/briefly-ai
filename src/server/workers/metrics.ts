export type Metrics = {
  downloadMs?: number;
  transcodeMs?: number;
  transcribeMs?: number;
  summarizeMs?: number;
  inputBytes?: number;
  outputBytes?: number;
  totalMs?: number;
};

export async function time<T>(
  label: keyof Metrics,
  m: Metrics,
  fn: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    m[label] = Date.now() - t0;
  }
}
