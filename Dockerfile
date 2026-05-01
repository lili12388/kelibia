# ──────────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for the build step)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the Vite frontend + esbuild backend
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Production Runner
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the build output from the builder stage
COPY --from=builder /app/dist ./dist

# Copy drizzle config + shared schema (needed for db:push)
COPY drizzle.config.ts ./
COPY shared ./shared
COPY server/env.ts ./server/

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 80

# Start the production server
CMD ["node", "dist/index.js"]
