import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsIn,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';
import { MailboxProvider, MailboxType } from '@prisma/client';

export class CreateMailboxDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsIn(['USER_PROVIDED', 'MANAGED'])
  type?: MailboxType;

  @IsString()
  @IsIn(['GMAIL', 'OUTLOOK', 'SMTP', 'AWS_SES'])
  provider: MailboxProvider;

  // OAuth Configuration (for Gmail/Outlook)
  @IsOptional()
  @IsString()
  @IsIn(['google', 'microsoft'])
  oauthProvider?: string;

  @IsOptional()
  @IsString()
  oauthRefreshToken?: string;

  @IsOptional()
  @IsString()
  oauthAccessToken?: string;

  @IsOptional()
  @IsDateString()
  oauthTokenExpiry?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  oauthScopes?: string[];

  // SMTP Configuration
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  smtpPort?: number;

  @IsOptional()
  @IsString()
  smtpUsername?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsBoolean()
  smtpUseSsl?: boolean;

  // AWS SES Configuration
  @IsOptional()
  @IsString()
  awsSesIdentity?: string;

  @IsOptional()
  @IsString()
  awsSesRegion?: string;

  @IsOptional()
  @IsString()
  dedicatedIp?: string;
}
