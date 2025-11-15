#!/bin/bash

# Production Database Setup Script
# This script runs migrations and seeds the production database
#
# Prerequisites:
# - DATABASE_URL environment variable must be set to production database
# - NODE_ENV must be set to 'production'
# - Session Manager plugin installed (for ECS Exec method)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SaasPE Production Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Safety check - confirm production
if [ "$NODE_ENV" != "production" ]; then
  echo -e "${RED}ERROR: NODE_ENV must be 'production'${NC}"
  echo "Current: NODE_ENV=$NODE_ENV"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: You are about to modify the PRODUCTION database!${NC}"
echo -e "Database: $(echo $DATABASE_URL | sed 's/:\/\/.*@/:*****@/')"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Running database migrations...${NC}"
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Migrations completed${NC}"
else
  echo -e "${RED}❌ Migration failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Seeding database with reference data...${NC}"
npm run seed:production

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Seed completed${NC}"
else
  echo -e "${RED}❌ Seed failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Production database setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Run test user creation: cd /tmp && ./create-test-users.sh production"
echo "2. Verify logins at: https://app.saasope.com/login"
echo ""
