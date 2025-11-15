import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!@#',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'MFA code (if MFA is enabled)',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
