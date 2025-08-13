import { expect, Page } from "@playwright/test";

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

export async function waitHomeReadyOrFail(
  page: Page,
  timeout = 60_000
): Promise<void> {
  const errorToast = page.getByTestId("toast-job-start-error");

  const errorWatch = (async () => {
    await errorToast.waitFor({ state: "visible", timeout });
    throw new Error("Error toast appeared on home page");
  })();

  await Promise.race([
    errorWatch,
    page
      .getByTestId("status-badge-ready")
      .waitFor({ state: "visible", timeout }),
  ]);

  await expect(errorToast).toHaveCount(0);
}

export async function waitJobsListReadyOrFail(
  page: Page,
  jobId: string,
  timeout = 60_000
): Promise<void> {
  const card = page.getByTestId(`jobcard-${jobId}`);
  await expect(card).toBeVisible({ timeout: 15_000 });

  const status = card.getByTestId("jobcard-status");
  const errorToast = page.getByTestId("toast-job-start-error");

  const errorWatch = (async () => {
    await errorToast.waitFor({ state: "visible", timeout });
    throw new Error("Error toast appeared on jobs list");
  })();

  const readyWatch = expect(status).toHaveText("READY", { timeout });

  await Promise.race([errorWatch, readyWatch]);
  await expect(errorToast).toHaveCount(0);
}

export async function waitJobDetailsReadyOrFail(
  page: Page,
  jobId: string,
  timeout = 60_000
): Promise<void> {
  await expect(page.getByTestId("jobdetails-id")).toHaveText(jobId, {
    timeout: 15_000,
  });

  const errorToast = page.getByTestId("toast-job-start-error");

  const errorWatch = (async () => {
    await errorToast.waitFor({ state: "visible", timeout });
    throw new Error("Error toast appeared on job details");
  })();

  const readyWatch = page
    .getByTestId("status-badge-ready")
    .waitFor({ state: "visible", timeout });

  await Promise.race([errorWatch, readyWatch]);
  await expect(errorToast).toHaveCount(0);
}
