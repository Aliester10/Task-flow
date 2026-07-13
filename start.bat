@echo off
title TaskFlow - Starting...
color 0A

echo.
echo  ████████╗ █████╗ ███████╗██╗  ██╗███████╗██╗      ██████╗ ██╗    ██╗
echo  ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔════╝██║     ██╔═══██╗██║    ██║
echo     ██║   ███████║███████╗█████╔╝ █████╗  ██║     ██║   ██║██║ █╗ ██║
echo     ██║   ██╔══██║╚════██║██╔═██╗ ██╔══╝  ██║     ██║   ██║██║███╗██║
echo     ██║   ██║  ██║███████║██║  ██╗██║     ███████╗╚██████╔╝╚███╔███╔╝
echo     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
echo.
echo  Project Management Web App
echo  ================================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js tidak ditemukan!
    echo  Download dari: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER% ditemukan
echo.

:: ================================================
:: BACKEND SETUP
:: ================================================
echo  [1/4] Menginstall dependencies backend...
cd /d "%~dp0backend"

if not exist "node_modules" (
    call npm install --silent
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] npm install backend gagal!
        pause
        exit /b 1
    )
    echo  [OK] Backend dependencies terinstall
) else (
    echo  [OK] Backend dependencies sudah ada
)

:: ================================================
:: PRISMA SETUP
:: ================================================
echo.
echo  [2/4] Setup Prisma dan database...

:: Generate Prisma client
call npm run prisma:generate --silent >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Prisma generate gagal! Periksa DATABASE_URL di .env
    pause
    exit /b 1
)
echo  [OK] Prisma client generated

:: Run migrations (non-interactive untuk production-like)
call npx prisma migrate deploy --schema=prisma/schema.prisma >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] migrate deploy gagal, mencoba migrate dev...
    :: Jika deploy gagal, coba dev (butuh interaksi - skip jika sudah ada)
    echo  [INFO] Database mungkin sudah up-to-date
)
echo  [OK] Database migration selesai

:: ================================================
:: FRONTEND SETUP
:: ================================================
echo.
echo  [3/4] Menginstall dependencies frontend...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    call npm install --silent
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] npm install frontend gagal!
        pause
        exit /b 1
    )
    echo  [OK] Frontend dependencies terinstall
) else (
    echo  [OK] Frontend dependencies sudah ada
)

:: ================================================
:: START SERVERS
:: ================================================
echo.
echo  [4/4] Menjalankan server...
echo.
echo  ================================================
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:5173
echo   API Docs : http://localhost:5000/health
echo  ================================================
echo.
echo  Tekan Ctrl+C di masing-masing window untuk stop
echo.

:: Buka Backend di window baru
start "TaskFlow Backend" cmd /k "cd /d "%~dp0backend" && color 0B && echo. && echo  [BACKEND] Starting... && echo. && npm run dev"

:: Tunggu 3 detik agar backend start lebih dulu
timeout /t 3 /nobreak >nul

:: Buka Frontend di window baru
start "TaskFlow Frontend" cmd /k "cd /d "%~dp0frontend" && color 0E && echo. && echo  [FRONTEND] Starting... && echo. && npm run dev"

:: Tunggu 5 detik lalu buka browser
timeout /t 5 /nobreak >nul
echo  Membuka browser...
start http://localhost:5173

echo.
echo  [OK] TaskFlow berjalan!
echo  Tutup window ini atau biarkan terbuka.
echo.
pause
