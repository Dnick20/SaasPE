-- Apply playbook versioning fields migration
-- This script can be run directly on the database

-- Add version column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'version'
    ) THEN
        ALTER TABLE "Playbook" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Add isTemplate column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'isTemplate'
    ) THEN
        ALTER TABLE "Playbook" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add createdBy column if it doesn't exist
-- Note: For existing rows, we'll set a default empty string
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Playbook' AND column_name = 'createdBy'
    ) THEN
        ALTER TABLE "Playbook" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS "Playbook_isTemplate_idx" ON "Playbook"("isTemplate");

-- Verify columns were added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'Playbook' 
AND column_name IN ('version', 'isTemplate', 'createdBy')
ORDER BY column_name;

