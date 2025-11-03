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

  @ApiPropertyOptional({ description: 'Project scope (string or structured JSON)' })
  @IsOptional()
  scope?: any;

  @ApiPropertyOptional({ description: 'Project timeline (string or structured JSON)' })
  @IsOptional()
  timeline?: any;
}


