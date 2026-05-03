# ╔══════════════════════════════════════════╗
# ║  TaskFlow — Quick Start Script           ║
# ║  Run this after installing Node.js       ║
# ╚══════════════════════════════════════════╝

Write-Host "🚀 Setting up TaskFlow..." -ForegroundColor Cyan

# Backend
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
npx prisma generate
npx prisma db push
Set-Location ..

# Frontend
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "   Run 'npm run dev' in both 'backend' and 'frontend' folders." -ForegroundColor Cyan
