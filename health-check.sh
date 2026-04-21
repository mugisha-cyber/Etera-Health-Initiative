#!/bin/bash
# Health Check Script
# Use this to monitor application health

echo "=== ETERA Health Initiative - Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check Docker daemon
echo "1. Docker Status:"
if docker ps > /dev/null 2>&1; then
    echo "   ✓ Docker daemon running"
else
    echo "   ✗ Docker daemon not responding"
    exit 1
fi

# Check containers
echo ""
echo "2. Container Status:"
docker-compose ps

# Check services
echo ""
echo "3. Service Health:"

# Check backend
echo -n "   Backend: "
if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo "✓ Running"
else
    echo "✗ Not responding"
fi

# Check frontend
echo -n "   Frontend: "
if curl -s http://localhost/ > /dev/null 2>&1; then
    echo "✓ Running"
else
    echo "✗ Not responding"
fi

# Check database
echo -n "   Database: "
if docker-compose exec -T db mysqladmin ping -u etera_user -p${DB_PASSWORD} > /dev/null 2>&1; then
    echo "✓ Running"
else
    echo "✗ Not responding"
fi

# Check disk space
echo ""
echo "4. Disk Usage:"
docker system df

# Check logs for errors (last 10 errors)
echo ""
echo "5. Recent Errors (if any):"
docker-compose logs --tail=50 2>&1 | grep -i "error" | head -10 || echo "   No errors found"

echo ""
echo "=== Health Check Complete ==="
