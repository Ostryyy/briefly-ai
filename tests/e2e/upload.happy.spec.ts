import { test, expect, Page } from "@playwright/test";

async function waitOverlayAndGetJobId(page: Page) {
  const overlay = page.getByTestId("jobform-overlay");
  await overlay.waitFor({ state: "visible" });
  await overlay.waitFor({ state: "detached" });

  const jobId = (await page.getByTestId("jobinfo-id-value").textContent())
    ?.replace("Job ID:", "")
    .trim();

  expect(jobId, "Job ID should be present after start").not.toBeNull();
  return jobId!;
}

async function waitHomeReadyOrFail(page: Page, timeout = 60_000) {
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

async function waitJobsListReadyOrFail(
  page: Page,
  jobId: string,
  timeout = 60_000
) {
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

async function waitJobDetailsReadyOrFail(
  page: Page,
  jobId: string,
  timeout = 60_000
) {
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

test("Upload → READY visible on home, jobs list and job details (dummy buffer)", async ({
  page,
  context,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("home-title")).toBeVisible();
  await page.getByTestId("jobform-mode-upload").click();

  const levelSelect = page.getByTestId("jobform-level-select");
  await expect(levelSelect).toBeEnabled();
  await levelSelect.selectOption("detailed");
  await expect(levelSelect).toHaveValue("detailed");

  const submitBtn = page.getByTestId("jobform-submit");
  await expect(submitBtn).toBeDisabled();

  const fileInput = page.locator(
    'input[type="file"][data-testid="jobform-file-input"]'
  );
  await expect(fileInput).toBeAttached();

  await fileInput.setInputFiles({
    name: "tiny.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("dummy-mp3-content"),
  });

  await expect(page.getByText("tiny.mp3")).toBeVisible();
  await expect(submitBtn).toBeEnabled();

  await submitBtn.click();

  const jobId = await waitOverlayAndGetJobId(page);
  console.log("Started jobId:", jobId);

  const jobsPage = await context.newPage();
  const jobPage = await context.newPage();

  await Promise.all([jobsPage.goto("/jobs"), jobPage.goto(`/jobs/${jobId}`)]);

  await Promise.all([
    waitHomeReadyOrFail(page),
    waitJobsListReadyOrFail(jobsPage, jobId),
    waitJobDetailsReadyOrFail(jobPage, jobId),
  ]);
});
