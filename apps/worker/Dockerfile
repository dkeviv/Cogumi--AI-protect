# Worker Dockerfile
FROM node:20-alpine AS base

# Prisma engine dependencies
RUN apk add --no-cache libc6-compat openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy all package files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma ./packages/db/prisma
COPY packages/shared/package.json ./packages/shared/
COPY packages/scripts/package.json ./packages/scripts/
COPY packages/story/package.json ./packages/story/
COPY packages/detectors/package.json ./packages/detectors/
COPY packages/policy/package.json ./packages/policy/
COPY packages/reporting/package.json ./packages/reporting/

# Install pnpm and dependencies (postinstall will generate Prisma client)
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app

# Copy installed dependencies (Prisma client already generated via postinstall)
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY apps/worker ./apps/worker
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY packages/scripts ./packages/scripts
COPY packages/story ./packages/story
COPY packages/detectors ./packages/detectors
COPY packages/policy ./packages/policy
COPY packages/reporting ./packages/reporting
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules from deps stage (includes generated Prisma client + engines)
COPY --from=deps /app/node_modules ./node_modules

# Copy source files (we'll use tsx to run TypeScript directly)
COPY --from=builder /app/apps/worker ./apps/worker
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /app/apps/worker

# Use tsx to run TypeScript directly (no build step needed)
CMD ["npx", "tsx", "src/index.ts"]
