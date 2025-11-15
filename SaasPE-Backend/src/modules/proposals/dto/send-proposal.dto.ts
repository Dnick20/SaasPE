import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendProposalDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'client@example.com',
  })
  @IsEmail()
  recipientEmail: string;

  @ApiProperty({
    description: 'Recipient name',
    example: 'John Doe',
  })
  @IsString()
  recipientName: string;

  @ApiProperty({
    description: 'Whether to include e-signature via DocuSign',
    example: true,
  })
  @IsBoolean()
  includeESignature: boolean;

  @ApiProperty({
    description: 'Custom email message',
    example: 'Please review this proposal for your website redesign project.',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;
}
