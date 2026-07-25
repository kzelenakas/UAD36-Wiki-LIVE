# Multi-stage Dockerfile for Vite + Express Full-Stack Application

# Step 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package dependency files
COPY package*.json ./

# Install all dependencies for build step
RUN npm install

# Copy application source
COPY . .

# Build client assets and bundle server.ts -> dist/server.cjs
RUN npm run build

# Step 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled application from builder
COPY --from=builder /app/dist ./dist

# Expose HTTP port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.cjs"]
