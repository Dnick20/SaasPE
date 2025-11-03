import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { ProposalsService } from '../proposals.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { S3Service } from '../../../shared/services/s3.service';
import { PdfService } from '../../../shared/services/pdf.service';
import { PdfRendererService } from '../services/pdf-renderer.service';
import { DocuSignService } from '../../../shared/services/docusign.service';
import { ProposalComposerService } from '../services/proposal-composer.service';
import { PricingTemplateService } from '../services/pricing-template.service';
import { ESignatureProviderFactory } from '../../../shared/services/e-signature-provider.factory';
import { TokensService } from '../../tokens/tokens.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import { ESignatureConnectionsService } from '../../e-signature-connections/e-signature-connections.service';
import { GoogleOAuthService } from '../../../shared/services/google/google-oauth.service';
import { GDocsExporterService } from '../../../shared/services/google/gdocs-exporter.service';

describe('ProposalsService', () => {
  let service: ProposalsService;
  let prisma: PrismaService;
  let s3Service: S3Service;
  let pdfService: PdfService;
  let docusignService: DocuSignService;

  const mockPrismaService = {
    proposal: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
    },
    transcription: {
      findFirst: jest.fn(),
    },
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    getPresignedDownloadUrl: jest.fn(),
  };

  const mockPdfService = {
    generateProposalPdf: jest.fn(),
  };

  const mockPdfRendererService = {
    render: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    generateProposalPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  } as any;

  const mockDocuSignService = {
    createAndSendEnvelope: jest.fn(),
    getProviderName: jest.fn().mockReturnValue('DocuSign'),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockProposalComposerService = {
    composeFromClient: jest.fn(),
  } as any;

  const mockPricingTemplateService = {
    getDefaultTemplates: jest.fn().mockReturnValue([]),
  } as any;

  const mockESignatureFactory = {
    getProviderName: jest.fn().mockReturnValue('DocuSign'),
    createProvider: jest.fn().mockReturnValue(mockDocuSignService),
    getProvider: jest.fn().mockReturnValue(mockDocuSignService),
  } as any;

  const mockTokensService = {
    trackConsumption: jest.fn(),
    consumeTokens: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockOpenAIService = {
    client: { chat: { completions: { create: jest.fn() } } },
  } as any;

  const mockESignatureConnectionsService = {
    getActiveProviderForTenant: jest.fn().mockResolvedValue('docusign'),
    isConnected: jest.fn().mockResolvedValue(true),
  } as any;

  const mockGoogleOAuthService = {
    isConnected: jest.fn().mockResolvedValue(true),
  } as any;

  const mockGDocsExporterService = {
    exportProposal: jest.fn().mockResolvedValue({ docId: 'doc', docUrl: 'https://docs' }),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
        {
          provide: PdfRendererService,
          useValue: mockPdfRendererService,
        },
        {
          provide: DocuSignService,
          useValue: mockDocuSignService,
        },
        {
          provide: ProposalComposerService,
          useValue: mockProposalComposerService,
        },
        {
          provide: PricingTemplateService,
          useValue: mockPricingTemplateService,
        },
        {
          provide: ESignatureProviderFactory,
          useValue: mockESignatureFactory,
        },
        {
          provide: TokensService,
          useValue: mockTokensService,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
        {
          provide: ESignatureConnectionsService,
          useValue: mockESignatureConnectionsService,
        },
        {
          provide: GoogleOAuthService,
          useValue: mockGoogleOAuthService,
        },
        {
          provide: GDocsExporterService,
          useValue: mockGDocsExporterService,
        },
        {
          provide: getQueueToken('proposal'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<ProposalsService>(ProposalsService);
    prisma = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
    pdfService = module.get<PdfService>(PdfService);
    docusignService = module.get<DocuSignService>(DocuSignService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const dto = {
      clientId: 'client-123',
      title: 'Test Proposal',
    };

    it('should create a proposal successfully', async () => {
      const mockClient = {
        id: 'client-123',
        companyName: 'Acme Corp',
      };

      const mockProposal = {
        id: 'proposal-123',
        tenantId,
        userId,
        clientId: dto.clientId,
        title: dto.title,
        status: 'draft',
        created: new Date(),
        updated: new Date(),
        client: mockClient,
      };

      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      mockPrismaService.proposal.create.mockResolvedValue(mockProposal);

      const result = await service.create(tenantId, userId, dto);

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: dto.clientId, tenantId },
      });
      expect(prisma.proposal.create).toHaveBeenCalled();
      expect(result.id).toBe(mockProposal.id);
      expect(result.status).toBe('draft');
    });

    it('should throw NotFoundException if client does not exist', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(null);

      await expect(service.create(tenantId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create proposal with transcription link', async () => {
      const dtoWithTranscription = {
        ...dto,
        transcriptionId: 'transcription-123',
      };

      const mockClient = { id: 'client-123', companyName: 'Acme Corp' };
      const mockTranscription = { id: 'transcription-123' };
      const mockProposal = {
        id: 'proposal-123',
        tenantId,
        userId,
        clientId: dto.clientId,
        transcriptionId: 'transcription-123',
        title: dto.title,
        status: 'draft',
        created: new Date(),
        updated: new Date(),
        client: mockClient,
      };

      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      mockPrismaService.transcription.findFirst.mockResolvedValue(
        mockTranscription,
      );
      mockPrismaService.proposal.create.mockResolvedValue(mockProposal);

      const result = await service.create(
        tenantId,
        userId,
        dtoWithTranscription,
      );

      expect(prisma.transcription.findFirst).toHaveBeenCalled();
      expect(result.id).toBe(mockProposal.id);
    });
  });

  describe('findAll', () => {
    const tenantId = 'tenant-123';

    it('should return paginated proposals', async () => {
      const mockProposals = [
        {
          id: 'proposal-1',
          tenantId,
          title: 'Proposal 1',
          status: 'draft',
          created: new Date(),
          updated: new Date(),
          client: { id: 'client-1', companyName: 'Company 1' },
        },
        {
          id: 'proposal-2',
          tenantId,
          title: 'Proposal 2',
          status: 'sent',
          created: new Date(),
          updated: new Date(),
          client: { id: 'client-2', companyName: 'Company 2' },
        },
      ];

      mockPrismaService.proposal.count.mockResolvedValue(2);
      mockPrismaService.proposal.findMany.mockResolvedValue(mockProposals);

      const result = await service.findAll(tenantId, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrismaService.proposal.count.mockResolvedValue(1);
      mockPrismaService.proposal.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, 1, 20, 'sent');

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'sent' }),
        }),
      );
    });

    it('should filter by clientId', async () => {
      mockPrismaService.proposal.count.mockResolvedValue(1);
      mockPrismaService.proposal.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, 1, 20, undefined, 'client-123');

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 'client-123' }),
        }),
      );
    });

    it('should sort by created date descending', async () => {
      mockPrismaService.proposal.count.mockResolvedValue(0);
      mockPrismaService.proposal.findMany.mockResolvedValue([]);

      await service.findAll(
        tenantId,
        1,
        20,
        undefined,
        undefined,
        'created',
        'desc',
      );

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    const tenantId = 'tenant-123';
    const proposalId = 'proposal-123';

    it('should return a single proposal', async () => {
      const mockProposal = {
        id: proposalId,
        tenantId,
        title: 'Test Proposal',
        status: 'draft',
        created: new Date(),
        updated: new Date(),
        client: { id: 'client-1', companyName: 'Test Company' },
      };

      mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);

      const result = await service.findOne(tenantId, proposalId);

      expect(result.id).toBe(proposalId);
      expect(result.title).toBe('Test Proposal');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.proposal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, proposalId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const tenantId = 'tenant-123';
    const proposalId = 'proposal-123';
    const dto = {
      title: 'Updated Title',
      executiveSummary: 'Updated summary',
    };

    it('should update proposal successfully', async () => {
      const existingProposal = { id: proposalId, tenantId, title: 'Old Title' };
      const updatedProposal = {
        ...existingProposal,
        ...dto,
        created: new Date(),
        updated: new Date(),
        client: { id: 'client-1', companyName: 'Test Company' },
      };

      mockPrismaService.proposal.findFirst.mockResolvedValue(existingProposal);
      mockPrismaService.proposal.update.mockResolvedValue(updatedProposal);

      const result = await service.update(tenantId, proposalId, dto);

      expect(result.title).toBe(dto.title);
      expect(prisma.proposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: proposalId },
          data: expect.objectContaining(dto),
        }),
      );
    });

    it('should throw NotFoundException if proposal does not exist', async () => {
      mockPrismaService.proposal.findFirst.mockResolvedValue(null);

      await expect(service.update(tenantId, proposalId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateContent', () => {
    const tenantId = 'tenant-123';
    const proposalId = 'proposal-123';
    const dto = {
      sections: ['executiveSummary', 'problemStatement'],
    };

    it('should queue AI generation job', async () => {
      const mockProposal = {
        id: proposalId,
        tenantId,
        status: 'draft',
        client: { id: 'client-1', companyName: 'Test Company' },
        transcription: null,
      };

      mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
      mockPrismaService.proposal.update.mockResolvedValue({
        ...mockProposal,
        status: 'generating',
      });
      mockQueue.add.mockResolvedValue({ id: 123 });

      const result = await service.generateContent(tenantId, proposalId, dto);

      expect(result.status).toBe('generating');
      expect(result.jobId).toBe('123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate',
        expect.objectContaining({
          proposalId,
          tenantId,
          sections: dto.sections,
        }),
      );
    });

    it('should throw NotFoundException if proposal not found', async () => {
      mockPrismaService.proposal.findFirst.mockResolvedValue(null);

      await expect(
        service.generateContent(tenantId, proposalId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportPdf', () => {
    const tenantId = 'tenant-123';
    const proposalId = 'proposal-123';

    it('should generate PDF and upload to S3', async () => {
      const mockProposal = {
        id: proposalId,
        tenantId,
        title: 'Test Proposal',
        executiveSummary: 'Summary',
        proposedSolution: 'Solution',
        created: new Date(),
        client: { companyName: 'Test Company' },
        tenant: { name: 'Test Agency' },
      };

      const mockPdfBuffer = Buffer.from('pdf content');
      const mockS3Key = 'tenant-123/proposals/test-proposal.pdf';

      mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
      mockPdfService.generateProposalPdf.mockResolvedValue(mockPdfBuffer);
      mockS3Service.uploadFile.mockResolvedValue(mockS3Key);
      mockS3Service.getPresignedDownloadUrl.mockResolvedValue(
        'https://s3.amazonaws.com/signed-url',
      );
      mockPrismaService.proposal.update.mockResolvedValue({
        ...mockProposal,
        pdfS3Key: mockS3Key,
      });

      const result = await service.exportPdf(tenantId, proposalId);

      expect((service as any).pdfRendererService.generateProposalPdf).toBeDefined();
      expect(mockPdfRendererService.generateProposalPdf).toHaveBeenCalled();
      expect(s3Service.uploadFile).toHaveBeenCalled();
      expect(result.pdfUrl).toContain('https://');
    });

    it('should throw BadRequestException if no content', async () => {
      const mockProposal = {
        id: proposalId,
        tenantId,
        title: 'Test Proposal',
        executiveSummary: null,
        proposedSolution: null,
        client: { companyName: 'Test Company' },
        tenant: { name: 'Test Agency' },
      };

      mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);

      await expect(service.exportPdf(tenantId, proposalId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('send', () => {
    const tenantId = 'tenant-123';
    const proposalId = 'proposal-123';
    const dto = {
      recipientEmail: 'client@example.com',
      recipientName: 'John Doe',
      includeESignature: true,
      message: 'Please review',
    };

    it('should send proposal via DocuSign', async () => {
      const mockProposal = {
        id: proposalId,
        tenantId,
        title: 'Test Proposal',
        executiveSummary: 'Summary',
        proposedSolution: 'Solution',
        pdfS3Key: 'test.pdf',
        created: new Date(),
        client: { companyName: 'Test Company' },
        tenant: { name: 'Test Agency' },
      };

      const mockPdfBuffer = Buffer.from('pdf content');
      const mockEnvelopeId = 'envelope-123';

      mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
      mockS3Service.downloadFile.mockResolvedValue(mockPdfBuffer);
      mockDocuSignService.createAndSendEnvelope.mockResolvedValue(
        mockEnvelopeId,
      );
      mockPrismaService.proposal.update.mockResolvedValue({
        ...mockProposal,
        status: 'sent',
        docusignEnvelopeId: mockEnvelopeId,
        sentAt: new Date(),
      });

      const result = await service.send(tenantId, proposalId, dto);

      expect(result.status).toBe('sent');
      expect(result.docusignEnvelopeId).toBe(mockEnvelopeId);
      expect(result.emailSent).toBe(true);
      expect(docusignService.createAndSendEnvelope).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no content', async () => {
      const mockProposal = {
        id: proposalId,
        tenantId,
        title: 'Test Proposal',
        executiveSummary: null,
        proposedSolution: null,
        client: { companyName: 'Test Company' },
        tenant: { name: 'Test Agency' },
      };

      mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);

      await expect(service.send(tenantId, proposalId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // Pricing V2 Tests
  // ============================================================================

  describe('Pricing V2 CRUD Operations', () => {
    const tenantId = 'tenant-123';
    const proposalId = 'proposal-123';
    const optionId = 'option-123';
    const lineItemId = 'line-item-123';
    const noteId = 'note-123';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ========================================================================
    // Pricing Options Tests
    // ========================================================================

    describe('addPricingOptionV2', () => {
      it('should create a new pricing option with line items', async () => {
        const dto = {
          label: 'Option A: Diagnostic Sprint',
          billingCadence: 'fixed_fee',
          summary: 'This fixed-fee engagement provides comprehensive diagnostic assessment of your current operations.',
          lineItems: [
            {
              lineType: 'core',
              description: 'Twenty Hour Diagnostic Sprint • Fixed fee for one month',
              amount: 2000,
              unitType: 'fixed',
              hoursIncluded: 20,
            },
          ],
        };

        const mockProposal = { id: proposalId, tenantId };
        const mockPricingOption = {
          id: optionId,
          proposalId,
          ...dto,
          lineItems: [{ id: lineItemId, ...dto.lineItems[0] }],
        };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingOption = {
          create: jest.fn().mockResolvedValue(mockPricingOption),
        };

        const result = await service.addPricingOptionV2(tenantId, proposalId, dto);

        expect(result.id).toBe(optionId);
        expect(result.message).toBe('Pricing option created successfully');
        expect(result.pricingOption).toEqual(mockPricingOption);
      });

      it('should throw NotFoundException if proposal not found', async () => {
        mockPrismaService.proposal.findFirst.mockResolvedValue(null);

        await expect(
          service.addPricingOptionV2(tenantId, proposalId, {}),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updatePricingOptionV2', () => {
      it('should update a pricing option', async () => {
        const dto = {
          label: 'Updated Option Label',
          summary: 'Updated summary with at least fifty characters for validation purposes.',
        };

        const mockProposal = { id: proposalId, tenantId };
        const mockUpdatedOption = {
          id: optionId,
          proposalId,
          ...dto,
        };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingOption = {
          findFirst: jest.fn().mockResolvedValue({ id: optionId }),
          update: jest.fn().mockResolvedValue(mockUpdatedOption),
        };

        const result = await service.updatePricingOptionV2(
          tenantId,
          proposalId,
          optionId,
          dto,
        );

        expect(result.message).toBe('Pricing option updated successfully');
        expect(result.pricingOption.label).toBe(dto.label);
      });

      it('should throw NotFoundException if proposal not found', async () => {
        mockPrismaService.proposal.findFirst.mockResolvedValue(null);

        await expect(
          service.updatePricingOptionV2(tenantId, proposalId, optionId, {}),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deletePricingOptionV2', () => {
      it('should delete a pricing option', async () => {
        const mockProposal = { id: proposalId, tenantId };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingOption = {
          findFirst: jest.fn().mockResolvedValue({ id: optionId }),
          delete: jest.fn().mockResolvedValue({ id: optionId }),
        };

        const result = await service.deletePricingOptionV2(
          tenantId,
          proposalId,
          optionId,
        );

        expect(result.message).toBe('Pricing option deleted successfully');
      });
    });

    // ========================================================================
    // Line Items Tests
    // ========================================================================

    describe('addLineItem', () => {
      it('should add a line item to a pricing option', async () => {
        const dto = {
          lineType: 'addon',
          description: 'Additional consulting hours at standard rate',
          amount: 150,
          unitType: 'hourly',
        };

        const mockProposal = { id: proposalId, tenantId };
        const mockLineItem = {
          id: lineItemId,
          optionId,
          ...dto,
        };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingOption = {
          findFirst: jest.fn().mockResolvedValue({ id: optionId }),
        };
        (mockPrismaService as any).proposalPricingLineItem = {
          create: jest.fn().mockResolvedValue(mockLineItem),
        };

        const result = await service.addLineItem(
          tenantId,
          proposalId,
          optionId,
          dto,
        );

        expect(result.id).toBe(lineItemId);
        expect(result.message).toBe('Line item created successfully');
      });

      it('should throw NotFoundException if pricing option not found', async () => {
        const mockProposal = { id: proposalId, tenantId };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingOption = {
          findFirst: jest.fn().mockResolvedValue(null),
        };

        await expect(
          service.addLineItem(tenantId, proposalId, optionId, {}),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateLineItem', () => {
      it('should update a line item', async () => {
        const dto = {
          description: 'Updated line item description with sufficient characters',
          amount: 250,
        };

        const mockProposal = { id: proposalId, tenantId };
        const mockUpdatedLineItem = {
          id: lineItemId,
          optionId,
          ...dto,
        };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingLineItem = {
          findFirst: jest.fn().mockResolvedValue({ id: lineItemId }),
          update: jest.fn().mockResolvedValue(mockUpdatedLineItem),
        };

        const result = await service.updateLineItem(
          tenantId,
          proposalId,
          optionId,
          lineItemId,
          dto,
        );

        expect(result.message).toBe('Line item updated successfully');
        expect(result.lineItem.amount).toBe(250);
      });
    });

    describe('deleteLineItem', () => {
      it('should delete a line item', async () => {
        const mockProposal = { id: proposalId, tenantId };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingLineItem = {
          findFirst: jest.fn().mockResolvedValue({ id: lineItemId }),
          delete: jest.fn().mockResolvedValue({ id: lineItemId }),
        };

        const result = await service.deleteLineItem(
          tenantId,
          proposalId,
          optionId,
          lineItemId,
        );

        expect(result.message).toBe('Line item deleted successfully');
      });
    });

    // ========================================================================
    // Pricing Notes Tests
    // ========================================================================

    describe('addPricingNote', () => {
      it('should add a pricing note to a proposal', async () => {
        const dto = {
          noteType: 'payment_method',
          content: 'Payment accepted via ACH, wire transfer, or credit card',
        };

        const mockProposal = { id: proposalId, tenantId };
        const mockNote = {
          id: noteId,
          proposalId,
          ...dto,
        };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingNote = {
          create: jest.fn().mockResolvedValue(mockNote),
        };

        const result = await service.addPricingNote(tenantId, proposalId, dto);

        expect(result.id).toBe(noteId);
        expect(result.message).toBe('Pricing note created successfully');
      });
    });

    describe('updatePricingNote', () => {
      it('should update a pricing note', async () => {
        const dto = {
          content: 'Updated payment terms and conditions with sufficient length',
        };

        const mockProposal = { id: proposalId, tenantId };
        const mockUpdatedNote = {
          id: noteId,
          proposalId,
          ...dto,
        };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingNote = {
          findFirst: jest.fn().mockResolvedValue({ id: noteId }),
          update: jest.fn().mockResolvedValue(mockUpdatedNote),
        };

        const result = await service.updatePricingNote(
          tenantId,
          proposalId,
          noteId,
          dto,
        );

        expect(result.message).toBe('Pricing note updated successfully');
      });
    });

    describe('deletePricingNote', () => {
      it('should delete a pricing note', async () => {
        const mockProposal = { id: proposalId, tenantId };

        mockPrismaService.proposal.findFirst.mockResolvedValue(mockProposal);
        (mockPrismaService as any).proposalPricingNote = {
          findFirst: jest.fn().mockResolvedValue({ id: noteId }),
          delete: jest.fn().mockResolvedValue({ id: noteId }),
        };

        const result = await service.deletePricingNote(
          tenantId,
          proposalId,
          noteId,
        );

        expect(result.message).toBe('Pricing note deleted successfully');
      });
    });

    // ========================================================================
    // Template Seeding Tests
    // ========================================================================

    describe('seedPricingBlueprints', () => {
      it('should return template blueprints', () => {
        (mockPricingTemplateService as any).getSprintTemplate = jest
          .fn()
          .mockReturnValue({ name: 'Sprint', billingCadence: 'fixed_fee', summary: '...' });
        (mockPricingTemplateService as any).getRetainerTemplate = jest
          .fn()
          .mockReturnValue({ name: 'Retainer', billingCadence: 'monthly_retainer', summary: '...' });
        (mockPricingTemplateService as any).getHourlyTemplate = jest
          .fn()
          .mockReturnValue({ name: 'Hourly', billingCadence: 'hourly', summary: '...' });

        const result = service.seedPricingBlueprints(tenantId);

        expect(result.message).toBe('Pricing blueprints seeded successfully');
        expect(result.templates).toHaveLength(3);
        expect(result.count).toBe(3);
        expect(result.templates[0]).toHaveProperty('name');
        expect(result.templates[0]).toHaveProperty('billingCadence');
        expect(result.templates[0]).toHaveProperty('summary');
      });
    });
  });
});
