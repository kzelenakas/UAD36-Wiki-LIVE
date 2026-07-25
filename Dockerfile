# Multi-stage Dockerfile for Vite + Express Full-Stack Application (Cloud Run target)

# Step 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package dependency files first for better layer caching
COPY package.json package-lock.json ./

# Reproducible install from the lockfile
RUN npm ci

# Copy application source
COPY . .

# Build client assets and bundle server.ts -> dist/server.cjs
RUN npm run build

# Step 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Cloud Run sets PORT itself; 8080 is only the local-run default.
ENV PORT=8080

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled application from builder
COPY --from=builder /app/dist ./dist
# No data-store.json here on purpose: server/db.ts seeds it with defaults on
# first write. On Cloud Run this file lives on ephemeral, per-instance disk —
# see README "Known limitation" before treating it as real persistence.

# Run as non-root (Cloud Run runs containers as an arbitrary UID by default,
# but pinning a real user keeps local `docker run` and other platforms safe too)
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
