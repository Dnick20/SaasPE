import { Module } from '@nestjs/common';
import { TenantBrandingController } from './tenant-branding.controller';
import { TenantBrandingService } from './tenant-branding.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { DocuSignService } from '../../shared/services/docusign.service';
import { AdobeSignService } from '../../shared/services/adobe-sign.service';
import { SignNowService } from '../../shared/services/signnow.service';
import { GoogleWorkspaceSignatureService } from '../../shared/services/google-workspace-signature.service';
import { ESignatureProviderFactory } from '../../shared/services/e-signature-provider.factory';

@Module({
  controllers: [TenantBrandingController],
  providers: [
    TenantBrandingService,
    PrismaService,
    DocuSignService,
    AdobeSignService,
    SignNowService,
    GoogleWorkspaceSignatureService,
    ESignatureProviderFactory,
  ],
  exports: [TenantBrandingService],
})
export class TenantBrandingModule {}
