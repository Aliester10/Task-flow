# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL dibutuhkan Prisma engine di Alpine
RUN apk add --no-cache openssl

# Install semua dependencies (termasuk devDependencies untuk tsc)
# Schema Prisma harus ada sebelum npm ci karena postinstall menjalankan prisma generate
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Compile TypeScript → dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

# Install production dependencies saja
# prisma CLI ada di dependencies agar bisa `migrate deploy` saat container start
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# Copy hasil build
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Jalankan migrasi database lalu start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/index.js"]
