import { ApiProperty } from '@nestjs/swagger';

export class CompanyProfileResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'uuid-v4' })
  userId: string;

  @ApiProperty({ example: 'Acme Inc' })
  companyName: string;

  @ApiProperty({ example: 'https://acme.com', nullable: true })
  website?: string | null;

  @ApiProperty({ example: 'B2B SaaS', nullable: true })
  industry?: string | null;

  @ApiProperty({
    example: 'Marketing directors at B2B SaaS companies with 50-200 employees',
    nullable: true,
  })
  targetICP?: string | null;

  @ApiProperty({ example: 'professional', nullable: true })
  preferredTone?: string | null;

  @ApiProperty({
    example: {
      description: 'AI-powered agency automation platform',
      technologies: ['React', 'Node.js'],
    },
    nullable: true,
  })
  enrichmentData?: Record<string, any> | null;

  @ApiProperty({ example: false })
  scraped: boolean;

  @ApiProperty({ example: '2025-10-28T10:30:00Z', nullable: true })
  scrapedAt?: Date | null;

  @ApiProperty({
    example: { defaultProposalTemplate: 'professional' },
    nullable: true,
  })
  defaultSettings?: Record<string, any> | null;

  @ApiProperty({ example: '2025-10-28T08:00:00Z' })
  created: Date;

  @ApiProperty({ example: '2025-10-28T10:30:00Z' })
  updated: Date;
}
