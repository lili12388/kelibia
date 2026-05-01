#!/usr/bin/env pwsh
# ─── Edarna Deploy Script ───
# Usage: .\deploy.ps1
# Pushes code to GitHub, then SSHs into VPS to pull & rebuild.

$VPS = "root@31.22.10.133"
$PROJECT_DIR = "/root/KhadhraRentals"
$REPO = "https://github.com/lili12388/kelibia.git"

Write-Host "`n🚀 Deploying Edarna to production...`n" -ForegroundColor Cyan

# Step 1: Commit & push to GitHub
Write-Host "📦 Committing changes..." -ForegroundColor Yellow
git add -A
$commitMsg = Read-Host "Commit message (or press Enter for 'update')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "update" }
git commit -m $commitMsg
git push kelibia main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git push failed. Fix any errors above." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Code pushed to GitHub!" -ForegroundColor Green

# Step 2: SSH into VPS, pull changes, rebuild
Write-Host "`n🔨 Building on VPS..." -ForegroundColor Yellow
ssh $VPS "cd $PROJECT_DIR && git pull origin main && docker compose up -d --build"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 Deploy complete! Site is live at http://31.22.10.133" -ForegroundColor Green
} else {
    Write-Host "`n❌ Deploy failed. SSH into VPS to check logs." -ForegroundColor Red
}
