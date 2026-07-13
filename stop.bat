@echo off
title TaskFlow - Stopping...
color 0C

echo.
echo  [TaskFlow] Menghentikan semua server...
echo.

:: Kill processes pada port 5000 dan 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Tutup terminal windows TaskFlow
taskkill /F /FI "WINDOWTITLE eq TaskFlow Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq TaskFlow Frontend" >nul 2>&1

echo  [OK] Semua server dihentikan.
echo.
timeout /t 2 /nobreak >nul
