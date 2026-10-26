#!/bin/bash
# GTM Tracking Platform - Deployment Script for Hostinger VPS
# Usage: bash deploy.sh

set -e

echo "=== GTM Tracking Platform Deployment ==="

# 1. System update
echo "[1/8] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
fi

# 3. Install Docker Compose
echo "[3/8] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  sudo apt install docker-compose -y
fi

# 4. Clone repo (if not already present)
echo "[4/8] Checking project files..."
if [ ! -f "docker-compose.prod.yml" ]; then
  echo "ERROR: Run this script from the project root directory"
  exit 1
fi

# 5. Setup production .env for backend
echo "[5/8] Setting up environment variables..."
if [ ! -f "backend/.env.production" ]; then
  echo "Creating backend/.env.production..."
  cat > backend/.env.production << 'EOF'
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/trackingdb?retryWrites=true&w=majority
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET_64_CHARS
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
REDIS_URL=redis://localhost:6379
META_APP_ID=
META_APP_SECRET=
META_PIXEL_ID=
META_ACCESS_TOKEN=
META_WEBHOOK_VERIFY_TOKEN=
CDN_URL=https://clickssprinter.com
COLLECTOR_URL=https://api.clickssprinter.com
APP_URL=https://clickssprinter.com
EOF
  echo "IMPORTANT: Edit backend/.env.production and set a strong JWT_SECRET"
fi

# 6. Setup SSL with Certbot
echo "[6/8] Setting up SSL certificates..."
if ! command -v certbot &> /dev/null; then
  sudo apt install certbot -y
fi

echo ""
echo "=== SSL Setup ==="
echo "Run this to get SSL certificates:"
echo "  sudo certbot certonly --webroot -w /var/www/certbot -d clickssprinter.com -d www.clickssprinter.com"
echo ""

# 7. Build and start
echo "[7/8] Building Docker containers..."
docker compose -f docker-compose.prod.yml build

echo "[8/8] Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Database migration (required once for the CDP release) ==="
echo "Dry run first (checks the storage quota, changes nothing):"
echo "  docker compose -f docker-compose.prod.yml exec -e CDP_PROD_MIGRATION_CONFIRM=YES_MIGRATE_PRODUCTION -e CDP_MIGRATION_DRY_RUN=1 backend node dist/migrations/production.js"
echo "Then for real:"
echo "  docker compose -f docker-compose.prod.yml exec -e CDP_PROD_MIGRATION_CONFIRM=YES_MIGRATE_PRODUCTION backend node dist/migrations/production.js"

echo ""
echo "=== Deployment Complete ==="
echo "Backend:  https://clickssprinter.com/api"
echo "Frontend: https://clickssprinter.com"
echo "Health:   https://clickssprinter.com/health"
echo ""
echo "View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "Restart:   docker compose -f docker-compose.prod.yml restart"
echo "Stop:      docker compose -f docker-compose.prod.yml down"
