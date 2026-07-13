@echo off
title TaskFlow - First Time Setup
color 0B

echo.
echo  ============================================
echo   TaskFlow - First Time Setup
echo  ============================================
echo.
echo  Script ini akan:
echo  1. Install semua dependencies
echo  2. Setup database (migrate + seed demo data)
echo  3. Siapkan environment
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js tidak ditemukan!
    echo  Download dari: https://nodejs.org/en/download
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER%

:: Check .env exists
if not exist "%~dp0backend\.env" (
    color 0C
    echo.
    echo  [ERROR] File backend\.env tidak ditemukan!
    echo  Copy dari .env.example dan isi DATABASE_URL Anda.
    echo.
    echo  Contoh:
    echo  DATABASE_URL="postgresql://user:pass@host:5432/dbname"
    pause
    exit /b 1
)
echo  [OK] File .env ditemukan

echo.
echo  --- Install Backend Dependencies ---
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] npm install backend gagal!
    pause
    exit /b 1
)
echo  [OK] Backend dependencies installed

echo.
echo  --- Generate Prisma Client ---
call npm run prisma:generate
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Prisma generate gagal!
    echo  Pastikan DATABASE_URL di .env sudah benar.
    pause
    exit /b 1
)
echo  [OK] Prisma client generated

echo.
echo  --- Run Database Migration ---
call npm run prisma:migrate
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Migration gagal!
    echo  Pastikan database bisa diakses.
    pause
    exit /b 1
)
echo  [OK] Database migration selesai

echo.
echo  --- Seed Demo Data ---
echo  Akan membuat akun demo dan sample data...
call npm run prisma:seed
if %errorlevel% neq 0 (
    echo  [WARN] Seed gagal atau data sudah ada - lanjut...
) else (
    echo  [OK] Demo data berhasil dibuat
)

echo.
echo  --- Install Frontend Dependencies ---
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] npm install frontend gagal!
    pause
    exit /b 1
)
echo  [OK] Frontend dependencies installed

echo.
color 0A
echo  ============================================
echo   Setup Selesai!
echo  ============================================
echo.
echo  Akun Demo:
echo    Email    : owner@taskflow.com
echo    Password : password123
echo.
echo  Jalankan aplikasi dengan: start.bat
echo.
echo  Atau jalankan manual:
echo    Backend  : cd backend ^&^& npm run dev
echo    Frontend : cd frontend ^&^& npm run dev
echo.
pause
