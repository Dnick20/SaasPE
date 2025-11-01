# Incident Response Runbook

**Last Updated:** 2025-11-01
**Version:** 1.0.0
**On-Call:** See internal wiki for rotation

## Quick Reference

### Emergency Contacts

- **DevOps Lead:** [Your contact]
- **Engineering Lead:** [Your contact]
- **On-Call Rotation:** [PagerDuty/Schedule link]
- **Slack Channel:** `#production-incidents`

### Critical Links

- **CloudWatch Dashboard:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=saaspe-production-overview
- **Sentry:** https://sentry.io/organizations/o4510247421018112/issues/
- **ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/saaspe-production-cluster/services
- **RDS Console:** https://console.aws.amazon.com/rds/home?region=us-east-2#database:id=saaspe-production-postgres
- **GitHub Actions:** https://github.com/Dnick20/SaasPE/actions

---

## Incident Severity Levels

### P0 - Critical (Immediate Response)
- **Definition:** Complete service outage, data loss, security breach
- **Response Time:** Immediate (< 5 minutes)
- **Examples:** All tasks down, database unavailable, data breach

### P1 - High (30 minutes)
- **Definition:** Major functionality impaired, affecting multiple users
- **Response Time:** < 30 minutes
- **Examples:** High error rate (>10% requests), slow response (>5s)

### P2 - Medium (2 hours)
- **Definition:** Partial functionality impaired, workaround available
- **Response Time:** < 2 hours
- **Examples:** Single feature broken, elevated error rate (>5%)

### P3 - Low (24 hours)
- **Definition:** Minor issue, no immediate user impact
- **Response Time:** < 24 hours
- **Examples:** Cosmetic bugs, non-critical warnings

---

## Common Incidents & Responses

### 1. All ECS Tasks Down (P0)

**Symptoms:**
- CloudWatch alarm: `saaspe-production-alb-unhealthy-targets`
- 503 errors from ALB
- No running tasks in ECS

**Diagnosis:**
```bash
# Check ECS service status
./scripts/mcp aws ecs describe --service saaspe-production-service

# Check recent deployments
gh run list --workflow=backend-deploy.yml --limit 5

# Check task logs
./scripts/mcp aws ecs logs --service saaspe-production-service --tail 100
```

**Common Causes:**
1. Failed deployment (bad Docker image)
2. Resource exhaustion (out of memory)
3. Configuration error (bad env vars)
4. AWS service issue

**Resolution:**

**If bad deployment:**
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --task-definition saaspe-production-backend:2 \
  --force-new-deployment \
  --region us-east-2

# Monitor rollback
aws ecs wait services-stable \
  --cluster saaspe-production-cluster \
  --services saaspe-production-service \
  --region us-east-2
```

**If resource issue:**
```bash
# Scale up task resources (temporary fix)
# Edit task definition, increase CPU/Memory
# Re-deploy with updated definition
```

**Post-Incident:**
- Document root cause
- Update deployment process
- Add pre-deployment checks

---

### 2. High Error Rate (P1)

**Symptoms:**
- CloudWatch alarm: `saaspe-production-application-errors-high`
- Sentry: Error spike notification
- >100 errors in 5 minutes

**Diagnosis:**
```bash
# Check Sentry for recent errors
open https://sentry.io/organizations/o4510247421018112/issues/?query=is:unresolved

# Check error distribution
./scripts/mcp aws ecs logs --service saaspe-production-service --tail 200 | grep ERROR

# Check specific error pattern
aws logs filter-log-events \
  --log-group-name /ecs/saaspe-production \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '5 minutes ago' +%s)000 \
  --region us-east-2
```

**Common Causes:**
1. Database connection pool exhausted
2. External API failure (timeout, rate limit)
3. Bad deployment (code bug)
4. DDoS or traffic spike

**Resolution:**

**If database issue:**
```bash
# Check RDS connections
aws rds describe-db-instances \
  --db-instance-identifier saaspe-production-postgres \
  --query 'DBInstances[0].{Connections:DBInstanceStatus,MaxConnections:MaxAllocatedStorage}' \
  --region us-east-2

# Restart application (releases connections)
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --force-new-deployment \
  --region us-east-2
```

**If external API:**
```bash
# Check API status
curl -I https://external-api.com/health

# Enable circuit breaker (if configured)
# Or temporarily disable feature flag
```

**If bad deployment:**
```bash
# Rollback immediately
gh run list --workflow=backend-deploy.yml
# Note last successful run
# Re-run that workflow
```

---

### 3. Database Unavailable (P0)

**Symptoms:**
- All requests failing with DB errors
- CloudWatch alarm: `saaspe-production-rds-cpu-high` or connection errors
- Sentry: Database connection errors

**Diagnosis:**
```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier saaspe-production-postgres \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Available:AvailabilityZone}' \
  --region us-east-2

# Check RDS events
aws rds describe-events \
  --source-identifier saaspe-production-postgres \
  --source-type db-instance \
  --duration 60 \
  --region us-east-2
```

**Common Causes:**
1. RDS instance rebooting (maintenance window)
2. Storage full
3. Too many connections
4. AWS outage

**Resolution:**

**If storage full:**
```bash
# Check storage
aws rds describe-db-instances \
  --db-instance-identifier saaspe-production-postgres \
  --query 'DBInstances[0].{AllocatedStorage:AllocatedStorage,FreeableMemory:FreeableMemory}' \
  --region us-east-2

# Increase storage (if needed)
aws rds modify-db-instance \
  --db-instance-identifier saaspe-production-postgres \
  --allocated-storage 100 \
  --apply-immediately \
  --region us-east-2
```

**If connection pool exhausted:**
```bash
# Restart application to release connections
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --force-new-deployment \
  --region us-east-2

# Monitor connections
watch -n 5 'aws rds describe-db-instances --db-instance-identifier saaspe-production-postgres --query "DBInstances[0].DBInstanceStatus" --region us-east-2'
```

**If AWS outage:**
```bash
# Check AWS Health Dashboard
open https://health.aws.amazon.com/health/status

# If multi-AZ enabled, failover automatically
# Otherwise, wait for AWS resolution
# Communicate status to users
```

---

### 4. Slow Performance (P2)

**Symptoms:**
- CloudWatch alarm: `saaspe-production-alb-high-response-time`
- Users reporting slow page loads
- P95 latency >2 seconds

**Diagnosis:**
```bash
# Check ALB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/saaspe-production-alb/4361f80389f5693e \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 300 \
  --region us-east-2

# Check for slow queries (Sentry Performance)
open https://sentry.io/organizations/o4510247421018112/performance/

# Check database slow queries
aws rds describe-db-log-files \
  --db-instance-identifier saaspe-production-postgres \
  --region us-east-2
```

**Common Causes:**
1. Unoptimized database query
2. External API slow
3. Resource constraints (CPU/Memory)
4. Cache miss (Redis issue)

**Resolution:**

**If database slow:**
```bash
# Check RDS CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=saaspe-production-postgres \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' --iso-8601=seconds) \
  --end-time $(date -u --iso-8601=seconds) \
  --period 300 \
  --region us-east-2

# Identify slow queries in Sentry or logs
# Optimize query or add index
# Deploy fix
```

**If resource constraints:**
```bash
# Scale up ECS tasks temporarily
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --desired-count 2 \
  --region us-east-2
```

---

### 5. Deployment Failed (P1)

**Symptoms:**
- GitHub Actions workflow failed
- ECS service unstable
- Tasks starting and stopping repeatedly

**Diagnosis:**
```bash
# Check failed workflow
gh run list --workflow=backend-deploy.yml --limit 1

# View failure logs
gh run view --log-failed

# Check ECS events
aws ecs describe-services \
  --cluster saaspe-production-cluster \
  --services saaspe-production-service \
  --query 'services[0].events[:10]' \
  --region us-east-2
```

**Common Causes:**
1. Docker build failure
2. Health check failing
3. Configuration error
4. Resource limits exceeded

**Resolution:**

**Immediate:**
```bash
# Stop the failing deployment
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --deployment-configuration minimumHealthyPercent=100,maximumPercent=100 \
  --region us-east-2

# Rollback to previous task definition
aws ecs update-service \
  --cluster saaspe-production-cluster \
  --service saaspe-production-service \
  --task-definition saaspe-production-backend:2 \
  --force-new-deployment \
  --region us-east-2
```

**Root cause:**
- Fix issue in code
- Test locally
- Create PR with fix
- Re-deploy

---

## Rollback Procedures

### Backend Rollback

**Option 1: Via ECS (fastest)**
```bash
# List recent task definitions
aws ecs list-task-definitions \
  --family-prefix saaspe-production-backend \
  --max-results 5 \
  --sort DESC \
  --region us-east-2

# Rollback to specific version
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

**Option 2: Via GitHub Actions**
```bash
# Find last successful deployment
gh run list --workflow=backend-deploy.yml --status success --limit 1

# Re-run that workflow
gh run rerun <run-id>
```

**Option 3: Via git revert**
```bash
# Revert problematic commit
git revert <commit-sha>
git push origin main

# GitHub Actions will auto-deploy
```

### Database Rollback

**⚠️ CAUTION: Database rollbacks are destructive**

**If migration failed:**
```bash
# Check migration status
./scripts/mcp prisma migrate status production

# Rollback last migration (if safe)
./scripts/mcp prisma migrate rollback production

# Or restore from backup
./scripts/mcp db restore --snapshot <snapshot-id> --new-instance saaspe-rollback-$(date +%Y%m%d)
```

---

## Escalation Path

### Level 1: On-Call Engineer (0-15 min)
- Assess severity
- Implement immediate fix or rollback
- Communicate in `#production-incidents`

### Level 2: DevOps Lead (15-30 min)
- If issue not resolved by on-call
- Complex infrastructure issues
- Requires AWS support escalation

### Level 3: Engineering Lead (30-60 min)
- If requires code changes
- Architecture decisions needed
- Multiple systems impacted

### Level 4: CTO/CEO (>60 min)
- P0 incident >1 hour
- Data breach or security incident
- Customer communication needed

---

## Communication Templates

### Internal (Slack)

**Incident Start:**
```
🔴 INCIDENT: [P0/P1/P2] [Brief Description]
Impact: [What's affected]
Status: Investigating
Owner: @engineer-name
Updates: Every 15 minutes
```

**Update:**
```
🟡 UPDATE: [P0/P1/P2] [Brief Description]
Action Taken: [What was done]
Current Status: [Still investigating / Implementing fix / Rolling back]
ETA: [Estimated resolution time]
Next Update: [Time]
```

**Resolution:**
```
🟢 RESOLVED: [P0/P1/P2] [Brief Description]
Root Cause: [Brief explanation]
Resolution: [What fixed it]
Duration: [Total downtime]
Post-Mortem: [Link to doc]
```

### External (Status Page)

**Investigating:**
```
We are currently investigating reports of [issue description].
We will provide an update in 15 minutes.
Posted: [Time] UTC
```

**Identified:**
```
We have identified the issue as [brief cause].
Our team is working on a fix.
Posted: [Time] UTC
```

**Resolved:**
```
The issue has been resolved. All systems are operating normally.
Thank you for your patience.
Posted: [Time] UTC
```

---

## Post-Incident Process

### Immediate (Within 1 hour)

1. **Verify resolution**
   - All metrics normal
   - No ongoing errors
   - User reports resolved

2. **Update stakeholders**
   - Post resolution message
   - Thank responders
   - Close incident ticket

3. **Create incident log**
   - Time of detection
   - Time of resolution
   - Actions taken
   - People involved

### Within 24 hours

1. **Schedule post-mortem**
   - Include all responders
   - 30-60 minute meeting

2. **Gather data**
   - CloudWatch metrics
   - Sentry errors
   - GitHub Actions logs
   - Customer impact

### Within 1 week

1. **Conduct post-mortem**
   - Timeline of events
   - Root cause analysis
   - What went well
   - What could improve
   - Action items

2. **Document learnings**
   - Update runbook
   - Update monitoring
   - Update alerts

3. **Implement preventions**
   - Add tests
   - Improve monitoring
   - Update procedures

---

## Monitoring Quick Commands

```bash
# Overall health
./scripts/mcp health

# ECS status
./scripts/mcp aws ecs describe --service saaspe-production-service

# Recent logs
./scripts/mcp aws ecs logs --service saaspe-production-service --tail 100

# Active alarms
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --region us-east-2

# Recent Sentry errors
open https://sentry.io/organizations/o4510247421018112/issues/?query=is:unresolved

# CloudWatch dashboard
open https://console.aws.amazon.com/cloudwatch/home?region=us-east-2#dashboards:name=saaspe-production-overview
```

---

## Runbook Maintenance

**Review:** Monthly
**Owner:** DevOps Team
**Last Review:** 2025-11-01
**Next Review:** 2025-12-01

**Update triggers:**
- After each P0/P1 incident
- Infrastructure changes
- New services added
- Team changes

---

**Version:** 1.0.0
**Status:** Active
**Distribution:** All on-call engineers
