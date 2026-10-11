# Menyiapkan login Google untuk TaskFlow

## 1. Buat Web Client ID di Google Cloud

1. Masuk ke [Google Cloud Console](https://console.cloud.google.com/) dengan akun Google Anda. Buat proyek baru atau pilih proyek yang akan dipakai untuk TaskFlow.
2. Buka **Google Auth Platform → Branding**. Isi nama aplikasi `TaskFlow` dan alamat email dukungan. Simpan pengaturan yang diminta. Untuk login dasar, scope `openid`, `email`, dan `profile` sudah cukup; TaskFlow tidak memerlukan akses Gmail atau Drive.
3. Buka **Google Auth Platform → Audience**. Pilih **External** agar akun Google pribadi dapat digunakan. Jika layar meminta pengguna uji, masukkan email Google yang akan dipakai menguji aplikasi.
4. Buka **Google Auth Platform → Clients → Create client**. Pilih **Web application** dan beri nama, misalnya `TaskFlow Local`.
5. Pada **Authorized JavaScript origins**, tambahkan dua entri berikut (tanpa garis miring atau path di akhir):

   ```text
   http://localhost
   http://localhost:5173
   ```

   Jika nanti dipublikasikan, tambahkan origin situs produksi, misalnya `https://taskflow.example.com`.
6. Kosongkan **Authorized redirect URIs**. TaskFlow memakai popup dengan callback JavaScript, bukan OAuth redirect.
7. Klik **Create**, lalu salin **Client ID** yang berakhiran `.apps.googleusercontent.com`.

Google mungkin menampilkan **Client Secret** saat membuat Web application. Simpan secara pribadi jika ingin digunakan untuk integrasi server lain di masa depan, tetapi **jangan masukkan Client Secret ke TaskFlow atau kirimkan melalui chat**. Integrasi login Google saat ini hanya menggunakan Client ID.

## 2. Masukkan Client ID ke TaskFlow

Di `backend/.env` yang sudah ada, tambahkan satu baris:

```dotenv
GOOGLE_CLIENT_ID="123456789-example.apps.googleusercontent.com"
```

Buat `frontend/.env` dari `frontend/.env.example`, lalu isi dengan **Client ID yang sama**:

```dotenv
VITE_GOOGLE_CLIENT_ID="123456789-example.apps.googleusercontent.com"
```

Ganti contoh ID di atas dengan Client ID asli Anda. Jangan menambahkan Client Secret ke `frontend/.env`; variabel `VITE_` dapat dibaca oleh browser. Kedua file `.env` diabaikan Git.

## 3. Terapkan migrasi database

Pastikan `DATABASE_URL` dan `DIRECT_URL` dalam `backend/.env` menunjuk ke PostgreSQL yang aktif. Dari PowerShell, jalankan:

```powershell
cd backend
npx.cmd prisma migrate deploy --schema=prisma/schema.prisma
cd ..
```

Migrasi ini membuat kolom identitas Google dan mengizinkan akun Google tanpa password. Pada pemeriksaan terakhir, koneksi Prisma ke Supabase masih gagal dengan `P1001`; migrasi belum bisa selesai sebelum koneksi database pulih.

## 4. Jalankan dan uji

```powershell
npm.cmd run dev
```

Buka `http://localhost:5173/login` atau `http://localhost:5173/register`, lalu klik tombol Google. Pilih akun Google dan pastikan TaskFlow membuka dashboard. Jika akun dengan email yang sama sudah terdaftar memakai password, masuk dengan password dahulu, lalu buka **Pengaturan Akun → Akun Google** untuk menghubungkannya.

Jika tombol bertuliskan "belum tersedia", periksa `frontend/.env` dan jalankan ulang Vite. Jika Google menampilkan kesalahan origin, periksa bahwa `http://localhost:5173` tercantum persis di Authorized JavaScript origins. Jika TaskFlow menampilkan kesalahan server setelah memilih akun, periksa koneksi database dan hasil migrasi.

Referensi: [setup Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [pengelolaan OAuth client](https://support.google.com/cloud/answer/15549257), [pengaturan audience](https://support.google.com/cloud/answer/15549945).

## Deploy ke server atau hosting

File `.env` lokal tidak dikirim oleh Git. Masukkan nilai berikut **sekali** di pengaturan Environment Variables atau Secrets milik platform hosting. Platform akan menyuntikkannya lagi pada build dan deploy berikutnya.

| Tempat | Variabel | Nilai |
| --- | --- | --- |
| Build frontend | `VITE_GOOGLE_CLIENT_ID` | Web Client ID Google |
| Build frontend | `VITE_API_URL` | URL publik backend ditambah `/api`, misalnya `https://api.example.com/api` |
| Runtime backend | `GOOGLE_CLIENT_ID` | Web Client ID Google yang sama |
| Runtime backend | `FRONTEND_URL` | Origin frontend, misalnya `https://app.example.com` |
| Runtime backend | `DATABASE_URL` | URL PostgreSQL untuk aplikasi |
| Migrasi backend | `DIRECT_URL` | URL PostgreSQL untuk migrasi Prisma |
| Runtime backend | `JWT_SECRET` | Kunci acak yang kuat, khusus produksi |
| Runtime backend | `NODE_ENV` | `production` |

Jalankan `npx prisma migrate deploy --schema=prisma/schema.prisma` dari direktori `backend` pada tahap rilis sebelum backend baru menerima request. Pastikan `DIRECT_URL` tersedia untuk proses migrasi. Setelah deploy, periksa endpoint `https://api.example.com/health` dan uji login Google dari situs produksi.

Tambahkan origin frontend produksi, misalnya `https://app.example.com`, ke **Authorized JavaScript origins** di Google Auth Platform → Clients. Gunakan HTTPS dan jangan sertakan path `/login` atau `/register` pada origin.

`VITE_GOOGLE_CLIENT_ID` dibundel ke JavaScript saat **build frontend**. Jika Client ID berubah, build dan deploy ulang frontend. `GOOGLE_CLIENT_ID` dibaca saat backend berjalan, sehingga backend perlu restart setelah nilainya berubah. Jangan memasukkan Client Secret ke variabel `VITE_` atau ke repository. Alur login TaskFlow saat ini tidak memakai Client Secret sama sekali.
