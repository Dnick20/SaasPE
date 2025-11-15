import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Agency/Tenant name',
    example: 'Acme Marketing Agency',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  agencyName: string;

  @ApiProperty({
    description: 'Admin user email address',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Password (min 12 chars, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!@#',
  })
  @IsStrongPassword(
    {
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 12 characters and contain uppercase, lowercase, number, and special character',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Admin user first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Admin user last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Subscription plan',
    example: 'starter',
    enum: ['starter', 'professional', 'enterprise'],
    required: false,
  })
  @IsOptional()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan?: string;
}
