#!/bin/bash
# Add missing CompanyProfile columns to production database

set -e

echo "Getting current ECS task ID..."
export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH
TASK_ARN=$(aws ecs list-tasks --cluster saaspe-production-cluster --region us-east-2 --output text --query 'taskArns[0]')
TASK_ID=$(echo "$TASK_ARN" | rev | cut -d'/' -f1 | rev)

echo "Task ID: $TASK_ID"

echo "Adding missing columns to CompanyProfile table..."

# Use AWS ECS execute-command to run SQL directly
aws ecs execute-command \
  --cluster saaspe-production-cluster \
  --task "$TASK_ID" \
  --container saaspe-backend \
  --region us-east-2 \
  --command "/bin/sh -c 'echo \"ALTER TABLE \\\"CompanyProfile\\\" ADD COLUMN IF NOT EXISTS \\\"productsSold\\\" TEXT[] DEFAULT ARRAY[]::TEXT[], ADD COLUMN IF NOT EXISTS \\\"productsNotSold\\\" TEXT[] DEFAULT ARRAY[]::TEXT[], ADD COLUMN IF NOT EXISTS \\\"servicesSold\\\" TEXT[] DEFAULT ARRAY[]::TEXT[];\" | npx prisma db execute --stdin'" \
  --interactive

echo "Columns added successfully!"
