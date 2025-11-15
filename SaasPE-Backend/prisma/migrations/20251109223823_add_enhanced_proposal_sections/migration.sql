-- AlterTable: Change scopeOfWork from String to Json
-- Add new enhanced proposal sections

-- First, convert existing scopeOfWork strings to JSON arrays (if any exist)
-- For safety, we'll keep existing data wrapped in a backward-compatible structure
UPDATE "Proposal"
SET "scopeOfWork" = CASE
  WHEN "scopeOfWork" IS NOT NULL AND "scopeOfWork" != ''
  THEN jsonb_build_array(jsonb_build_object(
    'title', 'Legacy Scope',
    'objective', 'Migrated from previous format',
    'keyActivities', jsonb_build_array("scopeOfWork"),
    'outcome', 'See activities above'
  ))
  ELSE NULL
END
WHERE "scopeOfWork" IS NOT NULL;

-- Add new columns to Proposal table
ALTER TABLE "Proposal" ADD COLUMN "keyPriorities" JSONB;
ALTER TABLE "Proposal" ADD COLUMN "nextSteps" JSONB;
ALTER TABLE "Proposal" ADD COLUMN "proposedProjectPhases" JSONB;

-- Update column comment for scopeOfWork
COMMENT ON COLUMN "Proposal"."scopeOfWork" IS 'Array of work items: [{ title, objective, keyActivities[], outcome }]';
COMMENT ON COLUMN "Proposal"."keyPriorities" IS 'Array of 3-6 priority bullets';
COMMENT ON COLUMN "Proposal"."nextSteps" IS 'Array of 3-5 action items';
COMMENT ON COLUMN "Proposal"."proposedProjectPhases" IS 'Array of 2-3 detailed project phases with estimatedHours';
