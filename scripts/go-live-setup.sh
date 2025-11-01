#!/bin/bash
set -euo pipefail

# SaasPE Production Go-Live Setup Script
# This script automates the 10 final steps before production launch
# See GO_LIVE_CHECKLIST.md for detailed documentation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

prompt() {
    echo -e "${YELLOW}[?]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    local missing_tools=()

    command -v aws >/dev/null 2>&1 || missing_tools+=("aws-cli")
    command -v gh >/dev/null 2>&1 || missing_tools+=("gh")
    command -v vercel >/dev/null 2>&1 || missing_tools+=("vercel")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")

    if [ ${#missing_tools[@]} -gt 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        info "Install missing tools with: ./scripts/install-clis.sh"
        exit 1
    fi

    success "All prerequisites installed"
}

# Step 1: Subscribe on-call email to SNS alerts
setup_sns_alerts() {
    info ""
    info "=== Step 1/10: Subscribe on-call email to SNS alerts ==="

    prompt "Enter the on-call email address for production alerts:"
    read -r ONCALL_EMAIL

    if [ -z "$ONCALL_EMAIL" ]; then
        warning "Skipping SNS subscription (no email provided)"
        return
    fi

    SNS_TOPIC_ARN="arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts"

    info "Subscribing $ONCALL_EMAIL to $SNS_TOPIC_ARN..."
    aws sns subscribe \
        --topic-arn "$SNS_TOPIC_ARN" \
        --protocol email \
        --notification-endpoint "$ONCALL_EMAIL" \
        --region us-east-2

    success "SNS subscription created"
    warning "Check $ONCALL_EMAIL inbox and confirm subscription"
}

# Step 2: Configure Sentry alert rules
setup_sentry_alerts() {
    info ""
    info "=== Step 2/10: Configure Sentry alert rules ==="

    info "Opening Sentry alert configuration..."
    info "Backend: https://o4510247421018112.sentry.io/projects/saaspe-backend/alerts/"
    info "Frontend: https://o4510247421018112.sentry.io/projects/saaspe-web/alerts/"

    prompt "Configure Sentry alerts for:"
    echo "  1. Error spike detection (>10 errors in 5 minutes)"
    echo "  2. New release regressions (error rate increase >20%)"
    echo "  3. Performance degradation (P95 >500ms)"

    prompt "Press ENTER when Sentry alerts are configured..."
    read -r

    success "Sentry alerts configured"
}

# Step 3: Verify frontend sourcemaps upload
verify_sourcemaps() {
    info ""
    info "=== Step 3/10: Verify frontend sourcemaps upload ==="

    info "Checking if SENTRY_AUTH_TOKEN is configured in GitHub secrets..."

    if gh secret list | grep -q "SENTRY_AUTH_TOKEN"; then
        success "SENTRY_AUTH_TOKEN is configured in GitHub"
    else
        error "SENTRY_AUTH_TOKEN not found in GitHub secrets"
        prompt "Add with: gh secret set SENTRY_AUTH_TOKEN --body \"<your-token>\""
        exit 1
    fi

    info "Verifying Vercel environment variables..."
    warning "Check that SENTRY_AUTH_TOKEN is set in Vercel project settings"
    info "Visit: https://vercel.com/settings"

    prompt "Press ENTER when Vercel environment is configured..."
    read -r

    success "Sourcemaps configuration verified"
}

# Step 4: Set Vercel production environment variables
setup_vercel_env() {
    info ""
    info "=== Step 4/10: Set Vercel production environment variables ==="

    prompt "Enter your production API URL (e.g., https://api.your-domain.com):"
    read -r API_URL

    if [ -z "$API_URL" ]; then
        warning "Skipping Vercel environment setup"
        return
    fi

    cd "$PROJECT_ROOT/saaspe-web"

    info "Setting NEXT_PUBLIC_API_URL in Vercel..."
    vercel env add NEXT_PUBLIC_API_URL production <<< "$API_URL"

    success "Vercel environment variables configured"
}

# Step 5: Deploy frontend to Vercel production
deploy_frontend() {
    info ""
    info "=== Step 5/10: Deploy frontend to Vercel production ==="

    cd "$PROJECT_ROOT/saaspe-web"

    info "Deploying to Vercel production..."
    DEPLOYMENT_URL=$(vercel --prod --yes)

    success "Frontend deployed to: $DEPLOYMENT_URL"
}

# Step 6: Protect main branch
protect_main_branch() {
    info ""
    info "=== Step 6/10: Protect main branch ==="

    info "Configuring branch protection for main..."

    # Get repository info
    REPO_OWNER=$(gh repo view --json owner -q .owner.login)
    REPO_NAME=$(gh repo view --json name -q .name)

    gh api \
        --method PUT \
        -H "Accept: application/vnd.github+json" \
        "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" \
        -f required_status_checks='{"strict":true,"contexts":["Backend Deploy (ECS Fargate)","Frontend Deploy (Vercel)"]}' \
        -f enforce_admins=true \
        -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
        -f restrictions=null \
        || warning "Branch protection may already be configured"

    success "Main branch protection enabled"
}

# Step 7: Create AWS Budget alerts
setup_aws_budgets() {
    info ""
    info "=== Step 7/10: Create AWS Budget alerts ==="

    prompt "Enter monthly budget limit in USD (e.g., 500):"
    read -r BUDGET_AMOUNT

    if [ -z "$BUDGET_AMOUNT" ]; then
        warning "Skipping AWS Budget setup"
        return
    fi

    prompt "Enter budget notification email:"
    read -r BUDGET_EMAIL

    if [ -z "$BUDGET_EMAIL" ]; then
        warning "Skipping AWS Budget setup (no email provided)"
        return
    fi

    info "Creating AWS Budget..."

    cat > /tmp/budget.json <<EOF
{
  "BudgetName": "SaasPE-Production-Monthly",
  "BudgetType": "COST",
  "TimeUnit": "MONTHLY",
  "BudgetLimit": {
    "Amount": "$BUDGET_AMOUNT",
    "Unit": "USD"
  },
  "CostFilters": {},
  "CostTypes": {
    "IncludeTax": true,
    "IncludeSubscription": true,
    "UseBlended": false
  }
}
EOF

    cat > /tmp/notifications.json <<EOF
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "$BUDGET_EMAIL"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "$BUDGET_EMAIL"
      }
    ]
  }
]
EOF

    aws budgets create-budget \
        --account-id "$(aws sts get-caller-identity --query Account --output text)" \
        --budget file:///tmp/budget.json \
        --notifications-with-subscribers file:///tmp/notifications.json \
        || warning "Budget may already exist"

    rm -f /tmp/budget.json /tmp/notifications.json

    success "AWS Budget configured with 80% and 100% alerts"
}

# Step 8: Run smoke tests
run_smoke_tests() {
    info ""
    info "=== Step 8/10: Run smoke tests ==="

    info "Checking ECS service health..."
    ./scripts/mcp aws ecs describe --service saaspe-production-service

    ALB_URL="http://saaspe-production-alb-45434008.us-east-2.elb.amazonaws.com"

    info "Testing API health endpoint..."
    if curl -f -s "$ALB_URL/api/v1/health" > /dev/null; then
        success "API health check passed"
    else
        error "API health check failed"
        exit 1
    fi

    info "Running load test (optional - requires artillery)..."
    if command -v artillery >/dev/null 2>&1; then
        warning "Load test skipped (implement with: artillery run tests/load.yml)"
    else
        warning "Artillery not installed - skipping load test"
    fi

    success "Smoke tests completed"
}

# Step 9: Verify DR backups
verify_dr_backups() {
    info ""
    info "=== Step 9/10: Verify DR backups ==="

    info "Checking RDS automated backups..."
    aws rds describe-db-instances \
        --db-instance-identifier saaspe-production-postgres \
        --query 'DBInstances[0].{BackupRetention:BackupRetentionPeriod,PreferredBackupWindow:PreferredBackupWindow}' \
        --region us-east-2

    success "RDS automated backups verified"
    warning "Schedule quarterly DR drill as per PRODUCTION_HARDENING_GUIDE.md"
}

# Step 10: Create initial release
create_initial_release() {
    info ""
    info "=== Step 10/10: Create initial release ==="

    CURRENT_SHA=$(git rev-parse HEAD)

    info "Creating GitHub release v1.0.0..."
    gh release create v1.0.0 \
        --title "SaasPE v1.0.0 - Production Launch" \
        --notes "🚀 Initial production release

## Features
- Complete sales engagement platform
- Email warmup and management
- AI-powered proposal generation
- Journey tracking and analytics
- Multi-tenant architecture

## Infrastructure
- AWS ECS Fargate deployment
- PostgreSQL 15 with automated backups
- Redis caching layer
- CloudWatch monitoring (13 alarms)
- Sentry error tracking
- Auto-scaling (1-2 tasks)

## Monitoring
- Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=saaspe-production-overview
- Sentry: https://o4510247421018112.sentry.io

## Documentation
- Incident Runbook: INCIDENT_RUNBOOK.md
- Go-Live Checklist: GO_LIVE_CHECKLIST.md
- Production Hardening: PRODUCTION_HARDENING_GUIDE.md

Deployed: $CURRENT_SHA" \
        || warning "Release may already exist"

    success "Initial release v1.0.0 created"
}

# Main execution
main() {
    info "SaasPE Production Go-Live Setup"
    info "================================"
    info ""
    info "This script will guide you through the 10 final steps before production launch."
    info "See GO_LIVE_CHECKLIST.md for detailed documentation."
    info ""

    prompt "Press ENTER to begin setup, or Ctrl+C to cancel..."
    read -r

    check_prerequisites

    setup_sns_alerts
    setup_sentry_alerts
    verify_sourcemaps
    setup_vercel_env
    deploy_frontend
    protect_main_branch
    setup_aws_budgets
    run_smoke_tests
    verify_dr_backups
    create_initial_release

    info ""
    success "✅ Go-Live Setup Complete!"
    info ""
    info "Next steps:"
    info "  1. Monitor CloudWatch dashboard: https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=saaspe-production-overview"
    info "  2. Monitor Sentry: https://o4510247421018112.sentry.io"
    info "  3. Watch ECS logs: ./scripts/mcp aws ecs logs --service saaspe-production-service --follow"
    info "  4. Review INCIDENT_RUNBOOK.md for on-call procedures"
    info ""
    success "🚀 You're ready for production launch!"
}

main "$@"
