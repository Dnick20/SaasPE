import { Test } from '@nestjs/testing';
import { ProposalsService } from '../../proposals/proposals.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import { PdfService } from '../../../shared/services/pdf.service';
import { PdfRendererService } from '../../proposals/services/pdf-renderer.service';
import { ProposalComposerService } from '../../proposals/services/proposal-composer.service';
import { PricingTemplateService } from '../../proposals/services/pricing-template.service';
import { ESignatureProviderFactory } from '../../../shared/services/e-signature-provider.factory';
import { TokensService } from '../../tokens/tokens.service';
import { ESignatureConnectionsService } from '../../e-signature-connections/e-signature-connections.service';
import { GoogleOAuthService } from '../../../shared/services/google/google-oauth.service';
import { GDocsExporterService } from '../../../shared/services/google/gdocs-exporter.service';
import { BullModule } from '@nestjs/bull';
import { ProposalContextBuilderService } from '../../proposals/services/proposal-context-builder.service';

describe('ProposalsService.generateAIDraft overview mapping', () => {
  it('maps overview to coverPageData.summary', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BullModule.registerQueue({ name: 'proposal' })],
      providers: [
        ProposalsService,
        ProposalContextBuilderService,
        { provide: PrismaService, useValue: {
          client: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', companyName: 'ACME' }) },
          transcription: { findFirst: jest.fn().mockResolvedValue({ id: 't1', transcript: 'hello' }) },
          proposal: { create: jest.fn().mockResolvedValue({ id: 'p1', clientId: 'c1', title: 'x', status: 'draft', coverPageData: { summary: 'sum' }, created: new Date(), updated: new Date(), client: { id: 'c1', companyName: 'ACME' } }) },
          companyProfile: { findFirst: jest.fn().mockResolvedValue({ preferredTone: 'professional', targetICP: { industry: 'SaaS' } }) },
        } },
        { provide: OpenAIService, useValue: { generateProposalContentWithLearning: jest.fn().mockResolvedValue({ overview: 'sum', executiveSummary: 'ex', problemStatement: 'pr', proposedSolution: 'so', scope: 'sc', timeline: 'ti', pricing: {} }) } },
        { provide: PdfService, useValue: {} },
        { provide: PdfRendererService, useValue: {} },
        { provide: ProposalComposerService, useValue: {} },
        { provide: PricingTemplateService, useValue: {} },
        { provide: ESignatureProviderFactory, useValue: {} },
        { provide: TokensService, useValue: { consumeTokens: jest.fn() } },
        { provide: ESignatureConnectionsService, useValue: {} },
        { provide: GoogleOAuthService, useValue: {} },
        { provide: GDocsExporterService, useValue: {} },
      ],
    }).compile();

    const service = moduleRef.get(ProposalsService);
    const result = await service.generateAIDraft('t1', 'u1', { clientId: 'c1', transcriptionId: 't1', title: 'Demo' } as any);
    expect(result).toBeDefined();
    expect((result as any).coverPageData?.summary).toBeDefined();
  });
});


