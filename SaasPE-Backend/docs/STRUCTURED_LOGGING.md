# Structured Logging Guide

This document describes the structured logging format used throughout the SaasPE backend for CloudWatch monitoring and observability.

## Log Event Types

All structured logs follow a consistent format with an `event` field that identifies the log type. This makes it easy to filter and create CloudWatch metrics.

### Proposal Generation Flow

#### 1. `proposal_generation_started`
Logged when a proposal generation job begins processing.

```json
{
  "message": "Proposal generation started",
  "jobId": "123",
  "proposalId": "uuid",
  "tenantId": "uuid",
  "sectionsRequested": 9,
  "sections": "executiveSummary, objectivesAndOutcomes, ...",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "event": "proposal_generation_started"
}
```

**CloudWatch Metric**: Count of generation starts
**Alert**: Spike in generation starts may indicate bot activity

---

#### 2. `learning_examples_retrieved`
Logged after fetching won proposal examples for few-shot learning.

```json
{
  "message": "Retrieved learning examples",
  "proposalId": "uuid",
  "examplesFound": 3,
  "queryDuration": 45,
  "event": "learning_examples_retrieved"
}
```

**CloudWatch Metric**: Average query duration
**Alert**: Query duration > 500ms

---

#### 3. `ai_generation_started`
Logged before calling OpenAI API.

```json
{
  "message": "AI generation starting",
  "proposalId": "uuid",
  "sectionsToGenerate": 9,
  "hasTranscription": true,
  "hasExamples": true,
  "event": "ai_generation_started"
}
```

---

#### 4. `openai_proposal_generated`
Logged after OpenAI API returns (in OpenAIService).

```json
{
  "message": "Proposal content generated with learning",
  "tenantId": "uuid",
  "tokens": {
    "prompt": 1250,
    "completion": 3840,
    "total": 5090
  },
  "model": "gpt-4o",
  "contextPackUsed": true,
  "contextPackSavings": 62,
  "sectionsGenerated": 9,
  "event": "openai_proposal_generated"
}
```

**CloudWatch Metrics**:
- Average `tokens.total` (monitor cost)
- Average `contextPackSavings` (verify optimization working)
- Count by `model` (track which models are used)

**Alert**: `tokens.total > 10000` (unusually large request)

---

#### 5. `ai_generation_completed`
Logged after OpenAI call completes successfully.

```json
{
  "message": "AI generation completed",
  "proposalId": "uuid",
  "aiDuration": 45230,
  "sectionsGenerated": 9,
  "tokens": {
    "prompt": 1250,
    "completion": 3840,
    "total": 5090,
    "source": "api_actual"
  },
  "contextPack": {
    "used": true,
    "savings": 62
  },
  "cost": 0.051225,
  "event": "ai_generation_completed"
}
```

**CloudWatch Metrics**:
- Average `aiDuration` (latency monitoring)
- Sum `cost` (daily/monthly cost tracking)
- Count where `tokens.source = "estimated"` (track estimation fallbacks)

**Alerts**:
- `aiDuration > 120000` (2 minutes - unusually slow)
- Daily `cost` sum > budget threshold

---

#### 6. `proposal_generation_completed`
Logged when the entire job completes successfully.

```json
{
  "message": "Proposal generation completed successfully",
  "jobId": "123",
  "proposalId": "uuid",
  "tenantId": "uuid",
  "metrics": {
    "totalDuration": 47500,
    "aiDuration": 45230,
    "dbDuration": 156,
    "sectionsGenerated": 9,
    "tokens": {
      "prompt": 1250,
      "completion": 3840,
      "total": 5090,
      "source": "api_actual"
    },
    "contextPack": {
      "used": true,
      "savings": 62
    },
    "cost": 0.051225,
    "model": "gpt-4o"
  },
  "timestamp": "2025-01-15T10:31:47.500Z",
  "event": "proposal_generation_completed"
}
```

**CloudWatch Metrics**:
- Average `metrics.totalDuration` (end-to-end latency)
- P50, P90, P99 of `metrics.aiDuration`
- Average `metrics.dbDuration` (database performance)
- Sum `metrics.cost` grouped by day/tenant

**Alerts**:
- `metrics.totalDuration > 180000` (3 minutes - SLA breach)
- `metrics.dbDuration > 1000` (slow database queries)

---

#### 7. `proposal_generation_failed`
Logged when job fails.

```json
{
  "message": "Proposal generation failed",
  "jobId": "123",
  "proposalId": "uuid",
  "tenantId": "uuid",
  "error": {
    "message": "OpenAI API rate limit exceeded",
    "stack": "...",
    "type": "RateLimitError"
  },
  "metrics": {
    "totalDuration": 5230,
    "failedAfter": 5230
  },
  "timestamp": "2025-01-15T10:30:05.230Z",
  "event": "proposal_generation_failed"
}
```

**CloudWatch Metrics**:
- Count of failures
- Count by `error.type` (categorize failures)

**Alerts**:
- Failure rate > 5%
- Specific error types (rate limits, auth errors)

---

### From-Transcription Flow

#### 8. `create_from_transcription_started`
Logged when /from-transcription endpoint is called.

```json
{
  "message": "Create from transcription started",
  "tenantId": "uuid",
  "userId": "uuid",
  "transcriptionId": "uuid",
  "clientId": "uuid",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "event": "create_from_transcription_started"
}
```

---

#### 9. `create_from_transcription_queued`
Logged when job is successfully queued.

```json
{
  "message": "Proposal generation from transcription queued",
  "tenantId": "uuid",
  "userId": "uuid",
  "proposalId": "uuid",
  "transcriptionId": "uuid",
  "clientId": "uuid",
  "jobId": "job-uuid",
  "duration": 234,
  "timestamp": "2025-01-15T10:30:00.234Z",
  "event": "create_from_transcription_queued"
}
```

**CloudWatch Metric**: Average `duration` (API response time)
**Alert**: `duration > 2000` (slow API response)

---

## CloudWatch Setup

### Creating Metrics

Use CloudWatch Logs Insights to create metrics from these structured logs:

```sql
-- Average AI generation duration
fields @timestamp, metrics.aiDuration
| filter event = "proposal_generation_completed"
| stats avg(metrics.aiDuration) as AvgAIDuration by bin(5m)
```

```sql
-- Total cost per day
fields @timestamp, metrics.cost
| filter event = "proposal_generation_completed"
| stats sum(metrics.cost) as TotalCost by bin(1d)
```

```sql
-- Failure rate
fields @timestamp
| filter event in ["proposal_generation_completed", "proposal_generation_failed"]
| stats count() by event
```

```sql
-- ContextPack effectiveness
fields @timestamp, metrics.contextPack.used, metrics.contextPack.savings
| filter event = "proposal_generation_completed" and metrics.contextPack.used = true
| stats avg(metrics.contextPack.savings) as AvgTokenSavings
```

### Recommended Alarms

1. **High Latency**: `metrics.totalDuration > 180000` for 2 consecutive periods
2. **High Error Rate**: Failure count > 5% of total requests in 5 minutes
3. **Cost Spike**: Daily cost > 2x average
4. **Rate Limit**: Error type = "RateLimitError" count > 0

---

## Token Pricing Reference

**GPT-4o (2024 model)**:
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**GPT-4o-mini** (used in ContextPack):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Cost Calculation** (in code):
```typescript
const cost =
  (promptTokens / 1_000_000) * 2.50 +
  (completionTokens / 1_000_000) * 10.00;
```

---

## Querying Best Practices

### Find slow generations
```sql
fields @timestamp, proposalId, metrics.totalDuration
| filter event = "proposal_generation_completed" and metrics.totalDuration > 60000
| sort metrics.totalDuration desc
```

### Monitor cost by tenant
```sql
fields @timestamp, tenantId, metrics.cost
| filter event = "proposal_generation_completed"
| stats sum(metrics.cost) as TotalCost by tenantId
| sort TotalCost desc
```

### Track ContextPack adoption
```sql
fields @timestamp
| filter event = "openai_proposal_generated"
| stats
    count() as Total,
    sum(contextPackUsed) as UsingContextPack,
    avg(contextPackSavings) as AvgSavings
```

### Identify error patterns
```sql
fields @timestamp, error.type, error.message
| filter event = "proposal_generation_failed"
| stats count() by error.type
```

---

## Integration with Monitoring Tools

### Datadog
All logs with `event` field are automatically parsed and can be used in Datadog metrics/monitors.

### Sentry
Errors logged with `proposal_generation_failed` are automatically captured by Sentry with full context.

### Grafana
Import CloudWatch metrics into Grafana dashboards for visualization.

---

## Adding New Events

When adding new structured log events:

1. **Always include**:
   - `event` field (kebab-case)
   - `timestamp` (ISO 8601)
   - Relevant IDs (proposalId, tenantId, userId)

2. **Use consistent naming**:
   - Durations in milliseconds (e.g., `aiDuration`)
   - Costs in USD (e.g., `cost: 0.051225`)
   - Tokens as integers (e.g., `total: 5090`)

3. **Document in this file**:
   - Event name and structure
   - CloudWatch metrics to create
   - Recommended alerts

4. **Test queries** in CloudWatch Logs Insights before deploying
