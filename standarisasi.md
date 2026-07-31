# 📜 Standarisasi Deployment Server (Production & Staging)

Dokumen ini adalah **Buku Panduan Wajib (Rulebook)** bagi setiap Developer atau DevOps yang akan melakukan rilis (deploy) aplikasi apa pun ke server ini.

Demi menjaga keandalan (*reliability*), keamanan tingkat tinggi (*military-grade security*), dan kerapian server, setiap aplikasi **WAJIB** mematuhi standar di bawah ini. Jika tidak, proses CI/CD akan menggagalkan rilis Anda!

---

## Daftar Isi

1. [Aturan Dasar (Golden Rules)](#1-aturan-dasar-golden-rules)
2. [Standarisasi File `docker-compose.yml`](#2-standarisasi-file-docker-composeyml)
3. [Contoh Sempurna](#3-contoh-sempurna-docker-composeyml)
4. [Alur Kerja Deployment (CI/CD)](#4-alur-kerja-deployment-cicd)

---

## 1. Aturan Dasar (Golden Rules)

1. **100% Containerized** — Tidak boleh ada aplikasi yang berjalan langsung di OS (seperti `pm2`, `nodemon`, atau `apache2`). Semuanya WAJIB berjalan di dalam Docker Container.
2. **Stateless App** — Aplikasi tidak boleh menyimpan data permanen (seperti foto unggahan pengguna) di dalam *container* itu sendiri. Jika *container* di-*restart*, data tersebut akan hilang. Gunakan **Docker Volumes** atau layanan Cloud (S3) untuk file persisten.
3. **Pemisahan Konfigurasi** — Rahasia (seperti token API, *password* database) WAJIB disimpan di dalam file `.env` dan tidak boleh di-*hardcode* di dalam kode.

---

## 2. Standarisasi File `docker-compose.yml`

Setiap aplikasi yang masuk ke server ini (`/srv/docker/apps/nama-aplikasi`) wajib memiliki file `docker-compose.yml` dengan standarisasi berikut.

### A. Koneksi Jaringan (Network)

Semua aplikasi yang membutuhkan akses internet (HTTP/HTTPS) wajib disambungkan ke jaringan eksternal bernama `web`. Traefik menggunakan jaringan ini untuk merutekan lalu lintas.

```yaml
    networks:
      - web

networks:
  web:
    external: true
```

### B. Label Routing (Traefik)

Server ini tidak mengekspos port secara langsung (seperti `ports: ["3000:3000"]`). Semua akses web diatur oleh **Traefik Reverse Proxy**.

Anda wajib memasukkan label ini agar aplikasi Anda mendapat *domain* dan *gembok* SSL/HTTPS otomatis:

```yaml
    labels:
      - "traefik.enable=true"
      # Ganti 'nama_app' dengan pengenal unik aplikasi Anda
      - "traefik.http.routers.nama_app.rule=Host(`app.aliester.dev`)"
      - "traefik.http.routers.nama_app.entrypoints=web"
      # Ganti Host dengan domain/subdomain yang disepakati
      # Port di bawah adalah port aplikasi Anda DI DALAM container (misal: 80, 3000, 8080)
      - "traefik.http.services.nama_app.loadbalancer.server.port=3000"
```

### C. Lapisan Keamanan (Security Hardening)

Sesuai **Phase 8 Security Hardening**, setiap aplikasi dilarang keras memiliki hak akses penuh. Anda wajib memasukkan 3 lapis pengaman berikut:

```yaml
    # 1. Mencegah eskalasi hak akses (mencegah container menjadi root)
    security_opt:
      - no-new-privileges:true

    # 2. Mencabut hak Linux level rendah, lalu tambahkan hanya yang dibutuhkan
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID

    # 3. Membatasi penggunaan RAM dan CPU (mencegah server hang)
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

### D. Standar Kesehatan (Healthcheck)

Container yang berjalan (*Up*) belum tentu berfungsi (*Healthy*). Wajib sertakan *Healthcheck* agar sistem tahu kapan harus me-restart aplikasi Anda yang *error* secara otomatis.

```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

---

## 3. Contoh Sempurna (`docker-compose.yml`)

Berikut adalah hasil akhir file konfigurasi yang akan selalu lolos sensor CI/CD dan standar DevOps:

```yaml
services:
  frontend:
    image: ghcr.io/aliester/sunny-dashboard:latest
    container_name: sunny_dashboard_frontend
    restart: unless-stopped

    env_file:
      - .env

    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID

    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sunny.rule=Host(`sunny.aliester.dev`)"
      - "traefik.http.routers.sunny.entrypoints=web"
      - "traefik.http.services.sunny.loadbalancer.server.port=80"

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3

    networks:
      - web

networks:
  web:
    external: true
```

---

## 4. Alur Kerja Deployment (CI/CD)

1. Developer wajib menyediakan `Dockerfile` di setiap repositori aplikasi.
2. Developer **dilarang** melakukan `git clone` atau mengetik `docker compose up` secara manual di VPS.
3. Developer melakukan `git push` ke cabang (*branch*) `main`.
4. GitHub Actions (Robot) akan merakit aplikasi, melakukan pengecekan standar (di atas), dan jika lolos, robot akan memerintahkan VPS untuk me-restart *container* dengan versi terbaru secara otomatis dalam waktu ~60 detik.
5. Pantau hasil deploy (Sukses/Gagal) di grup Telegram Tim.