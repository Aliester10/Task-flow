# 🚀 Tutorial Deploy Aplikasi Menggunakan Docker, GitHub Actions, dan Traefik

Panduan ini menjelaskan cara melakukan **deploy aplikasi secara otomatis** menggunakan:

- 🐳 Docker
- ⚙️ GitHub Actions (Self-Hosted Runner)
- 🌐 Traefik Reverse Proxy
- 🖥️ VPS Linux

Dengan arsitektur ini, Anda **tidak perlu lagi mengunggah file menggunakan FTP atau FileZilla**. Cukup melakukan `git push`, dan aplikasi akan otomatis diperbarui di server.

Sebagai contoh, kita akan melakukan deploy aplikasi **Sunny Dashboard** berbasis **Node.js**.

---

# 📋 Alur Deploy

```text
Laptop
   │
   │ git push
   ▼
GitHub Repository
   │
   │ GitHub Actions
   ▼
Self-Hosted Runner (VPS)
   │
   ├── Build Docker Image
   ├── Restart Docker Compose
   └── Traefik otomatis melakukan routing HTTPS
   ▼
Aplikasi Live
```

---

# Tahap 1 — Menyiapkan Project

Pastikan project Anda sudah berada di GitHub dan memiliki struktur seperti berikut.

```text
sunny-dashboard/
├── src/
├── package.json
├── package-lock.json
├── Dockerfile
└── ...
```

## 1. Membuat Dockerfile

Buat file bernama **`Dockerfile`** pada root project.

Contoh untuk aplikasi Node.js:

```dockerfile
# Gunakan image Node.js
FROM node:18-alpine

# Direktori kerja
WORKDIR /app

# Salin package.json
COPY package*.json ./

# Install dependency
RUN npm install

# Salin seluruh source code
COPY . .

# Build aplikasi (React/Vue)
RUN npm run build

# Port aplikasi
EXPOSE 3000

# Menjalankan aplikasi
CMD ["npm", "start"]
```

> **Catatan**
>
> Jika aplikasi Anda tidak memiliki proses build (misalnya Express.js murni), hapus baris:
>
> ```dockerfile
> RUN npm run build
> ```

---

## 2. Push Project ke GitHub

Setelah project siap, kirim ke GitHub.

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

---

# Tahap 2 — Membuat Workflow GitHub Actions

GitHub Actions akan bertugas menjalankan proses deploy setiap kali ada perubahan pada branch `main`.

## Struktur Folder

```text
.github/
└── workflows/
    └── deploy.yml
```

Isi file `deploy.yml`:

```yaml
name: Deploy Sunny Dashboard

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: self-hosted

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Build Docker Image
        run: docker build -t sunny-dashboard:latest .

      - name: Restart Docker Compose
        run: |
          cd /srv/docker/apps/sunny-dashboard
          docker compose down
          docker compose up -d
```

Setelah file dibuat, lakukan:

```bash
git add .
git commit -m "Add deployment workflow"
git push
```

---

# Tahap 3 — Menambahkan Self-Hosted Runner

Agar GitHub dapat menjalankan workflow langsung di VPS, server harus didaftarkan sebagai **Self-Hosted Runner**.

## Langkah-langkah

1. Buka repository GitHub.
2. Masuk ke:

```
Settings
    └── Actions
          └── Runners
```

3. Klik **New Self-Hosted Runner**.
4. Pilih:

- Linux
- x64

GitHub akan menampilkan beberapa perintah instalasi.

Salin seluruh perintah tersebut dan jalankan di terminal VPS.

Contoh alurnya:

```bash
mkdir actions-runner
cd actions-runner

# Download runner
...

# Configure runner
...

# Install sebagai service
sudo ./svc.sh install

# Jalankan service
sudo ./svc.sh start
```

> Disarankan menjalankan runner sebagai **service**, sehingga otomatis aktif saat VPS menyala.

---

# Tahap 4 — Menyiapkan Docker Compose

Masuk ke direktori aplikasi pada VPS.

```bash
cd /srv/docker/apps/sunny-dashboard
```

Buat atau edit file `docker-compose.yml`.

```yaml
services:
  app:
    image: sunny-dashboard:latest
    container_name: sunny-dashboard

    restart: unless-stopped

    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sunny.rule=Host(`sunny.domainanda.com`)"
      - "traefik.http.routers.sunny.entrypoints=web"
      - "traefik.http.services.sunny.loadbalancer.server.port=3000"

    networks:
      - web

networks:
  web:
    external: true
```

### Yang perlu disesuaikan

| Bagian | Keterangan |
|---------|------------|
| `sunny-dashboard:latest` | Nama image Docker |
| `sunny.domainanda.com` | Domain aplikasi |
| `3000` | Port aplikasi di dalam container |

---

# Tahap 5 — Deploy Aplikasi

Setelah semua konfigurasi selesai, proses deploy menjadi sangat sederhana.

Cukup lakukan perubahan pada source code, kemudian jalankan:

```bash
git add .
git commit -m "Update fitur"
git push
```

---

## Apa yang Terjadi Setelah `git push`?

GitHub Actions akan menjalankan workflow secara otomatis:

1. Mengambil source code terbaru.
2. Build Docker Image.
3. Restart container menggunakan Docker Compose.
4. Traefik mendeteksi container baru.
5. HTTPS otomatis aktif.
6. Aplikasi langsung diperbarui tanpa perlu upload manual.

---

# Melihat Status Deploy

Buka repository GitHub, kemudian masuk ke menu:

```
Actions
```

Di sana Anda dapat melihat proses deployment secara real-time.

Jika seluruh langkah berhasil, status workflow akan berubah menjadi ✅ **Success**.

---

# 🎉 Selesai

Sekarang setiap kali ingin melakukan deploy, Anda hanya perlu menjalankan:

```bash
git add .
git commit -m "Perubahan terbaru"
git push
```

Tanpa FTP, tanpa FileZilla, dan tanpa perlu login ke VPS untuk memperbarui aplikasi.

Dalam waktu sekitar **1–2 menit**, perubahan akan otomatis tersedia di domain Anda.

