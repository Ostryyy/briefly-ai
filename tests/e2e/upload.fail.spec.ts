import { test, expect } from "@playwright/test";
import { setMockConfig, resetMockConfig } from "./helpers/mock";
import {
  waitOverlayAndGetJobId,
  waitHomeFailed,
  waitJobsListFailed,
  waitJobDetailsFailed,
} from "./helpers/jobs";

test.describe("@serial-env", () => {
  test.beforeAll(async ({ request }) => {
    await setMockConfig(request, {
      forceFail: true,
      failProb: 0,
      maxUploadMb: 50,
    });
  });

  test.afterAll(async ({ request }) => {
    await resetMockConfig(request);
  });

  test("Upload → FAILED visible on home, jobs list and job details (forced fail)", async ({
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
    console.log("Started jobId (forced fail):", jobId);

    const jobsPage = await context.newPage();
    const jobPage = await context.newPage();
    await Promise.all([jobsPage.goto("/jobs"), jobPage.goto(`/jobs/${jobId}`)]);

    await Promise.all([
      waitHomeFailed(page),
      waitJobsListFailed(jobsPage, jobId),
      waitJobDetailsFailed(jobPage, jobId),
    ]);

    await expect(page.getByRole("link", { name: "Open summary" })).toHaveCount(
      0
    );
    await expect(jobPage.getByTestId("summary-viewer")).toHaveCount(0);
    await expect(jobPage.getByText("Message")).toBeVisible();
  });
});
