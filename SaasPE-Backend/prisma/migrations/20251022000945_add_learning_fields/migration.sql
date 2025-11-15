-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "isExample" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wonBusiness" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transcription" ADD COLUMN     "isExample" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salesTips" JSONB,
ADD COLUMN     "wonBusiness" BOOLEAN NOT NULL DEFAULT false;
