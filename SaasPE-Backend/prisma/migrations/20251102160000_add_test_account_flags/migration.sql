-- Add test account identification fields to Tenant table
ALTER TABLE "Tenant" ADD COLUMN "isTestTenant" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "testTenantExpiry" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "testTenantPurpose" TEXT;

-- Add test account identification fields to User table
ALTER TABLE "User" ADD COLUMN "isTestAccount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "testAccountExpiry" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "testAccountPurpose" TEXT;

-- Add indexes for test account queries
CREATE INDEX "Tenant_isTestTenant_idx" ON "Tenant"("isTestTenant");
CREATE INDEX "User_isTestAccount_idx" ON "User"("isTestAccount");
