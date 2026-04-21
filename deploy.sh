#!/bin/bash
# Production Deployment Script
# This script handles safe deployment with health checks and rollback capability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo -e "${YELLOW}=== ETERA Health Initiative Production Deployment ===${NC}"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if .env exists
if [ ! -f .env ]; then
    error ".env file not found. Please run: cp .env.example .env"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup Database
log "Step 1: Creating database backup..."
if docker-compose exec -T db mysqldump \
    -u$(grep DB_USER .env | cut -d'=' -f2) \
    -p$(grep DB_PASSWORD .env | cut -d'=' -f2) \
    $(grep DB_NAME .env | cut -d'=' -f2) > "$BACKUP_FILE"; then
    log "✓ Database backed up to $BACKUP_FILE"
else
    error "Database backup failed!"
    exit 1
fi

# Step 2: Pull latest code
log "Step 2: Pulling latest code..."
if git pull origin main 2>/dev/null; then
    log "✓ Code updated"
else
    warn "Could not pull from git (might be offline or not a git repo)"
fi

# Step 3: Build new containers
log "Step 3: Building containers..."
if docker-compose build --no-cache > /tmp/build.log 2>&1; then
    log "✓ Containers built successfully"
else
    error "Build failed! Check /tmp/build.log"
    exit 1
fi

# Step 4: Check if services are currently running
RUNNING=$(docker-compose ps -q 2>/dev/null | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    log "Step 4: Stopping current services..."
    docker-compose stop
fi

# Step 5: Start new containers
log "Step 5: Starting services..."
docker-compose up -d

# Step 6: Wait for services to be healthy
log "Step 6: Waiting for services to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:5000 > /dev/null 2>&1; then
        log "✓ Backend is healthy"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    error "Backend failed to become healthy within 60 seconds"
    warn "Rolling back to previous state..."
    docker-compose down
    error "Deployment failed. Please check logs and restore from backup."
    exit 1
fi

# Step 7: Verify database connectivity
log "Step 7: Verifying database connection..."
if docker-compose exec -T db mysqladmin ping \
    -u$(grep DB_USER .env | cut -d'=' -f2) \
    -p$(grep DB_PASSWORD .env | cut -d'=' -f2) > /dev/null 2>&1; then
    log "✓ Database connection verified"
else
    error "Database connection failed!"
    exit 1
fi

# Step 8: Check frontend
log "Step 8: Verifying frontend..."
if curl -s http://localhost/index.html > /dev/null 2>&1; then
    log "✓ Frontend is accessible"
else
    warn "Frontend might not be ready yet, but backend is healthy"
fi

log "✓ Deployment completed successfully!"
log "Backup stored at: $BACKUP_FILE"
echo ""
echo -e "${GREEN}Services running:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo "Frontend: http://localhost"
echo "API: http://localhost:5000"
echo "Database: localhost:3306"
echo ""
echo -e "${YELLOW}Don't forget to:${NC}"
echo "1. Test the application thoroughly"
echo "2. Monitor logs: docker-compose logs -f"
echo "3. Check database: docker-compose exec db mysql -u etera_user -p"
