import "server-only";

import { z } from "zod";
import fs from "node:fs";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"),
      {
        message: "MONGODB_URI must be a mongodb:// or mongodb+srv:// URL",
      }
    ),
  MONGODB_DB: z.string().default("briefly"),
  OPENAI_API_KEY: z.string().min(10).optional(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET should be at least 16 chars"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  ADMIN_TOKEN: z.string().optional(),

  MOCK_MODE: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
    .default(false),
  MOCK_FAIL_PROB: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((n) => n >= 0 && n <= 1, "MOCK_FAIL_PROB must be in [0,1]")
    .default(0),

  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(100),
  MAX_VIDEO_MINUTES: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(20),

  // yt-dlp / cookies
  YTDLP_COOKIES_PATH: z.string().optional(),
  YTDLP_PATH: z.string().optional().default("/usr/local/bin/yt-dlp"),

  SKIP_ENV_VALIDATION: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    console.warn(
      "SKIP_ENV_VALIDATION=true – skip env errors at the build stage."
    );
  } else {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env0 = (parsed.success ? parsed.data : (process.env as any)) as z.infer<
  typeof EnvSchema
>;

if (
  env0.MOCK_MODE === false &&
  !env0.OPENAI_API_KEY &&
  process.env.SKIP_ENV_VALIDATION !== "true"
) {
  console.error("OPENAI_API_KEY is required when MOCK_MODE=false");
  process.exit(1);
}

if (env0.YTDLP_COOKIES_PATH && !fs.existsSync(env0.YTDLP_COOKIES_PATH)) {
  console.warn("yt-dlp cookies file not found at", env0.YTDLP_COOKIES_PATH);
}

export const env = {
  NODE_ENV: env0.NODE_ENV,
  PORT: env0.PORT,

  MONGODB_URI: env0.MONGODB_URI,
  MONGODB_DB: env0.MONGODB_DB,
  OPENAI_API_KEY: env0.OPENAI_API_KEY,
  JWT_SECRET: env0.JWT_SECRET,
  SMTP_USER: env0.SMTP_USER,
  SMTP_PASS: env0.SMTP_PASS,
  ADMIN_TOKEN: env0.ADMIN_TOKEN,

  MOCK_MODE: env0.MOCK_MODE,
  MOCK_FAIL_PROB: env0.MOCK_FAIL_PROB,

  MAX_UPLOAD_MB: env0.MAX_UPLOAD_MB,
  MAX_VIDEO_MINUTES: env0.MAX_VIDEO_MINUTES,
  RATE_LIMIT_PER_MIN: env0.RATE_LIMIT_PER_MIN,

  YTDLP_COOKIES_PATH: env0.YTDLP_COOKIES_PATH,
  YTDLP_PATH: env0.YTDLP_PATH,
};
