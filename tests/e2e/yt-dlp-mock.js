#!/usr/bin/env node
/*
 * Minimal yt-dlp mock for E2E tests.
 * - If called with `-j`/`--dump-json`, prints one JSON line containing { duration }.
 * - Otherwise, pretends to download audio and, if `-o <path>` is provided, creates that file.
 * - URL is taken as the last non-flag argument.
 *
 * Optional:
 *   YTDLP_MOCK_FAIL=1  → exit with code 1 to simulate yt-dlp failure.
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

// Simulate a hard failure when requested
if (process.env.YTDLP_MOCK_FAIL === "1") {
  process.stderr.write("[yt-dlp-mock] Forced failure via env.\n");
  process.exit(1);
}

// Extract the last non-flag argument as URL
function lastUrlArg(argv) {
  for (let i = argv.length - 1; i >= 0; i--) {
    const a = argv[i];
    if (a && !a.startsWith("-")) return a;
  }
  return "";
}
const url = lastUrlArg(args);

// Recognize metadata mode
const isJsonMeta = args.includes("-j") || args.includes("--dump-json");

// A tiny table for deterministic durations per URL used in tests
const durationTable = new Map([
  ["https://youtu.be/too-long", 60 * 999], // intentionally too long
  ["https://youtu.be/edge-ok", 60 * 30], // exactly at the edge (30 min)
  ["https://youtu.be/happy", 60 * 10], // happy path
]);

// Default duration = 10 minutes
const duration = durationTable.get(url) ?? 600;

if (isJsonMeta) {
  // Mimic: yt-dlp -j → one JSON line (not an array)
  process.stdout.write(JSON.stringify({ duration }) + "\n");
  process.exit(0);
}

// "Download" mode: if `-o <path>` or `--output <path>` is present, create that file
function getOutputPath(argv) {
  const i = argv.findIndex((a) => a === "-o" || a === "--output");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return null;
}

const out = getOutputPath(args);
if (out) {
  try {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, "mock audio data\n");
  } catch (e) {
    process.stderr.write(`[yt-dlp-mock] Failed to create output: ${e}\n`);
    process.exit(1);
  }
}

process.exit(0);
