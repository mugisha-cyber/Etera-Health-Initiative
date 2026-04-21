# ETERA Health Initiative - Production Deployment Guide

## Overview
This is a full-stack application with a Node.js/Express backend and vanilla JavaScript frontend, containerized with Docker for easy deployment.

### Technology Stack
- **Backend**: Node.js 18+ with Express.js
- **Frontend**: Vanilla JavaScript with Nginx
- **Database**: MySQL 8.0
- **Container Runtime**: Docker & Docker Compose
- **Web Server**: Nginx (reverse proxy)

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- 2GB RAM minimum
- 10GB disk space minimum

## Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Etera_Health_initiative
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit with your production values
nano .env
```

### 3. Build and Deploy
```bash
# Build all containers
docker-compose build

# Start services
docker-compose up -d

# Check service status
docker-compose ps
```

## Configuration

### Required Environment Variables (.env)

#### Database
- `DB_HOST`: MySQL hostname (default: db)
- `DB_PORT`: MySQL port (default: 3306)
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password (**MUST change in production**)
- `DB_ROOT_PASSWORD`: MySQL root password (**MUST change in production**)
- `DB_NAME`: Database name (default: etera_health)
- `DB_POOL_SIZE`: Connection pool size (default: 10)

#### Server
- `NODE_ENV`: Environment (development/production)
- `PORT`: Backend API port (default: 5000)
- `API_PORT`: External API port (default: 5000)
- `WEB_PORT`: Frontend web port (default: 80)

#### Security
- `JWT_SECRET`: Secret key for JWT tokens (**MUST be strong and unique**)
- `JWT_EXPIRE`: JWT expiration time (default: 7d)

#### CORS
- `CORS_ORIGIN`: Allowed origins (comma-separated)
- `CORS_ALLOW_ALL`: Allow all origins (default: false)
- `CORS_ALLOW_ALL_DEV`: Dev mode override (default: false)

#### Email (Optional)
- `SMTP_HOST`: Email server host
- `SMTP_PORT`: Email server port
- `SMTP_USER`: Email account username
- `SMTP_PASSWORD`: Email account password
- `SMTP_FROM`: Sender email address

#### Frontend
- `FRONTEND_API_BASE`: API base URL for frontend

#### Logging
- `LOG_LEVEL`: Log level (error/warn/info/debug, default: info)

## Docker Compose Services

### 1. MySQL Database
- **Container**: etera_mysql
- **Port**: 3306 (configurable)
- **Data**: Persisted in `mysql_data` volume
- **Health Check**: Enabled

### 2. Backend API
- **Container**: etera_backend
- **Port**: 5000 (configurable)
- **Dependencies**: MySQL
- **Uploads**: `/uploads` directory mounted
- **Health Check**: Enabled

### 3. Frontend
- **Container**: etera_frontend
- **Port**: 80 (configurable)
- **Dependencies**: Backend
- **Web Server**: Nginx with optimizations
- **Health Check**: Enabled

## Operational Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f frontend
```

### Stop Services
```bash
# Graceful stop
docker-compose stop

# Forced stop
docker-compose kill

# Stop specific service
docker-compose stop backend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart backend
```

### Update and Deploy
```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose up -d
```

### Database Management
```bash
# Access MySQL CLI
docker-compose exec db mysql -u$DB_USER -p$DB_PASSWORD -D$DB_NAME

# Create backup
docker-compose exec db mysqldump -u$DB_USER -p$DB_PASSWORD $DB_NAME > backup.sql

# Restore from backup
docker-compose exec -T db mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME < backup.sql
```

### Clean Up
```bash
# Remove stopped containers
docker-compose rm

# Remove volumes (DELETES DATA)
docker-compose down -v

# Full cleanup
docker system prune -a
```

## Production Best Practices

### 1. Security
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Keep Docker images updated
- [ ] Use HTTPS/TLS in production
- [ ] Enable firewall rules
- [ ] Restrict database access to backend only
- [ ] Use environment-specific .env files (never commit)
- [ ] Implement rate limiting (future enhancement)
- [ ] Add API authentication for sensitive endpoints

### 2. Database
- [ ] Regular automated backups (daily minimum)
- [ ] Monitor disk space
- [ ] Optimize queries
- [ ] Enable slow query logs
- [ ] Set up replication for high availability
- [ ] Use connection pooling (already configured)

### 3. Logging & Monitoring
- [ ] Centralize logs (ELK, Splunk, CloudWatch, etc.)
- [ ] Monitor container memory/CPU
- [ ] Set up alerts for errors and downtime
- [ ] Monitor response times
- [ ] Track error rates

### 4. Backup & Disaster Recovery
- [ ] Automated daily database backups
- [ ] Off-site backup storage
- [ ] Disaster recovery plan
- [ ] Regular restore testing
- [ ] Document recovery procedures

### 5. Performance
- [ ] Enable caching headers (already configured)
- [ ] Use CDN for static assets
- [ ] Monitor slow queries
- [ ] Optimize database indices
- [ ] Load testing before production

### 6. Deployment
- [ ] Use version control
- [ ] Implement CI/CD pipeline
- [ ] Test in staging environment
- [ ] Plan for zero-downtime deployments
- [ ] Have rollback procedures ready

## Nginx Configuration

The frontend uses Nginx with:
- **SSL/TLS Support**: Configure in nginx.conf
- **Gzip Compression**: Enabled for text assets
- **Security Headers**: CORS, CSP, X-Frame-Options, etc.
- **Caching**: Static assets cached for 30 days
- **API Proxy**: Routes /api and /uploads to backend
- **SPA Routing**: Serves index.html for all non-file routes

### Enable HTTPS

1. Obtain SSL certificate (Let's Encrypt)
2. Update nginx.conf with SSL configuration
3. Restart frontend service

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

## Troubleshooting

### Backend won't start
- Check logs: `docker-compose logs backend`
- Verify database is running: `docker-compose logs db`
- Check environment variables: Ensure all required vars are set
- Database connection timeout: Increase MySQL memory/CPU

### Database connection errors
- Verify credentials in .env
- Check MySQL is healthy: `docker-compose exec db mysqladmin ping`
- Verify DB_HOST is set to "db" in docker-compose
- Check connection pool size

### Frontend not loading
- Check logs: `docker-compose logs frontend`
- Verify backend is running and healthy
- Check CORS configuration
- Clear browser cache
- Check network tab for API errors

### Performance issues
- Monitor resources: `docker stats`
- Check logs for slow queries
- Increase DB_POOL_SIZE if needed
- Verify disk space: `docker volume ls`

### Port conflicts
- Change ports in .env file
- Or: `docker-compose down` and restart with different ports

## Scaling & High Availability

For production scale:
1. **Database Replication**: Set up MySQL master-slave replication
2. **Load Balancing**: Use reverse proxy (HAProxy, AWS ELB)
3. **Container Orchestration**: Consider Kubernetes
4. **Auto-scaling**: Implement with Kubernetes or cloud provider
5. **CDN**: Use for static assets

## Support & Maintenance

- **Updates**: Regularly update Docker images and dependencies
- **Security Patches**: Apply immediately
- **Monitoring**: Implement comprehensive monitoring
- **Documentation**: Keep deployment docs updated
- **Testing**: Regular backup restore testing

## API Health Endpoints

- `GET /` - Basic health check
- `GET /health/ready` - Readiness probe (includes DB check)

Use these for monitoring and load balancer health checks.

## Emergency Procedures

### Database Corruption
1. Stop containers: `docker-compose stop`
2. Restore from backup: See "Restore from backup" section
3. Verify integrity
4. Restart: `docker-compose up -d`

### Complete System Failure
1. All data in volumes: `docker volume ls`
2. Restore from backup
3. Rebuild containers: `docker-compose build --no-cache`
4. Deploy fresh: `docker-compose up -d`

### Security Breach
1. Immediately change all passwords
2. Rotate JWT_SECRET
3. Review logs for unauthorized access
4. Update firewall rules
5. Rescan containers for vulnerabilities

## Version Information
- Created: 2024
- Node.js: 18+
- MySQL: 8.0
- Nginx: Latest Alpine
- Express.js: 5.2+

---

For questions or issues, check the logs and consult Docker documentation.
