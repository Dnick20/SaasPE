# Production Go-Live Checklist

**Target Date:** [Your date]
**Sign-off:** DevOps Lead, Engineering Lead, Product Owner

---

## Pre-Launch (T-7 days)

### Infrastructure ✅

- [x] **ECS cluster** running and healthy
- [x] **RDS PostgreSQL** deployed and configured
- [x] **Redis ElastiCache** operational
- [x] **ALB** configured with health checks
- [x] **VPC** with public/private subnets
- [x] **Security groups** properly configured
- [x] **NAT Gateway** for private subnet internet access
- [x] **Route53** DNS configured (if using custom domain)

### CI/CD ✅

- [x] **GitHub Actions** workflows configured
  - [x] backend-deploy.yml
  - [x] backend-ci.yml
  - [x] frontend-ci.yml
  - [x] e2e-tests.yml
- [x] **GitHub secrets** configured
  - [x] AWS_OIDC_ROLE_ARN
  - [ ] SENTRY_AUTH_TOKEN ⚠️ **ACTION REQUIRED**
- [x] **GitHub variables** configured (7 total)
- [x] **OIDC authentication** working
- [ ] **Vercel** project connected ⚠️ **ACTION REQUIRED**

### Monitoring & Observability ✅

- [x] **CloudWatch dashboard** created (6 widgets)
- [x] **CloudWatch alarms** configured (13 alarms)
- [x] **SNS topic** for alerts created
- [ ] **Email subscriptions** to SNS ⚠️ **ACTION REQUIRED**
- [ ] **Slack integration** (optional)
- [x] **Sentry** configured (backend + frontend)
- [ ] **Sentry alert rules** configured ⚠️ **ACTION REQUIRED**
- [x] **Auto-scaling policies** enabled

### Security

- [ ] **Secrets rotation schedule** documented
- [ ] **IAM roles** follow least-privilege
- [ ] **AWS Budgets** configured
- [ ] **WAF** on ALB (recommended)
- [x] **HSTS headers** enabled
- [ ] **Rate limiting** configured
- [ ] **Security headers** verified
- [ ] **SSL/TLS certificates** valid

---

## T-3 Days

### Testing

- [ ] **Load testing** completed
  - Target: 100 concurrent users
  - Response time: P95 <500ms
  - Error rate: <1%
- [ ] **E2E tests** passing
  - All critical user flows
  - Payment processing
  - Authentication flows
- [ ] **Smoke tests** automated in CI
- [ ] **Database migration** tested
  - Forward migration successful
  - Rollback tested
- [ ] **Disaster recovery drill** completed
  - Backup verified
  - Restore tested

### Documentation

- [x] **Production runbook** created
- [x] **Incident response plan** documented
- [x] **Architecture diagram** up-to-date
- [x] **API documentation** complete
- [ ] **User documentation** ready
- [ ] **Status page** configured

### Stakeholder Communication

- [ ] **Go-live plan** shared with team
- [ ] **Rollback plan** documented and approved
- [ ] **On-call rotation** established
- [ ] **Escalation paths** defined
- [ ] **Customer communication** drafted

---

## T-1 Day (Final Checks)

### Pre-Flight Checklist

**Infrastructure Health:**
```bash
# Run comprehensive health check
./scripts/mcp health --detailed

# Verify all services running
./scripts/mcp aws ecs describe --service saaspe-production-service

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Verify Redis connectivity
redis-cli -h <redis-endpoint> ping

# Test API endpoint
curl http://saaspe-production-alb-45434008.us-east-2.elb.amazonaws.com/api/v1/health
```

**Expected Results:**
- ✅ ECS: 1/1 tasks running
- ✅ RDS: Available
- ✅ Redis: PONG response
- ✅ ALB: Healthy targets
- ✅ Health endpoint: HTTP 200

**Monitoring Verification:**
```bash
# Check CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM --region us-east-2
# Expected: 0 alarms in ALARM state

# Verify Sentry integration
cd SaasPE-Backend && node test-sentry.js
cd ../saaspe-web && node test-sentry.js
# Expected: Test errors appear in Sentry

# Check SNS subscriptions
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --region us-east-2
# Expected: Email confirmed
```

**CI/CD Verification:**
```bash
# Verify GitHub Actions
gh workflow list

# Check last deployment
gh run list --workflow=backend-deploy.yml --limit 1
# Expected: Success

# Test manual deployment trigger
gh workflow run backend-deploy.yml
```

**Security Verification:**
```bash
# Check SSL certificate
curl -I https://api.saasope.com
# Expected: Valid certificate

# Verify security headers
curl -I https://api.saasope.com | grep -i "strict-transport-security"
# Expected: HSTS header present

# Check IAM permissions
aws iam get-role --role-name saaspe-production-github-actions-role
# Review permissions
```

**Database Health:**
```bash
# Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=saaspe-production-postgres \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 300 \
  --region us-east-2

# Verify automated backups
aws rds describe-db-instances \
  --db-instance-identifier saaspe-production-postgres \
  --query 'DBInstances[0].{BackupRetentionPeriod:BackupRetentionPeriod}' \
  --region us-east-2
# Expected: 7 days

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('saaspe'))"
```

---

## Go-Live Day

### T-0 (Launch Time)

**Step 1: Final Backup (T-2 hours)**
```bash
# Create pre-launch backup
./scripts/mcp db backup pre-launch-$(date +%Y%m%d-%H%M%S)

# Verify backup created
./scripts/mcp db list-backups
```

**Step 2: Enable Production Monitoring (T-1 hour)**
```bash
# Subscribe primary on-call email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --protocol email \
  --notification-endpoint oncall@yourcompany.com \
  --region us-east-2

# Confirm subscription via email

# Test alert
aws sns publish \
  --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
  --subject "TEST: Production Go-Live Alert Test" \
  --message "Testing production alerts before go-live" \
  --region us-east-2
```

**Step 3: DNS Cutover (T-0)**

```bash
# If using Route53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z063876628YR29HREUGFO \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.saasope.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z3AADJGX6KTTL2",
          "DNSName": "saaspe-production-alb-45434008.us-east-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }' \
  --region us-east-2

# Wait for DNS propagation (5-15 minutes)
watch -n 10 'dig api.saasope.com'
```

**Step 4: Smoke Test Production**
```bash
# Test critical endpoints
curl https://api.saasope.com/api/v1/health
curl https://api.saasope.com/api/v1/auth/ping

# Run E2E smoke tests against production
cd saaspe-web
BASE_URL=https://app.saasope.com npx playwright test --grep @smoke

# Monitor for errors
watch -n 5 './scripts/mcp aws ecs logs --service saaspe-production-service --tail 20'
```

**Step 5: Monitor for 2 Hours**

```bash
# Watch CloudWatch dashboard
open https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=saaspe-production-overview

# Monitor Sentry
open https://sentry.io/organizations/o4510247421018112/issues/

# Check metrics every 15 minutes
watch -n 900 './scripts/mcp health'
```

**Metrics to monitor:**
- Request rate (should increase gradually)
- Error rate (should stay <1%)
- Response time (P95 <500ms)
- Task count (should be 1, may scale to 2)
- Database connections
- Redis hit rate

---

## Post-Launch (T+2 hours)

### Success Criteria

- [ ] **No P0/P1 incidents** in first 2 hours
- [ ] **Error rate** <1%
- [ ] **Response time** P95 <500ms
- [ ] **All services** healthy
- [ ] **No critical alarms** triggered
- [ ] **User signups** working
- [ ] **Payments** processing (if applicable)

### Communication

**Internal:**
```
✅ Production launch successful!
Launch time: [Time] UTC
Status: All systems operational
Monitoring: Ongoing for next 24 hours
On-call: [Engineer name]

Metrics (first 2 hours):
- Requests: [X]
- Error rate: [X%]
- P95 latency: [Xms]
- Users: [X]
```

**External (if applicable):**
```
🎉 We're live!
Thank you for your patience. All systems are now operational.
If you experience any issues, please contact support@yourcompany.com
```

---

## Post-Launch Monitoring (Week 1)

### Daily Checks

**Days 1-3:** Check every 4 hours
**Days 4-7:** Check every 8 hours

**Checklist:**
```bash
# 1. Check alarms
aws cloudwatch describe-alarms --state-value ALARM --region us-east-2

# 2. Review error trends
open https://sentry.io/organizations/o4510247421018112/issues/

# 3. Check performance
open https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=saaspe-production-overview

# 4. Review costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --region us-east-2

# 5. Database health
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=saaspe-production-postgres \
  --statistics Average,Maximum \
  --start-time $(date -u -d '24 hours ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 3600 \
  --region us-east-2
```

### Week 1 Retrospective

**Schedule:** Day 7 after launch
**Attendees:** Engineering team, DevOps, Product

**Agenda:**
1. Launch timeline review
2. Incidents encountered (if any)
3. Metrics review
   - Traffic patterns
   - Error rates
   - Performance
   - Costs
4. Alarm threshold adjustments needed
5. Process improvements
6. Action items for Week 2

---

## Rollback Plan

### Conditions for Rollback

- P0 incident lasting >30 minutes
- Error rate >10%
- Data corruption detected
- Security breach
- Critical feature completely broken

### Rollback Procedure

**1. Declare rollback decision (5 min)**
- Engineering Lead approval required
- Announce in `#production-incidents`

**2. Execute rollback (10 min)**
```bash
# Stop new deployments
# Re-deploy previous known-good version

# Via ECS
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --task-definition saaspe-production-backend:2 \
  --force-new-deployment \
  --region us-east-2

# Wait for stability
aws ecs wait services-stable \
  --cluster saaspe-production-cluster \
  --services saaspe-production-service \
  --region us-east-2
```

**3. Database rollback (if needed)**
⚠️ Only if migrations were run
```bash
# Create current backup first
./scripts/mcp db backup emergency-$(date +%Y%m%d-%H%M%S)

# Restore from pre-launch backup
./scripts/mcp db restore --snapshot pre-launch-YYYYMMDD-HHMMSS --new-instance saaspe-rollback

# Update connection string in Secrets Manager
# Restart application
```

**4. Verify rollback (5 min)**
```bash
# Check health
curl https://api.saasope.com/api/v1/health

# Run smoke tests
cd saaspe-web && npx playwright test --grep @smoke

# Monitor errors
./scripts/mcp aws ecs logs --service saaspe-production-service --follow
```

**5. Communicate (5 min)**
```
Status: Rolled back to previous version
Reason: [Brief explanation]
Current status: [Monitoring/Stable]
Next steps: [Root cause analysis/Fix in progress]
ETA for re-deployment: [Time estimate]
```

---

## Action Items Summary

### Must Complete Before Launch

1. **Add SENTRY_AUTH_TOKEN to GitHub secrets**
   ```bash
   gh secret set SENTRY_AUTH_TOKEN
   ```

2. **Subscribe emails to SNS alerts**
   ```bash
   aws sns subscribe \
     --topic-arn arn:aws:sns:us-east-2:392853978631:saaspe-production-alerts \
     --protocol email \
     --notification-endpoint your-email@example.com
   ```

3. **Configure Sentry alert rules**
   - Visit: https://sentry.io/organizations/o4510247421018112/alerts/rules/
   - Create rules for: High error rate, Fatal errors, Performance

4. **Connect Vercel project**
   ```bash
   cd saaspe-web && vercel link
   ```

5. **Set Vercel environment variables**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   vercel env add SENTRY_AUTH_TOKEN production
   ```

6. **Configure AWS Budgets**
   ```bash
   # See PRODUCTION_HARDENING_GUIDE.md for commands
   ```

7. **Enable branch protection on main**
   - Settings → Branches → Add rule

8. **Run load tests**
   - Document baseline metrics

9. **Complete DR drill**
   - Test backup restore

10. **Final security review**
    - IAM permissions
    - Security headers
    - SSL certificates

---

## Sign-Off

**DevOps Lead:**
- Name: ___________________
- Date: ___________________
- Signature: ___________________

**Engineering Lead:**
- Name: ___________________
- Date: ___________________
- Signature: ___________________

**Product Owner:**
- Name: ___________________
- Date: ___________________
- Signature: ___________________

---

**Version:** 1.0.0
**Last Updated:** 2025-11-01
**Status:** Ready for Go-Live
