import nodemailer from "nodemailer";
import { JobStatus } from "@/app/types/JobStatus";

export async function sendJobStatusEmail(jobId: string, status: JobStatus) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"Briefly.AI" <${process.env.SMTP_USER}>`,
    to: status.userEmail,
    subject: `Twój job ${jobId} jest ${status.status}`,
    text: `Cześć!\n\nStatus Twojego zadania ${jobId} to: ${status.status}.\n\nPozdrawiamy,\nBriefly.AI`,
  };

  await transporter.sendMail(mailOptions);
}
