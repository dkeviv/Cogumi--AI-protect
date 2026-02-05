# Build stage
FROM node:20-alpine AS base

# Install pnpm and OpenSSL (required for Prisma)
RUN corepack enable pnpm && \
    apk add --no-cache openssl

# Install dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ui/package.json ./apps/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma ./packages/db/prisma
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (postinstall will generate Prisma client)
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies (including generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ui/node_modules ./apps/ui/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules

# Copy source
COPY apps/ui ./apps/ui
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build Next.js app (Prisma client already generated via postinstall)
WORKDIR /app/apps/ui
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/ui/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/ui/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/ui/.next/static ./apps/ui/.next/static

# Copy Prisma client from deps (includes .pnpm store with engines)
# Note: pnpm stores packages in .pnpm subdirectory, so we need the whole structure
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=deps --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/ui/server.js"]
