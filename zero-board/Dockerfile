FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_TIMEOUT

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_TIMEOUT=${NEXT_PUBLIC_API_TIMEOUT}

# Build the application
RUN bun run build

# Verify standalone build output structure
RUN echo "=== Checking .next directory ===" && ls -la /app/.next/ 2>/dev/null || echo "No .next directory"
RUN echo "=== Checking standalone directory ===" && ls -la /app/.next/standalone/ 2>/dev/null || echo "Standalone directory not found"
RUN echo "=== Looking for server.js ===" && find /app/.next/standalone -name "server.js" 2>/dev/null || echo "server.js not found in standalone"
RUN echo "=== Contents of standalone ===" && ls -laR /app/.next/standalone/ 2>/dev/null | head -30 || echo "Cannot list standalone contents"

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Node.js and npm for running Next.js standalone server
# Bun image includes Node.js compatibility but Next.js standalone is optimized for Node.js
RUN apk add --no-cache nodejs npm

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
# Next.js standalone creates: .next/standalone/ with server.js, package.json, node_modules, etc.
# Copy the entire standalone directory contents to /app
# Note: Using trailing slash on source to copy contents, not the directory itself
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Verify files were copied (this will show in build logs)
RUN echo "=== Files in /app after COPY ===" && \
    ls -la /app/ && \
    echo "" && \
    echo "=== Checking for server.js ===" && \
    test -f /app/server.js && echo "✓ server.js FOUND" || (echo "✗ server.js NOT FOUND" && find /app -name "server.js" 2>/dev/null || echo "No server.js found anywhere")

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the standalone server
# Next.js standalone build creates server.js in the root of standalone directory
CMD ["node", "server.js"]
