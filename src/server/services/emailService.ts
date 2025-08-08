import "server-only";
import nodemailer, { Transporter } from "nodemailer";
import type { JobStatus } from "@shared/types/job";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const { SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, SMTP_SERVICE } =
    process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(
      "[emailService] Missing SMTP_USER/SMTP_PASS – skipping email."
    );
    return null;
  }

  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: Number(SMTP_PORT || 587) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : nodemailer.createTransport({
        service: SMTP_SERVICE || "gmail",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

  return cachedTransporter;
}

const SUBJECTS: Record<JobStatus["status"], string> = {
  PENDING: "Your job has been queued",
  DOWNLOADING: "Downloading source…",
  TRANSCRIBING: "Transcribing audio…",
  SUMMARIZING: "Generating summary…",
  READY: "Summary ready ✅",
  FAILED: "Job failed ❌",
};

export async function sendJobStatusEmail(
  jobId: string,
  status: JobStatus
): Promise<void> {
  try {
    if (!status.userEmail) return;

    const transporter = getTransporter();
    if (!transporter) return;

    const from = `"Briefly.AI" <${process.env.SMTP_USER}>`;
    const to = status.userEmail;

    const appUrl =
      process.env.APP_URL?.replace(/\/+$/, "") || "http://localhost:3000";
    const jobUrl = `${appUrl}/jobs/${jobId}`;

    const subject = SUBJECTS[status.status] || `Job status: ${status.status}`;

    const text = [
      `Hi,`,
      ``,
      `Status for your job ${jobId}: ${status.status}.`,
      status.message ? `Details: ${status.message}` : ``,
      ``,
      `View job: ${jobUrl}`,
      ``,
      `Best,`,
      `Briefly.AI`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5; color:#111">
        <p>Hi,</p>
        <p>Status for your job <code>${jobId}</code>: <strong>${
      status.status
    }</strong>.</p>
        ${status.message ? `<p><em>${escapeHtml(status.message)}</em></p>` : ""}
        <p><a href="${jobUrl}" target="_blank" rel="noreferrer">Open job in Briefly.AI</a></p>
        <p style="margin-top:24px;">Best,<br/>Briefly.AI</p>
      </div>
    `;

    await transporter.sendMail({ from, to, subject, text, html });
  } catch (err) {
    console.error("[emailService] sendJobStatusEmail error:", err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
