# VPS Deployment Guide - Step by Step

## Prerequisites Setup on Your Local Machine

### Step 1: Install Git (if not already installed)
```powershell
# Using Windows Package Manager (recommended)
winget install Git.Git

# Or download from https://git-scm.com/download/win
```

### Step 2: Configure Git
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Pushing Code to Repository

### Step 3: Initialize Git (if not already done)
```powershell
cd C:\Users\POSITIVO\Desktop\Etera_Health_initiative
git init
```

### Step 4: Add Remote Repository
```powershell
# Replace with your actual repository URL
git remote add origin https://github.com/yourusername/Etera_Health_initiative.git

# Or if using SSH:
git remote add origin git@github.com:yourusername/Etera_Health_initiative.git

# Verify
git remote -v
```

### Step 5: Add All Files
```powershell
git add .
```

### Step 6: Commit Changes
```powershell
git commit -m "feat: Production-ready setup with Docker containerization

- Added Docker and Docker Compose configuration
- Implemented multi-stage builds for optimization
- Added security hardening (Helmet.js, non-root users)
- Created comprehensive logging system
- Added environment-based configuration
- Implemented health checks and graceful shutdown
- Created complete deployment documentation
- Added CI/CD pipeline configuration
- Database schema and initialization script
- Nginx configuration with security headers"
```

### Step 7: Push to Repository
```powershell
# For GitHub
git push -u origin main

# Or if your default branch is master:
git push -u origin master
```

---

## Server Setup (After Pushing Code)

### On Your VPS (SSH Access)

#### Step 1: Install Docker & Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Allow non-root user to run Docker (optional but recommended)
sudo usermod -aG docker $USER
newgrp docker
```

#### Step 2: Clone Repository on VPS
```bash
# Choose a directory for your app
cd /opt
sudo git clone https://github.com/yourusername/Etera_Health_initiative.git
cd Etera_Health_initiative

# Or if using existing directory, pull latest
git pull origin main
```

#### Step 3: Configure Environment
```bash
# Copy and edit environment file
sudo cp .env.example .env
sudo nano .env

# IMPORTANT: Change these values:
# - DB_PASSWORD (strong random password)
# - DB_ROOT_PASSWORD (strong random password)
# - JWT_SECRET (very long random string)
# - CORS_ORIGIN (your domain)
# - SMTP credentials (for email)
```

#### Step 4: Set Permissions
```bash
sudo chown -R $USER:$USER /opt/Etera_Health_initiative
chmod +x deploy.sh health-check.sh
```

#### Step 5: Deploy Application
```bash
# Option A: Quick start
docker-compose build
docker-compose up -d

# Option B: Using deployment script (includes backup)
./deploy.sh

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f
```

#### Step 6: Setup SSL/HTTPS (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace domain.com with your domain)
sudo certbot certonly --standalone -d domain.com -d www.domain.com

# Update nginx.conf with SSL paths
# Then reload: docker-compose restart frontend
```

#### Step 7: Configure Firewall
```bash
# UFW (Ubuntu Firewall)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Post-Deployment

### Health Check
```bash
# From your local machine
curl http://104.251.222.183
curl http://104.251.222.183/health/ready

# Or on VPS
./health-check.sh
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Update & Redeploy
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Or use deployment script
./deploy.sh
```

---

## Quick Command Reference

### Git Commands
```powershell
git status                          # Check status
git add .                          # Stage all files
git commit -m "message"            # Commit
git push origin main               # Push to remote
git log --oneline                  # View commit history
```

### Docker Commands
```bash
docker-compose up -d               # Start services
docker-compose down                # Stop services
docker-compose ps                  # List services
docker-compose logs -f             # View logs
docker-compose build               # Build images
docker-compose restart backend     # Restart service
```

### Database Commands
```bash
docker-compose exec db mysql -u etera_user -p etera_health
# Common MySQL commands in shell:
SHOW TABLES;
SELECT * FROM users;
BACKUP: mysqldump -u etera_user -p etera_health > backup.sql
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 80
sudo lsof -i :80
sudo netstat -tulpn | grep LISTEN

# Or change ports in .env
docker-compose down
# Edit .env ports
docker-compose up -d
```

### Connection Issues
```bash
# Check if backend is running
curl http://localhost:5000

# Check network
docker network ls
docker network inspect etera_network
```

### Database Issues
```bash
# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec db mysql -u etera_user -p -e "SELECT 1;"

# Restart database
docker-compose restart db
```

### Out of Disk Space
```bash
df -h                              # Check disk usage
docker system df                   # Check Docker usage
docker system prune -a             # Clean up unused containers/images
```

---

## Support Resources

- **Docker Docs**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Git Docs**: https://git-scm.com/doc
- **Let's Encrypt**: https://letsencrypt.org/
- **Nginx**: https://nginx.org/en/docs/

## Summary of Changes Made

✅ Docker Containerization (Backend + Frontend + Database)
✅ Security Hardening (Helmet, CORS, Input validation)
✅ Structured Logging System
✅ Environment Configuration Management
✅ Health Checks & Monitoring
✅ Database Schema & Initialization
✅ Nginx Reverse Proxy with SSL ready
✅ Comprehensive Documentation
✅ CI/CD Pipeline Configuration
✅ Deployment Automation Scripts

Your application is now ready for production deployment!
