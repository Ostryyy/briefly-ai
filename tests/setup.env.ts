import { vi } from "vitest";

vi.stubEnv("SKIP_ENV_VALIDATION", "true");
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017/");
vi.stubEnv("MONGODB_DB", "briefly_test");
vi.stubEnv("JWT_SECRET", "test_secret_123456");
vi.stubEnv("RATE_LIMIT_PER_MIN", "100");
vi.stubEnv("MAX_UPLOAD_MB", "5");
vi.stubEnv("MAX_VIDEO_MINUTES", "30");
