FROM node:20-alpine AS base

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

# ── Build ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env to skip init during build
ENV NEXT_PHASE=phase-production-build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate && npm run build

# Pre-generate empty SQLite database as template
RUN DATABASE_URL="file:/app/prisma/template.db" npx prisma db push --skip-generate

# Clean up unused Prisma artifacts before copying to production
RUN rm -rf node_modules/@prisma/engines/schema-engine-* \
    && rm -f node_modules/@prisma/client/runtime/*.map \
    && rm -rf node_modules/@prisma/client/runtime/*cockroachdb* \
    && rm -rf node_modules/@prisma/client/runtime/*mysql* \
    && rm -rf node_modules/@prisma/client/runtime/*postgresql* \
    && rm -rf node_modules/@prisma/client/runtime/*sqlserver* \
    && rm -rf node_modules/@prisma/client/runtime/edge* \
    && rm -rf node_modules/@prisma/client/runtime/wasm-* \
    && rm -rf node_modules/@prisma/client/runtime/react-native* \
    && rm -rf node_modules/@prisma/client/runtime/binary* \
    && rm -rf node_modules/@prisma/client/runtime/index-browser* \
    && rm -rf node_modules/@prisma/fetch-engine \
    && rm -rf node_modules/@prisma/get-platform \
    && rm -rf node_modules/@prisma/engines-version \
    && rm -rf node_modules/@prisma/debug \
    && rm -rf node_modules/@prisma/config

# Clean standalone node_modules too
RUN rm -rf .next/standalone/node_modules/typescript \
    && rm -rf .next/standalone/node_modules/@prisma/engines/schema-engine-* \
    && rm -f .next/standalone/node_modules/@prisma/client/runtime/*.map \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/*cockroachdb* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/*mysql* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/*postgresql* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/*sqlserver* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/edge* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/wasm-* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/react-native* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/binary* \
    && rm -rf .next/standalone/node_modules/@prisma/client/runtime/index-browser*

# ── Production ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy cleaned standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy pre-generated DB template
COPY --from=builder /app/prisma/template.db ./prisma/template.db

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/console.db"

# Copy template if DB missing or empty (no tables), fix permissions first
CMD ["sh", "-c", "if [ ! -w /app/data ]; then echo 'ERROR: /app/data is not writable. Run: chown 1001:1001 ./data'; exit 1; fi; if [ ! -s /app/data/console.db ]; then cp /app/prisma/template.db /app/data/console.db; fi; node server.js"] \
