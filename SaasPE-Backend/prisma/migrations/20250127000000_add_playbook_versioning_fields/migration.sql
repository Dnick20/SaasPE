-- AlterTable
ALTER TABLE "Playbook" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Playbook" ADD COLUMN IF NOT EXISTS "isTemplate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Playbook" ADD COLUMN IF NOT EXISTS "createdBy" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Playbook_isTemplate_idx" ON "Playbook"("isTemplate");

