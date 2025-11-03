-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "billingEmail" TEXT,
    "usageCredits" INTEGER NOT NULL DEFAULT 0,
    "usedThisMonth" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "googleId" TEXT,
    "microsoftId" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLogin" TIMESTAMP(3),
    "preferences" JSONB NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "contactFirstName" TEXT,
    "contactLastName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactLinkedIn" TEXT,
    "problemStatement" TEXT,
    "currentTools" TEXT[],
    "budget" TEXT,
    "timeline" TEXT,
    "hubspotDealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "jobId" TEXT,
    "transcript" TEXT,
    "confidence" DOUBLE PRECISION,
    "language" TEXT,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "extractedData" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "transcriptionCost" DOUBLE PRECISION,
    "analysisCost" DOUBLE PRECISION,
    "error" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" TIMESTAMP(3),

    CONSTRAINT "Transcription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transcriptionId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "executiveSummary" TEXT,
    "problemStatement" TEXT,
    "proposedSolution" TEXT,
    "scope" TEXT,
    "timeline" TEXT,
    "pricing" JSONB,
    "templateId" TEXT,
    "variables" JSONB,
    "pdfS3Key" TEXT,
    "pdfUrl" TEXT,
    "docusignEnvelopeId" TEXT,
    "pandadocDocumentId" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedByName" TEXT,
    "signedByEmail" TEXT,
    "aiModel" TEXT,
    "aiPromptTokens" INTEGER,
    "aiCompletionTokens" INTEGER,
    "aiCost" DOUBLE PRECISION,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KickoffAgenda" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "agendaItems" JSONB NOT NULL,
    "objectives" TEXT[],
    "attendees" JSONB,
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KickoffAgenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "notionPageId" TEXT,
    "notionUrl" TEXT,
    "phases" JSONB NOT NULL,
    "milestones" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "resources" TEXT[],
    "pdfS3Key" TEXT,
    "pdfUrl" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerPersona" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "demographics" JSONB NOT NULL,
    "goals" TEXT[],
    "painPoints" TEXT[],
    "motivations" TEXT[],
    "objections" TEXT[],
    "informationSources" TEXT[],
    "decisionCriteria" TEXT[],
    "linkedinProfile" TEXT,
    "currentCompany" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mailbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "oauthRefreshToken" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUsername" TEXT,
    "smtpPassword" TEXT,
    "awsSesIdentity" TEXT,
    "dedicatedIp" TEXT,
    "warmupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "warmupStartDate" TIMESTAMP(3),
    "warmupDaysRemaining" INTEGER NOT NULL DEFAULT 14,
    "dailySendLimit" INTEGER NOT NULL DEFAULT 10,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "bounceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complaintRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "mailboxId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sequence" JSONB NOT NULL,
    "schedule" JSONB NOT NULL,
    "contacts" JSONB NOT NULL,
    "totalContacts" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribedCount" INTEGER NOT NULL DEFAULT 0,
    "includeDnc" BOOLEAN NOT NULL DEFAULT true,
    "includeUnsubscribe" BOOLEAN NOT NULL DEFAULT true,
    "started" TIMESTAMP(3),
    "completed" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEmail" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "sequenceStep" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sesMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "replyBody" TEXT,
    "replyClassification" TEXT,
    "error" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoNotContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoNotContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "lineItems" JSONB NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_plan_idx" ON "Tenant"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_microsoftId_key" ON "User"("microsoftId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_hubspotDealId_key" ON "Client"("hubspotDealId");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Transcription_tenantId_idx" ON "Transcription"("tenantId");

-- CreateIndex
CREATE INDEX "Transcription_userId_idx" ON "Transcription"("userId");

-- CreateIndex
CREATE INDEX "Transcription_status_idx" ON "Transcription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_docusignEnvelopeId_key" ON "Proposal"("docusignEnvelopeId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_pandadocDocumentId_key" ON "Proposal"("pandadocDocumentId");

-- CreateIndex
CREATE INDEX "Proposal_tenantId_idx" ON "Proposal"("tenantId");

-- CreateIndex
CREATE INDEX "Proposal_clientId_idx" ON "Proposal"("clientId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KickoffAgenda_proposalId_key" ON "KickoffAgenda"("proposalId");

-- CreateIndex
CREATE INDEX "KickoffAgenda_tenantId_idx" ON "KickoffAgenda"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPlan_proposalId_key" ON "ProjectPlan"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPlan_notionPageId_key" ON "ProjectPlan"("notionPageId");

-- CreateIndex
CREATE INDEX "ProjectPlan_tenantId_idx" ON "ProjectPlan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Playbook_proposalId_key" ON "Playbook"("proposalId");

-- CreateIndex
CREATE INDEX "Playbook_tenantId_idx" ON "Playbook"("tenantId");

-- CreateIndex
CREATE INDEX "BuyerPersona_tenantId_idx" ON "BuyerPersona"("tenantId");

-- CreateIndex
CREATE INDEX "Mailbox_tenantId_idx" ON "Mailbox"("tenantId");

-- CreateIndex
CREATE INDEX "Mailbox_status_idx" ON "Mailbox"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Mailbox_tenantId_email_key" ON "Mailbox"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEmail_sesMessageId_key" ON "CampaignEmail"("sesMessageId");

-- CreateIndex
CREATE INDEX "CampaignEmail_campaignId_idx" ON "CampaignEmail"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignEmail_status_idx" ON "CampaignEmail"("status");

-- CreateIndex
CREATE INDEX "CampaignEmail_recipientEmail_idx" ON "CampaignEmail"("recipientEmail");

-- CreateIndex
CREATE INDEX "DoNotContact_tenantId_idx" ON "DoNotContact"("tenantId");

-- CreateIndex
CREATE INDEX "DoNotContact_email_idx" ON "DoNotContact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DoNotContact_tenantId_email_key" ON "DoNotContact"("tenantId", "email");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "Transcription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickoffAgenda" ADD CONSTRAINT "KickoffAgenda_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlan" ADD CONSTRAINT "ProjectPlan_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mailbox" ADD CONSTRAINT "Mailbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEmail" ADD CONSTRAINT "CampaignEmail_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
