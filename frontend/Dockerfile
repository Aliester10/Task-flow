# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Serve via Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Konfigurasi nginx: SPA fallback + reverse proxy ke backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Hasil build Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
