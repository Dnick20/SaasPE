-- Proposal Schema Restructuring Migration
-- Removes: problemStatement, proposedSolution, scope
-- Adds: objectivesAndOutcomes, scopeOfWork, deliverables, approachAndTools, paymentTerms, cancellationNotice

-- Step 1: Add new columns
ALTER TABLE "Proposal" ADD COLUMN "objectivesAndOutcomes" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "scopeOfWork" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "deliverables" JSONB;
ALTER TABLE "Proposal" ADD COLUMN "approachAndTools" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "paymentTerms" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "cancellationNotice" TEXT;

-- Step 2: Migrate existing data (preserve content where possible)
-- Copy proposedSolution content to approachAndTools
UPDATE "Proposal"
SET "approachAndTools" = "proposedSolution"
WHERE "proposedSolution" IS NOT NULL;

-- Step 3: Add default templates for payment terms and cancellation notice
UPDATE "Proposal"
SET "paymentTerms" = '## Payment Terms

**Invoice Schedule:**
- Payment is due within 30 days of invoice date
- Invoices will be sent at project milestones

**Accepted Payment Methods:**
- Bank transfer (ACH)
- Credit card
- Check

**Late Payment:**
- A 1.5% monthly fee may be applied to overdue balances'
WHERE "paymentTerms" IS NULL;

UPDATE "Proposal"
SET "cancellationNotice" = '## Cancellation Policy

Either party may terminate this agreement with 30 days written notice.

**Client Cancellation:**
- Client will be invoiced for all work completed to date
- Any prepaid amounts for incomplete work will be refunded

**Agency Cancellation:**
- We will provide 30 days to transition work
- No additional fees will be charged after notice period'
WHERE "cancellationNotice" IS NULL;

-- Step 4: Drop old columns
ALTER TABLE "Proposal" DROP COLUMN IF EXISTS "problemStatement";
ALTER TABLE "Proposal" DROP COLUMN IF EXISTS "proposedSolution";
ALTER TABLE "Proposal" DROP COLUMN IF EXISTS "scope";
