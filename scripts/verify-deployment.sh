#!/bin/bash
set -euo pipefail

# SaasPE Production Deployment Verification Script
# Performs comprehensive health checks on all production infrastructure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASS++))
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARN++))
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAIL++))
}

section() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check AWS infrastructure
check_aws() {
    section "AWS Infrastructure"

    # ECS Service
    info "Checking ECS service..."
    ECS_STATUS=$(aws ecs describe-services \
        --cluster saaspe-production-cluster \
        --services saaspe-production-service \
        --region us-east-2 \
        --query 'services[0].{status:status,running:runningCount,desired:desiredCount}' \
        --output json)

    ECS_RUNNING=$(echo "$ECS_STATUS" | jq -r '.running')
    ECS_DESIRED=$(echo "$ECS_STATUS" | jq -r '.desired')
    ECS_STATUS_VAL=$(echo "$ECS_STATUS" | jq -r '.status')

    if [ "$ECS_STATUS_VAL" = "ACTIVE" ] && [ "$ECS_RUNNING" -ge "$ECS_DESIRED" ]; then
        success "ECS service is healthy ($ECS_RUNNING/$ECS_DESIRED tasks running)"
    else
        error "ECS service unhealthy: $ECS_STATUS_VAL ($ECS_RUNNING/$ECS_DESIRED tasks)"
    fi

    # RDS Database
    info "Checking RDS database..."
    RDS_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier saaspe-production-postgres \
        --region us-east-2 \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text)

    if [ "$RDS_STATUS" = "available" ]; then
        success "RDS database is available"
    else
        error "RDS database status: $RDS_STATUS"
    fi

    # Redis Cache
    info "Checking Redis cache..."
    REDIS_STATUS=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id saaspe-production-redis \
        --region us-east-2 \
        --query 'CacheClusters[0].CacheClusterStatus' \
        --output text)

    if [ "$REDIS_STATUS" = "available" ]; then
        success "Redis cache is available"
    else
        warning "Redis cache status: $REDIS_STATUS"
    fi

    # ALB
    info "Checking Application Load Balancer..."
    ALB_STATUS=$(aws elbv2 describe-load-balancers \
        --names saaspe-production-alb \
        --region us-east-2 \
        --query 'LoadBalancers[0].State.Code' \
        --output text)

    if [ "$ALB_STATUS" = "active" ]; then
        success "ALB is active"
    else
        error "ALB status: $ALB_STATUS"
    fi

    # Target Health
    info "Checking ALB target health..."
    TARGET_HEALTH=$(aws elbv2 describe-target-health \
        --target-group-arn arn:aws:elasticloadbalancing:us-east-2:392853978631:targetgroup/saaspe-production-tg/958b737667b87097 \
        --region us-east-2 \
        --query 'TargetHealthDescriptions[0].TargetHealth.State' \
        --output text 2>/dev/null || echo "unavailable")

    if [ "$TARGET_HEALTH" = "healthy" ]; then
        success "ALB targets are healthy"
    else
        warning "ALB target health: $TARGET_HEALTH"
    fi
}

# Check CloudWatch monitoring
check_monitoring() {
    section "Monitoring & Observability"

    # CloudWatch Dashboard
    info "Checking CloudWatch dashboard..."
    if aws cloudwatch get-dashboard \
        --dashboard-name saaspe-production-overview \
        --region us-east-2 >/dev/null 2>&1; then
        success "CloudWatch dashboard exists"
    else
        warning "CloudWatch dashboard not found"
    fi

    # CloudWatch Alarms
    info "Checking CloudWatch alarms..."
    ALARM_COUNT=$(aws cloudwatch describe-alarms \
        --region us-east-2 \
        --query 'length(MetricAlarms[?starts_with(AlarmName, `saaspe-production`)])' \
        --output text)

    if [ "$ALARM_COUNT" -ge 10 ]; then
        success "CloudWatch alarms configured ($ALARM_COUNT alarms)"
    else
        warning "Only $ALARM_COUNT CloudWatch alarms found (expected 13+)"
    fi

    # SNS Topic
    info "Checking SNS alert topic..."
    SNS_SUBS=$(aws sns list-subscriptions-by-topic \
        --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
        --region us-east-2 \
        --query 'length(Subscriptions)' \
        --output text)

    if [ "$SNS_SUBS" -gt 0 ]; then
        success "SNS topic has $SNS_SUBS subscription(s)"
    else
        warning "SNS topic has no subscriptions - alerts will not be delivered"
    fi

    # Auto-scaling
    info "Checking auto-scaling policies..."
    SCALING_POLICIES=$(aws application-autoscaling describe-scaling-policies \
        --service-namespace ecs \
        --resource-id service/saaspe-production-cluster/saaspe-production-service \
        --region us-east-2 \
        --query 'length(ScalingPolicies)' \
        --output text 2>/dev/null || echo "0")

    if [ "$SCALING_POLICIES" -ge 2 ]; then
        success "Auto-scaling policies configured ($SCALING_POLICIES policies)"
    else
        warning "Auto-scaling not fully configured (found $SCALING_POLICIES policies)"
    fi
}

# Check GitHub Actions
check_github() {
    section "CI/CD & Automation"

    # GitHub workflows
    info "Checking GitHub Actions workflows..."
    if [ -f ".github/workflows/backend-deploy.yml" ]; then
        success "Backend deployment workflow exists"
    else
        error "Backend deployment workflow not found"
    fi

    if [ -f ".github/workflows/frontend-deploy.yml" ]; then
        success "Frontend deployment workflow exists"
    else
        warning "Frontend deployment workflow not found"
    fi

    # GitHub secrets
    info "Checking GitHub secrets..."
    SECRETS=$(gh secret list 2>/dev/null | wc -l || echo "0")

    if [ "$SECRETS" -ge 5 ]; then
        success "GitHub secrets configured ($SECRETS secrets)"
    else
        warning "Only $SECRETS GitHub secrets found"
    fi

    # Sentry token
    if gh secret list 2>/dev/null | grep -q "SENTRY_AUTH_TOKEN"; then
        success "SENTRY_AUTH_TOKEN configured"
    else
        warning "SENTRY_AUTH_TOKEN not configured"
    fi
}

# Check API health
check_api() {
    section "API Health Checks"

    ALB_URL="http://saaspe-production-alb-45434008.us-east-2.elb.amazonaws.com"

    # Health endpoint
    info "Testing API health endpoint..."
    if HEALTH_RESPONSE=$(curl -f -s -w "\n%{http_code}" "$ALB_URL/api/v1/health" 2>/dev/null); then
        HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
        if [ "$HTTP_CODE" = "200" ]; then
            success "API health endpoint responding (200 OK)"
        else
            warning "API health endpoint returned HTTP $HTTP_CODE"
        fi
    else
        error "API health endpoint not accessible"
    fi

    # Response time
    info "Checking API response time..."
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$ALB_URL/api/v1/health" 2>/dev/null || echo "999")

    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        success "API response time: ${RESPONSE_TIME}s"
    else
        warning "API response time slow: ${RESPONSE_TIME}s"
    fi
}

# Check documentation
check_docs() {
    section "Documentation & Runbooks"

    local docs=(
        "GO_LIVE_CHECKLIST.md"
        "INCIDENT_RUNBOOK.md"
        "PRODUCTION_HARDENING_GUIDE.md"
        "PHASE3_MONITORING_COMPLETE.md"
        "PRODUCTION_READY_SUMMARY.md"
    )

    for doc in "${docs[@]}"; do
        if [ -f "$doc" ]; then
            success "$doc exists"
        else
            warning "$doc not found"
        fi
    done
}

# Check secrets
check_secrets() {
    section "Secrets Management"

    info "Checking AWS Secrets Manager..."

    # Database password
    if aws secretsmanager describe-secret \
        --secret-id saaspe-production-db-password \
        --region us-east-2 >/dev/null 2>&1; then
        success "Database password secret exists"
    else
        error "Database password secret not found"
    fi

    # App secrets
    if aws secretsmanager describe-secret \
        --secret-id saaspe-production-app-secrets \
        --region us-east-2 >/dev/null 2>&1; then
        success "Application secrets exist"
    else
        error "Application secrets not found"
    fi
}

# Generate summary
generate_summary() {
    section "Verification Summary"

    TOTAL=$((PASS + FAIL + WARN))

    echo ""
    echo "Results:"
    echo -e "  ${GREEN}✓ Passed:${NC}  $PASS"
    echo -e "  ${YELLOW}! Warnings:${NC} $WARN"
    echo -e "  ${RED}✗ Failed:${NC}  $FAIL"
    echo -e "  Total:    $TOTAL"
    echo ""

    if [ "$FAIL" -eq 0 ]; then
        if [ "$WARN" -eq 0 ]; then
            success "🎉 All checks passed! Production deployment is fully healthy."
            return 0
        else
            warning "⚠️  Deployment is functional but has $WARN warning(s) to address."
            return 0
        fi
    else
        error "❌ Deployment verification failed with $FAIL critical issue(s)."
        return 1
    fi
}

# Main execution
main() {
    echo "SaasPE Production Deployment Verification"
    echo "=========================================="

    check_aws
    check_monitoring
    check_github
    check_api
    check_secrets
    check_docs

    generate_summary
}

main "$@"
