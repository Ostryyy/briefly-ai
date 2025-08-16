import { test, expect } from "@playwright/test";
import { setMockConfig, getMockConfig, resetMockConfig } from "./helpers/mock";

test.describe("@serial-env", () => {
  test.beforeAll(async ({ request }) => {
    await setMockConfig(request, {
      maxUploadMb: 1,
      failProb: 0,
      forceFail: false,
    });

    const snap = await getMockConfig(request);
    expect(snap.MAX_UPLOAD_MB).toBe("1");
    expect(snap.MOCK_MODE).toBe("true");
  });

  test.afterAll(async ({ request }) => {
    await resetMockConfig(request);
  });

  test("Upload → shows error toast for too large file (413)", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("home-title")).toBeVisible();
    await page.getByTestId("jobform-mode-upload").click();

    const levelSelect = page.getByTestId("jobform-level-select");
    await expect(levelSelect).toBeEnabled();
    await levelSelect.selectOption("medium");

    const fileInput = page.locator(
      'input[type="file"][data-testid="jobform-file-input"]'
    );
    await expect(fileInput).toBeAttached();

    const bigBuffer = Buffer.alloc(1.5 * 1024 * 1024, 0x41);

    await fileInput.setInputFiles({
      name: "too-big.mp3",
      mimeType: "audio/mpeg",
      buffer: bigBuffer,
    });

    const submitBtn = page.getByTestId("jobform-submit");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    const overlay = page.getByTestId("jobform-overlay");
    await overlay.waitFor({ state: "visible" });
    await overlay.waitFor({ state: "detached" });

    const errorToast = page.getByTestId("toast-job-start-error");
    await expect(errorToast).toBeVisible();
    await expect(page.getByTestId("jobinfo-id-value")).toHaveCount(0);

    await expect(submitBtn).toBeEnabled();
  });
});
