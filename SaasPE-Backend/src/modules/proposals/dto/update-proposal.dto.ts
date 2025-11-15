import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreatePricingOptionDto, CreatePricingNoteDto } from './pricing-v2.dto';

export class UpdateProposalDto {
  @ApiProperty({
    description: 'Proposal title',
    example: 'Updated Website Redesign Proposal',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Executive summary',
    required: false,
  })
  @IsOptional()
  @IsString()
  executiveSummary?: string;

  @ApiProperty({
    description: 'Objectives and outcomes',
    required: false,
  })
  @IsOptional()
  @IsString()
  objectivesAndOutcomes?: string;

  @ApiProperty({
    description: 'Problem statement',
    required: false,
  })
  @IsOptional()
  @IsString()
  problemStatement?: string;

  @ApiProperty({
    description: 'Proposed solution',
    required: false,
  })
  @IsOptional()
  @IsString()
  proposedSolution?: string;

  @ApiProperty({
    description: 'Project scope - LEGACY (use scopeOfWork instead)',
    required: false,
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({
    description: 'Scope of work - array of work items with title, objective, keyActivities, outcome',
    required: false,
  })
  @IsOptional()
  scopeOfWork?: any;

  @ApiProperty({
    description: 'Deliverables - array or string',
    required: false,
  })
  @IsOptional()
  deliverables?: any;

  @ApiProperty({
    description: 'Approach and tools',
    required: false,
  })
  @IsOptional()
  @IsString()
  approachAndTools?: string;

  @ApiProperty({
    description: 'Timeline (string or structured phases array)',
    required: false,
  })
  @IsOptional()
  timeline?: any;

  @ApiProperty({
    description: 'Payment terms',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({
    description: 'Cancellation notice',
    required: false,
  })
  @IsOptional()
  @IsString()
  cancellationNotice?: string;

  @ApiProperty({
    description: 'Key priorities - array of 3-6 priority bullets',
    required: false,
  })
  @IsOptional()
  keyPriorities?: any;

  @ApiProperty({
    description: 'Next steps - array of 3-5 action items',
    required: false,
  })
  @IsOptional()
  nextSteps?: any;

  @ApiProperty({
    description: 'Proposed project phases - array of 2-3 detailed phases with estimatedHours',
    required: false,
  })
  @IsOptional()
  proposedProjectPhases?: any;

  @ApiProperty({
    description: 'Cover page data including metadata',
    example: {
      term: '12',
      termMonths: 12,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      preparedBy: 'John Smith',
      preparedFor: 'Jane Doe',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  coverPageData?: {
    term?: string;
    termMonths?: number;
    startDate?: string;
    endDate?: string;
    preparedBy?: string;
    preparedFor?: string;
    [key: string]: any; // Allow additional metadata
  };

  @ApiProperty({
    description: 'Pricing structure',
    example: {
      items: [
        {
          name: 'Website Design',
          description: 'Custom responsive design',
          price: 5000,
        },
        {
          name: 'Development',
          description: 'Full-stack development',
          price: 10000,
        },
      ],
      total: 15000,
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  pricing?: {
    items: Array<{
      name: string;
      description?: string;
      price: number;
    }>;
    total: number;
  };

  @ApiPropertyOptional({
    description: 'Multiple pricing options (legacy array form)',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  pricingOptions?: any[];

  @ApiPropertyOptional({
    description: 'Which pricing option is selected (e.g., label or index)',
  })
  @IsOptional()
  @IsString()
  selectedPricingOption?: string;

  // Enhanced Proposal Sections (Proposal V2)
  @ApiProperty({
    description: 'Account hierarchy and organizational structure',
    example: {
      primaryContact: 'John Doe - CEO',
      stakeholders: [
        { name: 'Jane Smith', role: 'CMO', department: 'Marketing' },
        { name: 'Bob Johnson', role: 'CTO', department: 'Technology' },
      ],
      decisionMakers: ['John Doe', 'Jane Smith'],
      organizationChart: {},
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  accountHierarchy?: any;

  @ApiProperty({
    description:
      'Content enrichment with product libraries and customer segments',
    example: {
      recommendedProducts: [
        {
          id: 'prod_1',
          name: 'SEO Optimization Package',
          category: 'Marketing',
        },
      ],
      customerSegments: ['Enterprise', 'B2B'],
      industryBenchmarks: {},
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  contentEnrichment?: any;

  @ApiProperty({
    description: 'KPI forecast and projected metrics',
    example: {
      metrics: [
        {
          name: 'Website Traffic',
          baseline: 10000,
          projected: 25000,
          timeframe: '6 months',
        },
        {
          name: 'Conversion Rate',
          baseline: '2%',
          projected: '5%',
          timeframe: '6 months',
        },
      ],
      roi: {
        investment: 50000,
        projectedReturn: 150000,
        timeframe: '12 months',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  kpiForecast?: any;

  @ApiProperty({
    description: 'Team roster with member bios and roles',
    example: {
      members: [
        {
          name: 'Sarah Williams',
          role: 'Project Manager',
          bio: '10+ years of experience in digital transformation',
          skills: ['Agile', 'Scrum', 'Leadership'],
        },
        {
          name: 'Mike Chen',
          role: 'Lead Developer',
          bio: 'Full-stack developer specializing in React and Node.js',
          skills: ['React', 'Node.js', 'AWS'],
        },
      ],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  teamRoster?: any;

  @ApiProperty({
    description:
      'Appendix with supporting documents, case studies, and references',
    example: {
      caseStudies: [
        {
          title: 'Similar Project Success Story',
          url: 'https://example.com/case-study',
        },
      ],
      certifications: ['AWS Certified', 'Google Partner'],
      references: [
        {
          company: 'Acme Corp',
          contact: 'John Smith',
          testimonial: 'Excellent work!',
        },
      ],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  appendix?: any;

  // Pricing V2 (Narrative Pricing) - for full replacement of pricing
  @ApiPropertyOptional({
    description: 'Replace all pricing options with new V2 pricing structure',
    type: [CreatePricingOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingOptionDto)
  pricingOptionsV2?: CreatePricingOptionDto[];

  @ApiPropertyOptional({
    description: 'Replace all pricing notes with new V2 pricing notes',
    type: [CreatePricingNoteDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingNoteDto)
  pricingNotesV2?: CreatePricingNoteDto[];
}
