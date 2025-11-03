import { IsBoolean, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSendOptionsDto {
  @ApiPropertyOptional({
    description: 'Show table of contents to client',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  showTOC?: boolean;

  @ApiPropertyOptional({
    description:
      'Pricing option indices to show (e.g., [0, 1] for Option A and B)',
    example: [0, 1],
  })
  @IsArray()
  @IsOptional()
  pricingOptions?: number[];

  @ApiPropertyOptional({
    description: 'Custom section names to show',
    example: ['executive-summary', 'scope'],
  })
  @IsArray()
  @IsOptional()
  customSections?: string[];
}

export class UpdateSendOptionsResponseDto {
  @ApiProperty({
    description: 'Proposal ID',
    example: 'proposal-uuid-789',
  })
  id: string;

  @ApiProperty({
    description: 'Updated send options',
    example: {
      showTOC: true,
      pricingOptions: [0, 1],
      customSections: ['executive-summary'],
    },
  })
  sendOptions: Record<string, any>;

  @ApiProperty({
    description: 'Message',
    example: 'Send options updated successfully',
  })
  message: string;
}
