import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkMailboxItemDto {
  @ApiProperty({
    description: 'Email address',
    example: 'john@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'SMTP host',
    example: 'smtp.gmail.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiProperty({
    description: 'SMTP port',
    example: 587,
    required: false,
  })
  @IsOptional()
  smtpPort?: number;

  @ApiProperty({
    description: 'SMTP username',
    example: 'john@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  smtpUsername?: string;

  @ApiProperty({
    description: 'SMTP password or app password',
    example: 'app_password_here',
    required: false,
  })
  @IsOptional()
  @IsString()
  smtpPassword?: string;
}

export class BulkImportMailboxesDto {
  @ApiProperty({
    description: 'Array of mailboxes to import',
    type: [BulkMailboxItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMailboxItemDto)
  mailboxes: BulkMailboxItemDto[];
}

export class BulkImportResponseDto {
  @ApiProperty({
    description: 'Number of mailboxes successfully imported',
    example: 15,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of mailboxes that failed to import',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Total number of mailboxes attempted',
    example: 17,
  })
  totalCount: number;

  @ApiProperty({
    description: 'List of errors encountered',
    example: [
      { email: 'invalid@example', error: 'Invalid email format' },
      { email: 'duplicate@test.com', error: 'Mailbox already exists' },
    ],
  })
  errors: Array<{ email: string; error: string }>;

  @ApiProperty({
    description: 'List of successfully imported mailbox IDs',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
  })
  importedIds: string[];
}
