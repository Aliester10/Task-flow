# TaskFlow - Start All Services
# Run: powershell -ExecutionPolicy Bypass -File start.ps1

$Host.UI.RawUI.WindowTitle = "TaskFlow Launcher"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ████████╗ █████╗ ███████╗██╗  ██╗███████╗██╗      ██████╗ ██╗    ██╗" -ForegroundColor Cyan
    Write-Host "     ██║   ███████║███████╗█████╔╝ █████╗  ██║     ██║   ██║██║ █╗ ██║" -ForegroundColor Cyan
    Write-Host "     ██║   ██╔══██║╚════██║██╔═██╗ ██╔══╝  ██║     ██║   ██║██║███╗██║" -ForegroundColor Cyan
    Write-Host "     ██║   ██║  ██║███████║██║  ██╗██║     ███████╗╚██████╔╝╚███╔███╔╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Project Management Web App" -ForegroundColor Gray
    Write-Host "  ================================================" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step($step, $msg) {
    Write-Host "  " -NoNewline
    Write-Host "[$step]" -ForegroundColor Yellow -NoNewline
    Write-Host " $msg"
}

function Write-Ok($msg) {
    Write-Host "  " -NoNewline
    Write-Host "[OK]" -ForegroundColor Green -NoNewline
    Write-Host " $msg"
}

function Write-Err($msg) {
    Write-Host "  " -NoNewline
    Write-Host "[ERROR]" -ForegroundColor Red -NoNewline
    Write-Host " $msg"
}

Write-Header

# Check Node.js
try {
    $nodeVer = node --version 2>&1
    Write-Ok "Node.js $nodeVer ditemukan"
} catch {
    Write-Err "Node.js tidak ditemukan! Download dari https://nodejs.org"
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

# Install backend deps
Write-Host ""
Write-Step "1/4" "Setup backend..."
Set-Location "$rootDir\backend"

if (-not (Test-Path "node_modules")) {
    Write-Step "..." "Installing backend dependencies..."
    npm install --silent
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install backend gagal!"; Read-Host; exit 1 }
}
Write-Ok "Backend dependencies OK"

# Prisma generate
Write-Step "..." "Generating Prisma client..."
npm run prisma:generate --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Prisma generate gagal! Periksa DATABASE_URL di .env"
    Read-Host; exit 1
}
Write-Ok "Prisma client generated"

# Prisma migrate
Write-Step "..." "Running database migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 | Out-Null
Write-Ok "Database ready"

# Install frontend deps
Write-Host ""
Write-Step "2/4" "Setup frontend..."
Set-Location "$rootDir\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Step "..." "Installing frontend dependencies..."
    npm install --silent
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install frontend gagal!"; Read-Host; exit 1 }
}
Write-Ok "Frontend dependencies OK"

# Start servers
Write-Host ""
Write-Step "3/4" "Menjalankan servers..."
Write-Host ""
Write-Host "  ================================================" -ForegroundColor DarkGray
Write-Host "   Backend  : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Frontend : " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor DarkGray
Write-Host ""

# Start backend in new window
$backendCmd = "cd '$rootDir\backend'; Write-Host '[BACKEND] Starting...' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

# Wait for backend
Start-Sleep -Seconds 3

# Start frontend in new window
$frontendCmd = "cd '$rootDir\frontend'; Write-Host '[FRONTEND] Starting...' -ForegroundColor Yellow; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

# Wait then open browser
Write-Step "4/4" "Membuka browser..."
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host ""
Write-Ok "TaskFlow berjalan!"
Write-Host ""
Write-Host "  Login dengan:" -ForegroundColor Gray
Write-Host "  Email    : owner@taskflow.com" -ForegroundColor White
Write-Host "  Password : password123" -ForegroundColor White
Write-Host ""
Read-Host "Tekan Enter untuk menutup launcher ini"
