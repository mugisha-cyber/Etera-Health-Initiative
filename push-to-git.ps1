#!/usr/bin/env pwsh
# Git Push Helper Script for ETERA Health Initiative

$projectPath = "C:\Users\POSITIVO\Desktop\Etera_Health_initiative"
$repoUrl = Read-Host "Enter your repository URL (e.g., https://github.com/username/repo.git)"
$branchName = Read-Host "Enter branch name (default: main)" -DefaultValue "main"

Write-Host "================================================" -ForegroundColor Green
Write-Host "ETERA Health Initiative - Git Push Setup" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "$projectPath\.env.example")) {
    Write-Host "Error: Project directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath
Write-Host "✓ Changed to project directory: $projectPath" -ForegroundColor Green

# Check git
Write-Host "`nChecking for Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Git is installed" -ForegroundColor Green

# Initialize git if needed
if (-not (Test-Path .git)) {
    Write-Host "`nInitializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "`n✓ Git repository already initialized" -ForegroundColor Green
}

# Check if remote exists
$remoteExists = git config --get remote.origin.url 2>$null
if (-not $remoteExists) {
    Write-Host "`nAdding remote repository..." -ForegroundColor Yellow
    git remote add origin $repoUrl
    Write-Host "✓ Remote added: $repoUrl" -ForegroundColor Green
} else {
    Write-Host "`n✓ Remote already configured: $remoteExists" -ForegroundColor Green
}

# Configure git user if needed
$gitUser = git config --global user.name 2>$null
if (-not $gitUser) {
    Write-Host "`nConfiguring Git user..." -ForegroundColor Yellow
    $name = Read-Host "Enter your name"
    $email = Read-Host "Enter your email"
    git config --global user.name $name
    git config --global user.email $email
    Write-Host "✓ Git user configured" -ForegroundColor Green
} else {
    Write-Host "`n✓ Git user already configured: $gitUser" -ForegroundColor Green
}

# Check status
Write-Host "`nChecking repository status..." -ForegroundColor Yellow
git status

# Ask to proceed
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Ready to commit and push?" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$proceed = Read-Host "Continue? (yes/no)" -DefaultValue "yes"
if ($proceed -ne "yes" -and $proceed -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Add files
Write-Host "`nStaging files..." -ForegroundColor Yellow
git add .
Write-Host "✓ Files staged" -ForegroundColor Green

# Commit
Write-Host "`nCreating commit..." -ForegroundColor Yellow
$message = @"
feat: Production-ready setup with Docker containerization

- Added Docker and Docker Compose configuration
- Implemented multi-stage builds for optimization
- Added security hardening (Helmet.js, non-root users)
- Created comprehensive logging system
- Added environment-based configuration
- Implemented health checks and graceful shutdown
- Created complete deployment documentation
- Added CI/CD pipeline configuration
- Database schema and initialization script
- Nginx configuration with security headers
- VPS deployment guide
"@

git commit -m $message
Write-Host "✓ Changes committed" -ForegroundColor Green

# Push
Write-Host "`nPushing to repository..." -ForegroundColor Yellow
git push -u origin $branchName
Write-Host "✓ Code pushed successfully!" -ForegroundColor Green

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "SUCCESS! Code pushed to repository" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. SSH into your VPS (104.251.222.183)" -ForegroundColor White
Write-Host "2. Clone the repository" -ForegroundColor White
Write-Host "3. Follow VPS_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "`nNeed help? Check:" -ForegroundColor Yellow
Write-Host "- VPS_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host "- DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host "- README.md" -ForegroundColor Cyan
