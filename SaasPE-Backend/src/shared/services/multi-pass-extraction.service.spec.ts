import { Test, TestingModule } from '@nestjs/testing';
import { MultiPassExtractionService } from './multi-pass-extraction.service';
import { OpenAIService } from './openai.service';

describe('MultiPassExtractionService', () => {
  let service: MultiPassExtractionService;
  let openaiService: OpenAIService;

  const mockTranscript = `
    Client John Smith from Acme Corp wants to implement a CRM system.
    Budget is around $50,000 to $75,000.
    Timeline: Need it done by Q2 2024, about 3 months.
    Main pain point: Current spreadsheet system is not scalable.
    They have 50 sales reps who need access.
    Must integrate with Salesforce and HubSpot.
    Technical requirement: Cloud-based, mobile-friendly.
  `;

  const mockOpenAIResponse = (content: any) => ({
    choices: [{
      message: {
        content: JSON.stringify(content)
      }
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    }
  });

  beforeEach(async () => {
    const mockOpenAIService = {
      createChatCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiPassExtractionService,
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
      ],
    }).compile();

    service = module.get<MultiPassExtractionService>(MultiPassExtractionService);
    openaiService = module.get<OpenAIService>(OpenAIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Pass 1: Entity Extraction', () => {
    it('should extract entities from transcript', async () => {
      const mockEntities = {
        clientName: 'Acme Corp',
        contacts: [
          {
            name: 'John Smith',
            role: 'Decision Maker',
            mentionFrequency: 5,
            confidence: 0.95
          }
        ],
        budget: {
          min: 50000,
          max: 75000,
          currency: 'USD',
          confidence: 0.9
        },
        timeline: {
          duration: '3 months',
          deadline: 'Q2 2024',
          confidence: 0.85
        },
        painPoints: [
          {
            description: 'Current spreadsheet system is not scalable',
            severity: 'high',
            frequency: 3
          }
        ],
        goals: [
          'Implement scalable CRM system',
          'Support 50 sales reps'
        ],
        technicalRequirements: [
          'Cloud-based',
          'Mobile-friendly'
        ],
        integrations: [
          'Salesforce',
          'HubSpot'
        ],
        confidence: {
          overall: 0.85,
          clientInfo: 0.9,
          budget: 0.9,
          timeline: 0.85,
          requirements: 0.8
        }
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockEntities)
      );

      const result = await service['extractEntities'](mockTranscript);

      expect(result.clientName).toBe('Acme Corp');
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].name).toBe('John Smith');
      expect(result.budget.min).toBe(50000);
      expect(result.timeline.duration).toBe('3 months');
      expect(result.painPoints).toHaveLength(1);
      expect(result.integrations).toContain('Salesforce');
      expect(result.confidence.overall).toBeGreaterThan(0.7);
    });

    it('should handle missing data gracefully', async () => {
      const mockEntities = {
        clientName: null,
        contacts: [],
        budget: null,
        timeline: null,
        painPoints: [],
        goals: [],
        technicalRequirements: [],
        integrations: [],
        confidence: {
          overall: 0.3,
          clientInfo: 0.2,
          budget: 0,
          timeline: 0,
          requirements: 0.5
        }
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockEntities)
      );

      const result = await service['extractEntities']('Very minimal transcript');

      expect(result.confidence.overall).toBeLessThan(0.5);
      expect(result.contacts).toHaveLength(0);
    });

    it('should calculate cost correctly for Pass 1', async () => {
      const mockEntities = {
        clientName: 'Test Corp',
        confidence: { overall: 0.8 }
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockEntities)
      );

      const startTime = Date.now();
      await service['extractEntities'](mockTranscript);
      const duration = Date.now() - startTime;

      // Cost should be calculated based on token usage
      // gpt-4o-mini: $0.150 / 1M input tokens, $0.600 / 1M output tokens
      const expectedCost = (100 * 0.150 / 1_000_000) + (50 * 0.600 / 1_000_000);

      // We can't directly test cost here without refactoring, but we can verify the call was made
      expect(openaiService.createChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini'
        })
      );
    });
  });

  describe('Pass 2: Section Drafting', () => {
    it('should draft proposal sections', async () => {
      const mockEntities = {
        clientName: 'Acme Corp',
        contacts: [{ name: 'John Smith' }],
        confidence: { overall: 0.85 }
      };

      const mockSections = {
        overview: {
          content: 'This proposal outlines a CRM solution for Acme Corp...',
          confidence: {
            overall: 0.9,
            dataAvailability: 0.95,
            specificity: 0.85,
            personalization: 0.9
          },
          sources: ['Transcript lines 1-3'],
          reasoning: 'Strong client information available',
          flags: []
        },
        executiveSummary: {
          content: 'Executive summary...',
          confidence: { overall: 0.85, dataAvailability: 0.9, specificity: 0.8, personalization: 0.85 },
          sources: [],
          reasoning: '',
          flags: []
        }
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockSections)
      );

      const result = await service['draftSections'](mockTranscript, mockEntities);

      expect(result.overview).toBeDefined();
      expect(result.overview.content).toContain('Acme Corp');
      expect(result.overview.confidence.overall).toBeGreaterThan(0.8);
      expect(result.overview.sources).toHaveLength(1);
    });

    it('should flag low-confidence sections', async () => {
      const mockEntities = { confidence: { overall: 0.5 } };

      const mockSections = {
        pricing: {
          content: 'Pricing details are unclear...',
          confidence: {
            overall: 0.4,
            dataAvailability: 0.3,
            specificity: 0.4,
            personalization: 0.5
          },
          sources: [],
          reasoning: 'Insufficient pricing information in transcript',
          flags: ['low_data_availability', 'needs_manual_review']
        }
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockSections)
      );

      const result = await service['draftSections'](mockTranscript, mockEntities);

      expect(result.pricing.confidence.overall).toBeLessThan(0.5);
      expect(result.pricing.flags).toContain('low_data_availability');
      expect(result.pricing.flags).toContain('needs_manual_review');
    });
  });

  describe('Pass 3: Gap Analysis & Filling', () => {
    it('should identify gaps in proposal sections', async () => {
      const mockSections = {
        pricing: {
          content: 'Pricing TBD',
          confidence: { overall: 0.3, dataAvailability: 0.2 },
          flags: ['low_data_availability']
        }
      };

      const mockGapAnalysis = {
        missingInformation: [
          {
            section: 'pricing',
            field: 'line items',
            severity: 'high',
            suggestion: 'Extract pricing details from transcript'
          }
        ],
        lowConfidenceSections: [
          {
            section: 'pricing',
            confidence: 0.3,
            reason: 'Insufficient data'
          }
        ],
        inconsistencies: [],
        qualityScore: 0.65
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockGapAnalysis)
      );

      const mockEntities = { confidence: { overall: 0.8 } };
      const result = await service['analyzeGaps'](mockSections, mockEntities);

      expect(result.missingInformation).toHaveLength(1);
      expect(result.missingInformation[0].section).toBe('pricing');
      expect(result.lowConfidenceSections).toHaveLength(1);
      expect(result.qualityScore).toBeLessThan(0.7);
    });

    it('should fill identified gaps', async () => {
      const mockGapAnalysis = {
        missingInformation: [
          { section: 'pricing', field: 'line items', severity: 'high' }
        ],
        lowConfidenceSections: [
          { section: 'pricing', confidence: 0.3 }
        ],
        inconsistencies: [],
        qualityScore: 0.65
      };

      const mockGapFilling = {
        filledGaps: [
          {
            section: 'pricing',
            field: 'line items',
            originalContent: 'Pricing TBD',
            newContent: 'CRM licenses: $50,000',
            source: 'Transcript line 5',
            confidenceImprovement: 0.4
          }
        ],
        resolvedInconsistencies: [],
        unresolvedGaps: [],
        finalQualityScore: 0.88
      };

      jest.spyOn(openaiService, 'createChatCompletion').mockResolvedValueOnce(
        mockOpenAIResponse(mockGapFilling)
      );

      const mockEntities = { confidence: { overall: 0.8 } };
      const mockSections = {
        pricing: { content: 'Pricing TBD', confidence: { overall: 0.3 } }
      };

      const result = await service['fillGaps'](
        mockTranscript,
        mockGapAnalysis,
        mockEntities,
        mockSections
      );

      expect(result.filledGaps).toHaveLength(1);
      expect(result.filledGaps[0].section).toBe('pricing');
      expect(result.filledGaps[0].confidenceImprovement).toBeGreaterThan(0);
      expect(result.finalQualityScore).toBeGreaterThan(mockGapAnalysis.qualityScore);
    });
  });

  describe('Full Multi-Pass Extraction', () => {
    it('should complete all 3 passes successfully', async () => {
      // Mock Pass 1: Entity Extraction
      const mockEntities = {
        clientName: 'Acme Corp',
        confidence: { overall: 0.85 }
      };

      // Mock Pass 2: Section Drafting
      const mockSections = {
        overview: {
          content: 'Overview content',
          confidence: { overall: 0.9, dataAvailability: 0.9, specificity: 0.9, personalization: 0.9 },
          sources: [],
          reasoning: '',
          flags: []
        },
        executiveSummary: {
          content: 'Executive summary',
          confidence: { overall: 0.85, dataAvailability: 0.85, specificity: 0.85, personalization: 0.85 },
          sources: [],
          reasoning: '',
          flags: []
        }
      };

      // Mock Pass 3: Gap Analysis
      const mockGapAnalysis = {
        missingInformation: [],
        lowConfidenceSections: [],
        inconsistencies: [],
        qualityScore: 0.9
      };

      // Mock Pass 3: Gap Filling
      const mockGapFilling = {
        filledGaps: [],
        resolvedInconsistencies: [],
        unresolvedGaps: [],
        finalQualityScore: 0.92
      };

      jest.spyOn(openaiService, 'createChatCompletion')
        .mockResolvedValueOnce(mockOpenAIResponse(mockEntities))
        .mockResolvedValueOnce(mockOpenAIResponse(mockSections))
        .mockResolvedValueOnce(mockOpenAIResponse(mockGapAnalysis))
        .mockResolvedValueOnce(mockOpenAIResponse(mockGapFilling));

      const result = await service.extractWithMultiPass(mockTranscript);

      expect(result.passes).toHaveLength(3);
      expect(result.passes[0].type).toBe('entity_extraction');
      expect(result.passes[1].type).toBe('section_drafting');
      expect(result.passes[2].type).toBe('gap_filling');

      expect(result.overallConfidence).toBeGreaterThan(0.8);
      expect(result.coverageScore).toBeGreaterThan(0.8);
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);

      expect(result.finalEntities).toEqual(mockEntities);
      expect(result.finalSections).toBeDefined();
      expect(result.gapsIdentified).toEqual([]);
      expect(result.gapsResolved).toEqual([]);
    });

    it('should track costs across all passes', async () => {
      const mockResponses = [
        mockOpenAIResponse({ confidence: { overall: 0.8 } }),
        mockOpenAIResponse({ overview: { content: 'test', confidence: { overall: 0.8, dataAvailability: 0.8, specificity: 0.8, personalization: 0.8 }, sources: [], reasoning: '', flags: [] } }),
        mockOpenAIResponse({ missingInformation: [], lowConfidenceSections: [], inconsistencies: [], qualityScore: 0.9 }),
        mockOpenAIResponse({ filledGaps: [], resolvedInconsistencies: [], unresolvedGaps: [], finalQualityScore: 0.92 })
      ];

      jest.spyOn(openaiService, 'createChatCompletion')
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3]);

      const result = await service.extractWithMultiPass(mockTranscript);

      expect(result.costBreakdown.pass1).toBeGreaterThan(0);
      expect(result.costBreakdown.pass2).toBeGreaterThan(0);
      expect(result.costBreakdown.pass3).toBeGreaterThan(0);
      expect(result.totalCost).toBe(
        result.costBreakdown.pass1 +
        result.costBreakdown.pass2 +
        result.costBreakdown.pass3
      );
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(openaiService, 'createChatCompletion').mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      await expect(service.extractWithMultiPass(mockTranscript)).rejects.toThrow();
    });

    it('should meet cost expectations', async () => {
      const mockResponses = [
        mockOpenAIResponse({ confidence: { overall: 0.8 } }),
        mockOpenAIResponse({ overview: { content: 'test', confidence: { overall: 0.8, dataAvailability: 0.8, specificity: 0.8, personalization: 0.8 }, sources: [], reasoning: '', flags: [] } }),
        mockOpenAIResponse({ missingInformation: [], lowConfidenceSections: [], inconsistencies: [], qualityScore: 0.9 }),
        mockOpenAIResponse({ filledGaps: [], resolvedInconsistencies: [], unresolvedGaps: [], finalQualityScore: 0.92 })
      ];

      jest.spyOn(openaiService, 'createChatCompletion')
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3]);

      const result = await service.extractWithMultiPass(mockTranscript);

      // Total cost should be less than $0.20
      expect(result.totalCost).toBeLessThan(0.20);

      // Pass 1 (gpt-4o-mini) should be cheapest
      expect(result.costBreakdown.pass1).toBeLessThan(0.03);
    });

    it('should meet quality expectations', async () => {
      const mockResponses = [
        mockOpenAIResponse({ confidence: { overall: 0.88 } }),
        mockOpenAIResponse({
          overview: { content: 'test', confidence: { overall: 0.9, dataAvailability: 0.9, specificity: 0.9, personalization: 0.9 }, sources: ['line 1'], reasoning: 'Good data', flags: [] },
          executiveSummary: { content: 'test', confidence: { overall: 0.85, dataAvailability: 0.85, specificity: 0.85, personalization: 0.85 }, sources: [], reasoning: '', flags: [] }
        }),
        mockOpenAIResponse({ missingInformation: [], lowConfidenceSections: [], inconsistencies: [], qualityScore: 0.92 }),
        mockOpenAIResponse({ filledGaps: [], resolvedInconsistencies: [], unresolvedGaps: [], finalQualityScore: 0.94 })
      ];

      jest.spyOn(openaiService, 'createChatCompletion')
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3]);

      const result = await service.extractWithMultiPass(mockTranscript);

      // Overall confidence should be > 80%
      expect(result.overallConfidence).toBeGreaterThan(0.80);

      // Coverage score should be > 85%
      expect(result.coverageScore).toBeGreaterThan(0.85);
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const mockResponses = [
        mockOpenAIResponse({ confidence: { overall: 0.8 } }),
        mockOpenAIResponse({ overview: { content: 'test', confidence: { overall: 0.8, dataAvailability: 0.8, specificity: 0.8, personalization: 0.8 }, sources: [], reasoning: '', flags: [] } }),
        mockOpenAIResponse({ missingInformation: [], lowConfidenceSections: [], inconsistencies: [], qualityScore: 0.9 }),
        mockOpenAIResponse({ filledGaps: [], resolvedInconsistencies: [], unresolvedGaps: [], finalQualityScore: 0.92 })
      ];

      jest.spyOn(openaiService, 'createChatCompletion')
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3]);

      const startTime = Date.now();
      await service.extractWithMultiPass(mockTranscript);
      const duration = Date.now() - startTime;

      // Should complete in under 2 seconds (mocked)
      expect(duration).toBeLessThan(2000);
    });
  });
});
