# --- deps
FROM node:20-bookworm AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- build (Next -> standalone)
FROM node:20-bookworm AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# PLACEHOLDERS
ARG BUILD_MONGODB_URI="mongodb://example.uri/"
ARG BUILD_OPENAI_API_KEY="build-placeholder"
ARG BUILD_JWT_SECRET="build-placeholder"

ENV MONGODB_URI=${BUILD_MONGODB_URI}
ENV OPENAI_API_KEY=${BUILD_OPENAI_API_KEY}
ENV JWT_SECRET=${BUILD_JWT_SECRET}

RUN npm run build

# --- runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# system deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates python3 \
  && rm -rf /var/lib/apt/lists/*

# yt-dlp
ARG YTDLP_VERSION=2025.06.30
RUN curl -L -o /usr/local/bin/yt-dlp \
  "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" \
  && chmod +x /usr/local/bin/yt-dlp \
  && /usr/local/bin/yt-dlp --version

# Next standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# non-root user
RUN useradd -m app && chown -R app:app /app
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health >/dev/null \
  && curl -fsS http://localhost:3000/api/health/db >/dev/null \
  || exit 1

CMD ["node","server.js"]