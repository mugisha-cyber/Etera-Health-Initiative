#!/bin/bash
# ETERA Health Initiative - VPS Production Setup Script
# Run this on your VPS server: bash setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ETERA Health Initiative - Production Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to print status
print_step() {
    echo -e "\n${YELLOW}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use: sudo bash setup.sh)"
   exit 1
fi

# Step 1: Update System
print_step "Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git nano htop
print_success "System updated"

# Step 2: Install Docker
print_step "Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed: $(docker --version)"
fi

# Step 3: Install Docker Compose
print_step "Step 3: Installing Docker Compose..."
LATEST_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
curl -L "https://github.com/docker/compose/releases/download/$LATEST_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
print_success "Docker Compose installed: $(docker-compose --version)"

# Step 4: Add current user to docker group
print_step "Step 4: Configuring Docker permissions..."
usermod -aG docker $SUDO_USER 2>/dev/null || true
print_success "Docker permissions configured"

# Step 5: Create application directory
print_step "Step 5: Setting up application directory..."
APP_DIR="/opt/etera-health"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    print_success "Created $APP_DIR"
else
    print_success "$APP_DIR already exists"
    cd "$APP_DIR"
fi

# Step 6: Clone repository
print_step "Step 6: Cloning repository..."
if [ ! -d ".git" ]; then
    git clone https://github.com/mugisha-cyber/Etera-Health-Initiative.git .
    print_success "Repository cloned"
else
    print_success "Repository already cloned, pulling latest..."
    git pull origin main
fi

# Step 7: Make scripts executable
print_step "Step 7: Setting up scripts..."
chmod +x deploy.sh health-check.sh
print_success "Scripts made executable"

# Step 8: Configure environment
print_step "Step 8: Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file"
    
    # Prompt for critical values
    echo -e "\n${YELLOW}Please configure these CRITICAL values in .env:${NC}"
    echo "1. DB_PASSWORD - Strong database password"
    echo "2. DB_ROOT_PASSWORD - Strong root password"
    echo "3. JWT_SECRET - Very long random string (32+ chars)"
    echo "4. CORS_ORIGIN - Your domain (https://yourdomain.com)"
    echo "5. SMTP_HOST, SMTP_USER, SMTP_PASSWORD - Email config"
    echo ""
    read -p "Open .env for editing now? (yes/no): " edit_env
    if [ "$edit_env" = "yes" ]; then
        nano .env
    fi
else
    print_success ".env file already exists"
fi

# Step 9: Set permissions
print_step "Step 9: Setting file permissions..."
chown -R $SUDO_USER:$SUDO_USER "$APP_DIR"
print_success "Permissions set"

# Step 10: Setup firewall
print_step "Step 10: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_success "Firewall configured"
else
    print_success "UFW not available (skip if using cloud provider firewall)"
fi

# Step 11: Create backups directory
print_step "Step 11: Setting up backups..."
mkdir -p "$APP_DIR/backups"
chown $SUDO_USER:$SUDO_USER "$APP_DIR/backups"
print_success "Backups directory created"

# Step 12: Display deployment summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Server Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit .env file (if not already done):"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Deploy the application:"
echo "   cd $APP_DIR"
echo "   ./deploy.sh"
echo ""
echo "3. Monitor the deployment:"
echo "   docker-compose logs -f"
echo ""
echo "4. Check services:"
echo "   docker-compose ps"
echo ""
echo "5. Run health check:"
echo "   ./health-check.sh"
echo ""
echo -e "${YELLOW}Important files:${NC}"
echo "- .env - Configuration (KEEP SECURE!)"
echo "- deploy.sh - Deployment automation"
echo "- health-check.sh - Service monitoring"
echo "- docker-compose.yml - Container orchestration"
echo ""
echo -e "${YELLOW}Access your application:${NC}"
echo "- Frontend: http://$(hostname -I | awk '{print $1}')"
echo "- API: http://$(hostname -I | awk '{print $1}'):5000"
echo "- Health: http://$(hostname -I | awk '{print $1}'):5000/health/ready"
echo ""
echo -e "${BLUE}========================================${NC}"

# Final note
echo ""
echo -e "${YELLOW}⚠ IMPORTANT SECURITY NOTES:${NC}"
echo "1. Change ALL default passwords in .env"
echo "2. Generate a strong JWT_SECRET (use: openssl rand -base64 32)"
echo "3. Configure CORS_ORIGIN to your domain"
echo "4. Set up SSL/HTTPS certificate (Let's Encrypt)"
echo "5. Never commit .env to git"
echo "6. Setup automated backups"
echo "7. Enable monitoring and alerts"
echo ""
