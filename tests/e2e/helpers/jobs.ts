import { expect, Page } from "@playwright/test";

export type JobStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "TRANSCRIBING"
  | "SUMMARIZING"
  | "READY"
  | "FAILED";

const badgeTestId = (s: JobStatus) => `status-badge-${s.toLowerCase()}`;

export async function waitOverlayAndGetJobId(page: Page): Promise<string> {
  const overlay = page.getByTestId("jobform-overlay");
  await overlay.waitFor({ state: "visible" });
  await overlay.waitFor({ state: "detached" });

  const jobId = (await page.getByTestId("jobinfo-id-value").textContent())
    ?.replace("Job ID:", "")
    .trim();

  expect(jobId, "Job ID should be present after start").not.toBeNull();
  return jobId!;
}

export async function waitHomeForStatus(
  page: Page,
  status: JobStatus,
  timeout = 60_000
): Promise<void> {
  const errorToast = page.getByTestId("toast-job-start-error");

  const errorWatch = (async () => {
    await errorToast.waitFor({ state: "visible", timeout });
    throw new Error("Error toast appeared on home page");
  })();

  const target = page.getByTestId(badgeTestId(status)).waitFor({
    state: "visible",
    timeout,
  });

  await Promise.race([errorWatch, target]);

  await expect(errorToast).toHaveCount(0);
}

export async function waitJobsListForStatus(
  page: Page,
  jobId: string,
  status: JobStatus,
  timeout = 60_000
): Promise<void> {
  const card = page.getByTestId(`jobcard-${jobId}`);
  await expect(card).toBeVisible({ timeout: 15_000 });

  await expect(card.getByTestId("jobcard-status")).toHaveText(status, {
    timeout,
  });
}

export async function waitJobDetailsForStatus(
  page: Page,
  jobId: string,
  status: JobStatus,
  timeout = 60_000
): Promise<void> {
  await expect(page.getByTestId("jobdetails-id")).toHaveText(jobId, {
    timeout: 15_000,
  });

  await expect(page.getByTestId("jobdetails-status")).toHaveText(status, {
    timeout,
  });
}

export function waitHomeReadyOrFail(page: Page, timeout = 60_000) {
  return waitHomeForStatus(page, "READY", timeout);
}
export function waitJobsListReadyOrFail(
  page: Page,
  jobId: string,
  timeout = 60_000
) {
  return waitJobsListForStatus(page, jobId, "READY", timeout);
}
export function waitJobDetailsReadyOrFail(
  page: Page,
  jobId: string,
  timeout = 60_000
) {
  return waitJobDetailsForStatus(page, jobId, "READY", timeout);
}

export function waitHomeFailed(page: Page, timeout = 60_000) {
  return waitHomeForStatus(page, "FAILED", timeout);
}
export function waitJobsListFailed(
  page: Page,
  jobId: string,
  timeout = 60_000
) {
  return waitJobsListForStatus(page, jobId, "FAILED", timeout);
}
export function waitJobDetailsFailed(
  page: Page,
  jobId: string,
  timeout = 60_000
) {
  return waitJobDetailsForStatus(page, jobId, "FAILED", timeout);
}
