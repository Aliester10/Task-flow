<div align="center">

```text
  _______       _____ _  __   ______ _      ______          __
 |__   __|/\   / ____| |/ /  |  ____| |    / __ \ \        / /
    | |  /  \ | (___ | ' /   | |__  | |   | |  | \ \  /\  / / 
    | | / /\ \ \___ \|  <    |  __| | |   | |  | |\ \/  \/ /  
    | |/ ____ \____) | . \   | |    | |___| |__| | \  /\  /   
    |_/_/    \_\_____/|_|\_\ |_|    |______\____/   \/  \/    
```

**TaskFlow** adalah platform manajemen proyek modern dengan fitur kolaborasi *real-time*, Kanban board yang interaktif, dan sistem otorisasi multi-peran (RBAC) yang aman. Dirancang untuk kecepatan dan skalabilitas.

[![CI/CD Status](https://img.shields.io/github/actions/workflow/status/Aliester10/Task-flow/deploy.yml?branch=main&label=Deploy&style=flat-square)](https://github.com/Aliester10/Task-flow/actions)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/React-v18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Docker Support](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://docker.com)

</div>

---

## 🌟 Fitur Utama

- ⚡ **Real-time Collaboration**: Pembaruan tugas langsung terlihat oleh semua anggota tim melalui teknologi **Socket.IO**.
- 🔐 **Military-grade Security**: Dilengkapi sanitasi XSS (Cross-Site Scripting), JWT berbasis `HttpOnly Cookie`, dan proteksi Rate Limiting.
- 👥 **Role-Based Access Control (RBAC)**: Pembagian peran pengguna (OWNER, ADMIN, MEMBER) dengan izin operasi yang dibatasi secara ketat di sisi *backend* dan *frontend*.
- 📊 **Interactive Kanban Board**: Manajemen tugas bergaya Kanban (Drag & Drop) yang mulus.
- 🚀 **Automated CI/CD**: *Push* kode Anda dan sistem secara otomatis me-merakit (*build*) dan me-merilis (*deploy*) tanpa *downtime*.

---

## 🛠️ Tech Stack

**Frontend:**
- React 18 (Vite)
- Tailwind CSS
- Zustand (State Management)
- Socket.IO Client

**Backend:**
- Node.js & Express
- Prisma ORM
- PostgreSQL
- JSON Web Token (JWT) + HTTP-Only Cookies
- Helmet, Compression, Cors

**DevOps & Deployment:**
- Docker & Docker Compose
- GitHub Actions (Self-Hosted Runner)
- Traefik (Reverse Proxy & Auto SSL)

---

## 🚀 Instalasi & Menjalankan Lokal

Pastikan Anda memiliki [Node.js](https://nodejs.org/) (disarankan v20) dan [Docker](https://www.docker.com/) terinstal di mesin Anda.

### 1. Kloning Repositori
```bash
git clone https://github.com/Aliester10/Task-flow.git
cd Task-flow
```

### 2. Pengaturan Environment (Variabel Lingkungan)
Salin file `.env.example` menjadi `.env` di direktori utama, `frontend/`, dan `backend/`.
```bash
cp .env.example .env
```
Isi konfigurasi kredensial *database* dan secret JWT Anda di `.env`.

### 3. Menjalankan Database via Docker
Gunakan konfigurasi lokal untuk menyalakan PostgreSQL:
```bash
docker compose -f docker-compose.override.yml up -d
```

### 4. Setup Backend
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
npm run dev
```

### 5. Setup Frontend
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```

Aplikasi sekarang dapat diakses di `http://localhost:5173`.

---

## 🚢 Alur CI/CD Deployment

Proyek ini menggunakan **GitHub Actions** untuk melakukan otomatisasi *deployment* secara langsung (Self-Hosted) di server VPS, lengkap dengan *healthchecks* dan manajemen *network* Traefik.

### 🔄 Bagaimana Cara Kerjanya?

1. **Commit & Push**: Developer melakukan `git push` ke cabang `main`.
2. **Build Local**: GitHub Actions di VPS (Self-Hosted Runner) menyalin kode dan memulai *build* image `taskflow-frontend` dan `taskflow-backend` secara lokal.
3. **Migrasi Database Otomatis**: Saat *container* backend berjalan, Prisma secara otomatis memigrasi skema database terbaru sebelum meluncurkan server Express.
4. **Health Check Validation**: Docker Compose memvalidasi `http://127.0.0.1:5000/health` dan memastikan backend 100% siap sebelum Nginx frontend menerima *traffic*.
5. **Traefik Routing**: Traefik menangkap label Docker dan langsung memberikan koneksi HTTPS otomatis ke domain `taskflow.aliester.dev`.

> 💡 **Standarisasi**: Semua *deployment* wajib mematuhi panduan ketat arsitektur keamanan di [standarisasi.md](./standarisasi.md).

---

<div align="center">
Dibuat dengan ❤️ oleh Tim Pengembang TaskFlow.
</div>
