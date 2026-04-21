# 🚀 Production Deployment Quick Start

## Your VPS Information
- **IP Address**: 104.251.222.183
- **Repository**: https://github.com/mugisha-cyber/Etera-Health-Initiative
- **Status**: ✅ Code pushed to GitHub

---

## Step 1: SSH into Your VPS

```bash
ssh root@104.251.222.183
```

**If using SSH key:**
```bash
ssh -i ~/.ssh/your_key_file root@104.251.222.183
```

**If first time connecting, answer YES to host key verification:**
```
The authenticity of host '104.251.222.183' can't be established.
ED25519 key fingerprint is SHA256:...
Are you sure you want to continue connecting (yes/no)? yes
```

---

## Step 2: Run Automated Setup Script

Once connected to the VPS, run:

```bash
curl -fsSL https://raw.githubusercontent.com/mugisha-cyber/Etera-Health-Initiative/main/setup.sh | bash
```

**Or download and run locally:**
```bash
wget https://raw.githubusercontent.com/mugisha-cyber/Etera-Health-Initiative/main/setup.sh
sudo bash setup.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Docker & Docker Compose
- ✅ Clone your repository
- ✅ Configure permissions
- ✅ Set up firewall rules
- ✅ Create backup directory
- ✅ Create .env file template

---

## Step 3: Configure Environment Variables

After setup script completes, edit the .env file:

```bash
cd /opt/etera-health
nano .env
```

**CRITICAL values to change:**

```env
# Database - Use strong random passwords
DB_PASSWORD=change_to_strong_password_12345
DB_ROOT_PASSWORD=change_to_strong_root_password_67890
DB_POOL_SIZE=20

# Security - Generate with: openssl rand -base64 32
JWT_SECRET=your_very_long_random_secret_here_XXXXXXXXXXXXXXX

# Domain Configuration
CORS_ORIGIN=https://yourdomain.com
FRONTEND_API_BASE=https://yourdomain.com

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@etera.health

# Server Configuration
NODE_ENV=production
LOG_LEVEL=info
```

**To save in nano:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 4: Deploy Application

```bash
cd /opt/etera-health
./deploy.sh
```

This script will:
- ✅ Backup database
- ✅ Build Docker containers
- ✅ Start services
- ✅ Verify health checks
- ✅ Display status

---

## Step 5: Verify Deployment

```bash
# Check services running
docker-compose ps

# Run health check
./health-check.sh

# View logs
docker-compose logs -f

# Test API
curl http://localhost:5000
curl http://localhost:5000/health/ready
```

---

## Step 6: Setup SSL/HTTPS (Important!)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace yourdomain.com)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Configure Nginx with SSL
# Edit frontend/nginx.conf to add SSL paths
# Then restart: docker-compose restart frontend
```

---

## 🎯 Access Your Application

After deployment, your application will be available at:

- **Frontend**: http://104.251.222.183 (or http://yourdomain.com)
- **API**: http://104.251.222.183:5000 (or http://api.yourdomain.com)
- **Health**: http://104.251.222.183:5000/health/ready

---

## 📋 Common Commands

```bash
# View logs
docker-compose logs -f backend        # Backend logs
docker-compose logs -f frontend       # Frontend logs
docker-compose logs -f db             # Database logs

# Restart services
docker-compose restart backend
docker-compose restart frontend

# Stop all services
docker-compose stop

# Start all services
docker-compose up -d

# Backup database
docker-compose exec db mysqldump -u etera_user -p etera_health > backup.sql

# Restore database
docker-compose exec -T db mysql -u etera_user -p etera_health < backup.sql

# Update and redeploy
git pull origin main
docker-compose build
docker-compose up -d
```

---

## 🔒 Security Checklist

After deployment, complete these security tasks:

- [ ] Change default admin password (in database)
- [ ] Configure CORS_ORIGIN to your actual domain
- [ ] Set up SSL/HTTPS certificate
- [ ] Enable firewall rules
- [ ] Configure DNS records
- [ ] Set up automated backups
- [ ] Enable monitoring and alerts
- [ ] Test all functionality
- [ ] Setup rate limiting (optional enhancement)
- [ ] Enable 2FA for admin accounts (future)

---

## 📊 Monitoring

Check application health regularly:

```bash
# Every service should show "healthy"
docker-compose ps

# Or run automated check
./health-check.sh

# Monitor resource usage
docker stats

# Check disk space
df -h
```

---

## ⚡ Troubleshooting

### Database won't connect
```bash
docker-compose logs db
docker-compose restart db
```

### API not responding
```bash
docker-compose logs backend
curl http://localhost:5000
```

### Frontend not loading
```bash
docker-compose logs frontend
curl http://localhost/
```

### Port already in use
Edit `.env` and change the port, then:
```bash
docker-compose down
docker-compose up -d
```

### Out of disk space
```bash
docker system prune -a
df -h
```

---

## 📚 Documentation

For more information, see:
- **DEPLOYMENT.md** - Comprehensive deployment guide
- **DOCKER.md** - Docker quick reference
- **SECURITY.md** - Security best practices
- **README.md** - Project overview
- **VPS_DEPLOYMENT_GUIDE.md** - Detailed VPS setup

---

## 🆘 Getting Help

1. Check logs: `docker-compose logs -f`
2. Run health check: `./health-check.sh`
3. Check documentation in repository
4. Verify .env configuration
5. Check firewall rules

---

## ✅ Production Ready Checklist

```
ETERA Health Initiative - Production Deployment
================================================

✓ Code pushed to GitHub
✓ Docker containers ready
✓ Database schema created
✓ Security hardening implemented
✓ Logging configured
✓ Health checks enabled
✓ Automation scripts ready
✓ Documentation complete

Status: READY FOR PRODUCTION
```

---

## 🎉 You're All Set!

Your production-ready ETERA Health Initiative application is ready to deploy.

**Next Action:** SSH into your VPS and run the setup script above!

```bash
ssh root@104.251.222.183
curl -fsSL https://raw.githubusercontent.com/mugisha-cyber/Etera-Health-Initiative/main/setup.sh | bash
```

Good luck with your deployment! 🚀
