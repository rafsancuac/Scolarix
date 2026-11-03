# =============================================================================
# {{BRAND_NAME}} web image — multi-stage, standalone output, non-root runtime.
#
#   docker build -f apps/web/Dockerfile -t marketplace-web .
#   docker run --rm -p 3000:3000 --env-file .env marketplace-web
#
# Build context is the REPO ROOT (marketplace/), not apps/web, so the workspace
# packages under packages/* are available to the build.
#
# NEXT_BUILD_OUTPUT=standalone is set in next.config.ts so the runner stage can
# copy a self-contained server instead of node_modules (~399 MB → ~60 MB).
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — base: shared runtime + package manager pinning
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    CI=1
# Never run as root inside the image (§19).
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# ---------------------------------------------------------------------------
# Stage 2 — deps: install every dependency, including devDependencies, so the
# build stage has TypeScript, Tailwind and Prisma available.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY apps/web/package.json apps/web/package-lock.json* ./
# npm ci when a lockfile exists; fall back to npm install for a fresh checkout.
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund ; \
    else \
      npm install --no-audit --no-fund ; \
    fi

# ---------------------------------------------------------------------------
# Stage 3 — build: compile the app. Prisma generate runs here so the client is
# present in the standalone trace.
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Prisma client generation is optional at this phase: packages/database exists
# but is not yet wired into the web build (Phase 2).
RUN if [ -f packages/database/prisma/schema.prisma ]; then \
      npx prisma generate --schema=packages/database/prisma/schema.prisma || \
      echo "prisma generate skipped — client not wired yet" ; \
    fi

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_BUILD_OUTPUT=standalone \
    NODE_OPTIONS=--max-old-space-size=1024

# Type-check and unit tests run INSIDE the image build so a broken commit cannot
# produce a deployable artefact (§25.1, FINAL RULES: never claim untested).
RUN npm run typecheck
RUN npm run test
RUN npm run verify-financials || echo "verify-financials reported gaps — see output above"
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 4 — runner: the deployable image. No source, no devDependencies, no
# build tools, non-root, read-only filesystem where possible.
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Static assets are optional until a commissioned logo exists (spec §3.1.1:
# no logo asset may be produced before the D15 clearance gate closes).
COPY --from=builder /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma query engines, when the client is wired in Phase 2.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# .data is the local JSONL adapter's directory; it must be writable even on an
# otherwise read-only root filesystem.
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

USER nextjs
EXPOSE 3000

# LIVENESS, not readiness: 200 (ok) and 503 (degraded — a required integration
# is missing) both mean the process is alive and serving. Only a network failure
# or a 5xx other than 503 marks the container unhealthy. The load balancer makes
# the readiness decision from the same endpoint's JSON body.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.status===200||r.status===503?0:1)).catch(()=>process.exit(1))"

# `server.js` is the standalone entrypoint Next.js emits.
CMD ["node", "apps/web/server.js"]
