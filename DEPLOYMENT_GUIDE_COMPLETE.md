# 🚀 COMPLETE DEPLOYMENT GUIDE - Step by Step

## Your Configuration Summary

```
VPS IP: 104.251.222.183
VPS Username: root
VPS Password: AdieusMasaisSpirtPotdar
GitHub Repo: https://github.com/mugisha-cyber/Etera-Health-Initiative
Email: eterahealthinitiative@gmail.com
Gmail App Password: unxj kyfb zccj dhkm
Database Password: MUGISHa@3030
JWT Secret: TnF8hK9mP2xR5vL3qW7jB6nY4cV1sD0eZ8aG9fT5hM2rL7wK3bX6vP1nS4jC8d
Contact Email: eterahealthinitiative@gmail.com
```

---

# PHASE 1: PUSH CODE TO GITHUB (Local Machine - 5 minutes)

## Step 1.1: Install/Update npm packages locally
```powershell
cd C:\Users\POSITIVO\Desktop\Etera_Health_initiative\backend

# Install the new rate-limiting package
npm install

# Verify installation
npm list express-rate-limit
```

**Expected Output:**
```
express-rate-limit@7.0.0
```

---

## Step 1.2: Configure production .env file

Edit `.env.production` in the root folder:

```powershell
# Open the file
notepad C:\Users\POSITIVO\Desktop\Etera_Health_initiative\.env.production
```

**Replace the content with:**
```env
NODE_ENV=production

# Database
DB_HOST=db
DB_PORT=3306
DB_USER=etera_user
DB_PASSWORD=MUGISHa@3030
DB_ROOT_PASSWORD=MUGISHa@3030
DB_NAME=etera_health
DB_POOL_SIZE=20

# Server
PORT=5000
API_PORT=5000
WEB_PORT=80

# CORS (using IP for now, no domain)
CORS_ORIGIN=http://104.251.222.183
CORS_ALLOW_ALL=false
CORS_ALLOW_ALL_DEV=false

# Security
JWT_SECRET=TnF8hK9mP2xR5vL3qW7jB6nY4cV1sD0eZ8aG9fT5hM2rL7wK3bX6vP1nS4jC8d
JWT_EXPIRE=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=eterahealthinitiative@gmail.com
SMTP_PASSWORD=unxj kyfb zccj dhkm
SMTP_FROM=noreply@etera.health
CONTACT_TO=eterahealthinitiative@gmail.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Save the file** (Ctrl+S in Notepad)

---

## Step 1.3: Create root .env file for Docker

Copy .env.production to .env:

```powershell
cd C:\Users\POSITIVO\Desktop\Etera_Health_initiative

# Copy the production .env
Copy-Item .env.production .env

# Verify
Get-Content .env | head -20
```

---

## Step 1.4: Commit and push to GitHub

```powershell
cd C:\Users\POSITIVO\Desktop\Etera_Health_initiative

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Production deployment: rate limiting, error handling, email config, secure .env"

# Add remote (if not added)
git remote add origin https://github.com/mugisha-cyber/Etera-Health-Initiative.git

# Push to GitHub
git push -u origin main

# Verify
git log --oneline -5
```

**Expected Output:**
```
All files pushed successfully
```

---

# PHASE 2: SSH TO VPS & INSTALL DOCKER (10 minutes)

## Step 2.1: Open Terminal and SSH to VPS

**Open PowerShell on your local machine and run:**

```powershell
# SSH to VPS
ssh root@104.251.222.183
```

**When prompted:**
```
Password: AdieusMasaisSpirtPotdar
```

**If you get a question about host key verification:**
```
Are you sure you want to continue connecting (yes/no)? yes
```

**Expected Output:**
```
Welcome to [VPS provider]
root@your-server:~#
```

---

## Step 2.2: Update system packages

```bash
sudo apt update && sudo apt upgrade -y
```

**This takes 2-3 minutes. Wait for completion.**

---

## Step 2.3: Install Docker

```bash
# Download Docker install script
curl -fsSL https://get.docker.com -o get-docker.sh

# Install Docker
sudo sh get-docker.sh

# Verify Docker installed
docker --version

# Expected: Docker version 20.10+
```

---

## Step 2.4: Install Docker Compose

```bash
# Download and install
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version

# Expected: Docker Compose version 2.20.2+
```

---

## Step 2.5: Add user to docker group

```bash
# Allow running docker without sudo
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Test
docker ps
```

**Expected: No permission errors**

---

# PHASE 3: CLONE REPO & DEPLOY (15 minutes)

## Step 3.1: Clone your GitHub repository

```bash
# Navigate to /opt
cd /opt

# Clone the repo
sudo git clone https://github.com/mugisha-cyber/Etera-Health-Initiative.git

# Change ownership
sudo chown -R $USER:$USER Etera-Health-Initiative

# Navigate into project
cd Etera-Health-Initiative

# Verify files
ls -la
```

**Expected: See all your project files**

---

## Step 3.2: Verify .env file exists

```bash
# Check if .env file exists
ls -la | grep env

# View first 10 lines
head -10 .env

# Should show your database config
```

---

## Step 3.3: Build Docker images

```bash
# Build all containers (takes 5-10 minutes)
docker-compose build

# Watch the build process
# Should end with: Successfully tagged...
```

**⏳ Wait for completion (this takes time)**

---

## Step 3.4: Start all services

```bash
# Start all containers
docker-compose up -d

# Check status
docker-compose ps

# Should show all containers as "Up"
```

---

## Step 3.5: Wait for services to be healthy

```bash
# Watch logs for startup
docker-compose logs -f

# Look for:
# backend: "Server running on port 5000"
# frontend: "nginx started successfully"
# db: "ready for connections"

# Press Ctrl+C to exit logs
```

**Wait 30-60 seconds for all services to start**

---

## Step 3.6: Verify all services are healthy

```bash
# Check health status
docker-compose ps

# All should show "Up" in STATUS column
```

---

## Step 3.7: Test the API

```bash
# Test API is running
curl http://localhost:5000/

# Expected response:
# {"message":"ETERA Health Initiative API is running","version":"1.0.0",...}

# Test health check
curl http://localhost:5000/health/ready

# Expected response:
# {"status":"healthy","database":"connected",...}
```

---

# PHASE 4: ACCESS YOUR APPLICATION (5 minutes)

## Step 4.1: Access from your local machine

**From your laptop browser:**

```
Frontend: http://104.251.222.183
API: http://104.251.222.183:5000
API Health: http://104.251.222.183:5000/health/ready
```

**Test in your browser:**
- Visit: `http://104.251.222.183`
- Should see your ETERA Health Initiative homepage

---

## Step 4.2: Test database connection

```bash
# Connect to database
docker-compose exec db mysql -u etera_user -p

# Password: MUGISHa@3030

# Once connected, run:
USE etera_health;
SHOW TABLES;

# Should show all your database tables
# Type: exit to disconnect
```

---

## Step 4.3: View backend logs

```bash
# Real-time backend logs
docker-compose logs -f backend

# Should show: "Server running on port 5000"
# Rate limiting enabled
# CORS configured

# Press Ctrl+C to exit
```

---

# PHASE 5: SETUP SSL/HTTPS WITH LET'S ENCRYPT (Optional but Recommended)

## Step 5.1: Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## Step 5.2: Get SSL certificate (requires domain)

**Important: You need a domain name to get SSL**

If you get a domain later, run:

```bash
# Replace your-domain.com with your actual domain
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter your email
# - Accept terms
# - Certificate saved to /etc/letsencrypt/live/your-domain.com/
```

---

# PHASE 6: QUICK REFERENCE - USEFUL COMMANDS

```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f

# Restart all services
docker-compose restart

# Stop all services
docker-compose stop

# Start all services
docker-compose start

# View backend logs only
docker-compose logs -f backend

# View database logs
docker-compose logs -f db

# Backup database
docker-compose exec db mysqldump -u etera_user -p etera_health > backup_$(date +%s).sql

# Restore database
docker-compose exec -T db mysql -u etera_user -p etera_health < backup.sql
```

---

# 🎯 DEPLOYMENT COMPLETE!

After Phase 3 (Docker deployment), your application is LIVE:

✅ **Frontend**: http://104.251.222.183
✅ **API**: http://104.251.222.183:5000
✅ **Health Check**: http://104.251.222.183:5000/health/ready
✅ **Database**: Connected and initialized
✅ **Email**: Configured and ready

---

# ⚠️ IMPORTANT NOTES

1. **Rate Limiting is Active**:
   - 100 API requests per 15 minutes per IP
   - 5 login attempts per 15 minutes per IP
   - 10 contact messages per hour per IP

2. **Email Notifications**:
   - Contact form submissions are sent to eterahealthinitiative@gmail.com
   - Gmail app password is configured

3. **Error Handling**:
   - All endpoints have proper error handling
   - Check logs if something fails: `docker-compose logs -f`

4. **Database**:
   - Automatically initialized from init.sql
   - Data persists in mysql_data volume

5. **Backups**:
   - Database persists in Docker volume
   - Create backups regularly using the command above

---

# 🚀 YOU'RE READY TO START!

Follow the phases above in order:
1. Push code to GitHub (5 min)
2. SSH and install Docker (10 min)
3. Clone and deploy with Docker (15 min)
4. Verify and test (5 min)

**Total time: ~35 minutes**

Let me know when you're ready to start! I'll help you through each step. 🎉
