# Production Hardening Guide

**Date:** 2025-11-01
**Status:** Implementation Guide
**Priority:** High

## Executive Summary

This guide covers essential security hardening, monitoring enhancements, and operational readiness steps for production launch.

---

## 1. Sentry Release Automation ✅ CONFIGURED

### Backend Release Tracking

**Status:** ✅ Added to `.github/workflows/backend-deploy.yml`

**What it does:**
1. Creates Sentry release on every deployment (git SHA)
2. Links commits to release (automatic commit association)
3. Marks release as deployed to production
4. Enables release-based error tracking

**Required GitHub Secret:**
```bash
gh secret set SENTRY_AUTH_TOKEN --body "YOUR_SENTRY_AUTH_TOKEN"
```

**To get Sentry Auth Token:**
1. Visit: https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Name: `GitHub Actions - saaspe-backend`
4. Scopes: Select `project:releases`, `project:write`
5. Organization: `o4510247421018112`
6. Copy token and add to GitHub secrets

**Verification:**
- After deployment, check: https://sentry.io/organizations/o4510247421018112/projects/saaspe-backend/releases/
- You should see releases tagged with git SHA
- Errors will be grouped by release

### Frontend Sourcemaps (Vercel)

**Configuration needed in `saaspe-web/next.config.mjs`:**

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... existing config

  sentry: {
    // Upload sourcemaps during build
    hideSourceMaps: true,
    widenClientFileUpload: true,
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'o4510247421018112',
  project: 'saaspe-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});
```

**Add to Vercel Environment Variables:**
```bash
# Via Vercel Dashboard
SENTRY_AUTH_TOKEN=<your-token>

# Or via CLI
./scripts/mcp vercel env set SENTRY_AUTH_TOKEN=<token> --env production
```

**Verification:**
- Deploy to Vercel
- Check: https://sentry.io/organizations/o4510247421018112/projects/saaspe-web/releases/
- Click release → Artifacts → Should show sourcemaps uploaded

---

## 2. Alert Routing Configuration

### SNS Email Subscriptions

**Subscribe your email to production alerts:**

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-2
```

**Confirm subscription:**
- Check your email for confirmation message
- Click "Confirm subscription" link

**Add multiple emails:**
```bash
# DevOps team
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --protocol email \
  --notification-endpoint devops@yourcompany.com \
  --region us-east-2

# On-call engineer
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --protocol email \
  --notification-endpoint oncall@yourcompany.com \
  --region us-east-2
```

### Slack Integration (Optional)

**1. Create Slack Incoming Webhook:**
- Visit: https://api.slack.com/messaging/webhooks
- Click "Create New App" → "From scratch"
- App Name: `SaasPE Alerts`
- Workspace: Your workspace
- Add "Incoming Webhooks" feature
- Create webhook for channel (e.g., `#production-alerts`)
- Copy webhook URL

**2. Subscribe Slack to SNS:**
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  --region us-east-2
```

**3. Confirm subscription:**
- AWS will send HTTP POST to webhook
- Check Slack channel for confirmation message

### Sentry Alert Rules

**Configure in Sentry UI:**

**1. High Error Rate Alert:**
```
Conditions:
  - Event count > 100 in 5 minutes
  - Issue category: Error

Actions:
  - Send email to: your-email@example.com
  - Send Slack notification (if configured)

Frequency: At most once every hour
```

**2. Fatal Error Alert:**
```
Conditions:
  - Error level >= fatal
  - Any count in 1 minute

Actions:
  - Send email immediately
  - Send Slack notification (if configured)

Frequency: Every time
```

**3. New Release Regression:**
```
Conditions:
  - New issue in release
  - Issue first seen in last hour
  - Error count > 10

Actions:
  - Send email
  - Tag issue with "regression"

Frequency: At most once per release
```

**4. Performance Degradation:**
```
Conditions:
  - Transaction duration P95 > 2000ms
  - For 5 minutes

Actions:
  - Send email
  - Create Jira ticket (if integrated)

Frequency: At most once per hour
```

**To configure:**
1. Visit: https://sentry.io/organizations/o4510247421018112/alerts/rules/
2. Click "Create Alert Rule"
3. Configure conditions and actions as above
4. Save alert rule

---

## 3. Threshold Tuning Recommendations

### Initial Thresholds (Week 1-2)

**Collect baseline metrics:**
- Run production for 7-14 days
- Monitor CloudWatch dashboard daily
- Note peak usage times
- Document false positive alarms

### Metrics to Track

**ECS CPU:**
- Current threshold: 85%
- Track: Average, P95, P99 during peak hours
- Typical: 20-40% average, 60-70% peak
- Adjust if: Frequent alerts with no actual issues

**ECS Memory:**
- Current threshold: 90%
- Track: Average, P95, P99
- Typical: 40-60% average, 70-80% peak
- Adjust if: Memory creep detected (gradual increase)

**ALB 5xx Errors:**
- Current threshold: >10 in 5 minutes
- Track: Total per hour, error rate %
- Target: <1% of total requests
- Adjust if: Spikes during deployments (expected)

**Response Time:**
- Current threshold: >2 seconds
- Track: P50, P95, P99
- Target: P95 <500ms, P99 <2s
- Adjust if: Specific endpoints consistently slow

### Tuning After 2 Weeks

**Review alarm history:**
```bash
# List all alarms
aws cloudwatch describe-alarms --region us-east-2

# Get alarm history
aws cloudwatch describe-alarm-history \
  --alarm-name saaspe-production-ecs-cpu-high \
  --history-item-type StateUpdate \
  --max-records 50 \
  --region us-east-2
```

**Adjust thresholds:**
```bash
# Example: Increase ECS CPU threshold to 90%
aws cloudwatch put-metric-alarm \
  --alarm-name saaspe-production-ecs-cpu-high \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --period 300 \
  --statistic Average \
  --threshold 90 \
  --dimensions Name=ClusterName,Value=saaspe-production-cluster Name=ServiceName,Value=saaspe-production-service \
  --alarm-actions arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --region us-east-2
```

---

## 4. Disaster Recovery & Backups

### RDS Automated Backups

**Current configuration:**
- Automated backups: Enabled
- Retention period: 7 days
- Backup window: 03:00-04:00 UTC
- Preferred backup window: Daily

**Verify backup configuration:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier saaspe-production-postgres \
  --region us-east-2 \
  --query 'DBInstances[0].{BackupRetentionPeriod:BackupRetentionPeriod,PreferredBackupWindow:PreferredBackupWindow}'
```

### Manual Backup Before Changes

**Use MCP CLI:**
```bash
# Before major changes
./scripts/mcp db backup pre-change-$(date +%Y%m%d-%H%M%S)

# Before schema migrations
./scripts/mcp db backup pre-migration-$(date +%Y%m%d)
```

### Quarterly Restore Drill

**Schedule:** Every 3 months

**Procedure:**
1. Create on-demand backup:
```bash
./scripts/mcp db backup quarterly-drill-$(date +%Y%m%d)
```

2. Restore to new instance (non-prod):
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier saaspe-dr-test-$(date +%Y%m%d) \
  --db-snapshot-identifier quarterly-drill-$(date +%Y%m%d) \
  --db-instance-class db.t3.medium \
  --no-publicly-accessible \
  --region us-east-2
```

3. Verify data integrity:
   - Connect to restored instance
   - Run data validation queries
   - Check record counts
   - Verify recent transactions

4. Clean up test instance:
```bash
aws rds delete-db-instance \
  --db-instance-identifier saaspe-dr-test-$(date +%Y%m%d) \
  --skip-final-snapshot \
  --region us-east-2
```

5. Document results in runbook

### Backup Strategy

**Retention policy:**
- Automated daily: 7 days
- Manual pre-change: 30 days
- Quarterly drills: 90 days

**Storage locations:**
- Primary: RDS automated backups
- Secondary: Manual snapshots
- Long-term: Export to S3 (optional)

---

## 5. Security Hardening

### AWS OIDC Role Least Privilege

**Verify current permissions:**
```bash
aws iam get-role --role-name saaspe-production-github-actions-role --region us-east-2
```

**Review and restrict permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:us-east-2:392853978631:repository/saaspe-backend"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:DescribeServices"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ecs:cluster": "arn:aws:ecs:us-east-2:392853978631:cluster/saaspe-production-cluster"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-2:392853978631:log-group:/ecs/saaspe-production:*"
    }
  ]
}
```

### Secrets Management

**Store all secrets in AWS Secrets Manager:**

**Current secrets:**
```bash
aws secretsmanager list-secrets --region us-east-2
```

**Rotate secrets schedule:**
- JWT secrets: Every 90 days
- Encryption keys: Every 180 days
- API keys: Every 180 days
- Database passwords: Every 90 days

**Use MCP CLI for rotation:**
```bash
# Rotate JWT secret
./scripts/mcp secrets rotate saaspe/jwt-secret

# Verify rotation
./scripts/mcp secrets audit
```

### WAF on ALB (Recommended)

**Create WAF WebACL:**
```bash
# Note: This requires manual configuration via AWS Console
# Or Terraform configuration
```

**Recommended WAF rules:**
1. **AWS Managed Rules:**
   - Core rule set (blocks common attacks)
   - Known bad inputs
   - SQL injection protection
   - XSS protection

2. **Rate limiting:**
   - 2,000 requests per 5 minutes per IP
   - Blocks rapid-fire attacks

3. **Geo-blocking (optional):**
   - Allow specific countries only
   - Block high-risk regions

**To implement:**
1. AWS Console → WAF & Shield
2. Create Web ACL
3. Add managed rule groups
4. Associate with ALB
5. Monitor blocked requests

### HSTS and Security Headers

**Add to ALB listener (HTTPS):**

Already configured in backend (NestJS):
```typescript
// src/main.ts
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Verify headers:**
```bash
curl -I https://api.saasope.com | grep -i strict-transport-security
```

### Application-Layer Rate Limiting

**Configure in backend:**

```typescript
// src/main.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests per minute
    }),
  ],
})
```

**Verify:**
```bash
# Test rate limit
for i in {1..105}; do curl http://api.saasope.com/api/v1/health; done
# Should get 429 Too Many Requests after 100 requests
```

---

## 6. Cost Controls

### AWS Budgets

**Set up budget alerts:**

```bash
# Create monthly budget
aws budgets create-budget \
  --account-id 392853978631 \
  --budget '{
    "BudgetName": "SaasPE-Monthly-Budget",
    "BudgetLimit": {
      "Amount": "500",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
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
          "Address": "billing@yourcompany.com"
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
          "Address": "billing@yourcompany.com"
        },
        {
          "SubscriptionType": "SNS",
          "Address": "arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts"
        }
      ]
    }
  ]'
```

**Budget thresholds:**
- 80%: Warning email
- 100%: Critical email + SNS alert
- 120%: Automatic investigation

### Cost Optimization

**Review monthly:**
```bash
# Get cost by service
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --region us-east-2
```

**Optimize:**
- Scale down non-prod environments
- Use Reserved Instances for predictable workloads
- Enable S3 lifecycle policies
- Reduce CloudWatch log retention

---

## 7. Governance

### Branch Protection Rules

**Configure in GitHub:**

Settings → Branches → Add rule for `main`:

**Rules:**
- ✅ Require pull request reviews (1 reviewer minimum)
- ✅ Require status checks to pass before merging:
  - Backend CI (linting, tests)
  - Frontend CI (linting, build)
  - E2E tests (smoke suite)
- ✅ Require branches to be up to date
- ✅ Require signed commits (optional)
- ✅ Include administrators
- ✅ Restrict who can push to matching branches

**Via GitHub CLI:**
```bash
gh api repos/Dnick20/SaasPE/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=backend-ci \
  --field required_status_checks[contexts][]=frontend-ci \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=true
```

### E2E Test in CI

**Add to pre-deployment checks:**

Create `.github/workflows/e2e-smoke.yml`:
```yaml
name: E2E Smoke Tests

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: saaspe-web
        run: npm ci

      - name: Install Playwright
        working-directory: saaspe-web
        run: npx playwright install --with-deps

      - name: Run smoke tests
        working-directory: saaspe-web
        run: npx playwright test --grep @smoke
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: saaspe-web/playwright-report/
```

---

## 8. Quick Reference

### Required GitHub Secrets

```bash
# Required for Sentry
gh secret set SENTRY_AUTH_TOKEN

# Required for AWS
gh secret set AWS_OIDC_ROLE_ARN

# Required for E2E tests (optional)
gh secret set STAGING_URL
```

### Required GitHub Variables

```bash
# All already configured via setup-github-cicd.sh
gh variable list
```

### Alert Destinations to Configure

**Email:**
```bash
aws sns subscribe --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts --protocol email --notification-endpoint YOUR_EMAIL
```

**Slack (optional):**
```bash
aws sns subscribe --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts --protocol https --notification-endpoint SLACK_WEBHOOK_URL
```

**Sentry Alerts:**
- Configure in UI: https://sentry.io/organizations/o4510247421018112/alerts/rules/

---

## Implementation Checklist

### Week 1 - Critical

- [ ] Add `SENTRY_AUTH_TOKEN` to GitHub secrets
- [ ] Subscribe email(s) to SNS topic
- [ ] Configure Sentry alert rules
- [ ] Verify Sentry releases working (after next deploy)
- [ ] Set up AWS Budget alerts

### Week 2 - Important

- [ ] Configure frontend sourcemaps (Vercel)
- [ ] Add Slack integration (optional)
- [ ] Enable branch protection on `main`
- [ ] Review and restrict IAM role permissions
- [ ] Document DR procedures

### Week 3-4 - Optimization

- [ ] Monitor and tune alarm thresholds
- [ ] Add E2E smoke tests to CI
- [ ] Configure WAF on ALB
- [ ] Set up quarterly backup drill
- [ ] Schedule secret rotation

### Ongoing

- [ ] Weekly: Review error trends, alarm history
- [ ] Monthly: Review costs, adjust budgets
- [ ] Quarterly: DR drill, security audit
- [ ] Annually: Renew secrets, review IAM policies

---

**Status:** Ready for Implementation
**Priority:** High
**Owner:** DevOps Team
**Review Date:** 2025-11-08 (1 week)
