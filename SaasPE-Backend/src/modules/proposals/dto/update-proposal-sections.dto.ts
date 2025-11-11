import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProposalSectionsDto {
  @ApiPropertyOptional({ description: 'Executive summary' })
  @IsOptional()
  @IsString()
  executiveSummary?: string;

  @ApiPropertyOptional({ description: 'Problem statement' })
  @IsOptional()
  @IsString()
  problemStatement?: string;

  @ApiPropertyOptional({ description: 'Proposed solution' })
  @IsOptional()
  @IsString()
  proposedSolution?: string;

  @ApiPropertyOptional({ description: 'Project scope (string or structured JSON) - LEGACY' })
  @IsOptional()
  scope?: any;

  @ApiPropertyOptional({ description: 'Objectives and outcomes' })
  @IsOptional()
  @IsString()
  objectivesAndOutcomes?: string;

  @ApiPropertyOptional({ description: 'Scope of work - array of work items with title, objective, keyActivities, outcome' })
  @IsOptional()
  scopeOfWork?: any;

  @ApiPropertyOptional({ description: 'Deliverables - array or string' })
  @IsOptional()
  deliverables?: any;

  @ApiPropertyOptional({ description: 'Approach and tools' })
  @IsOptional()
  @IsString()
  approachAndTools?: string;

  @ApiPropertyOptional({ description: 'Project timeline (string or structured JSON)' })
  @IsOptional()
  timeline?: any;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Cancellation notice' })
  @IsOptional()
  @IsString()
  cancellationNotice?: string;

  @ApiPropertyOptional({ description: 'Key priorities - array of 3-6 priority bullets' })
  @IsOptional()
  keyPriorities?: any;

  @ApiPropertyOptional({ description: 'Next steps - array of 3-5 action items' })
  @IsOptional()
  nextSteps?: any;

  @ApiPropertyOptional({ description: 'Proposed project phases - array of 2-3 detailed phases with estimatedHours' })
  @IsOptional()
  proposedProjectPhases?: any;
}


