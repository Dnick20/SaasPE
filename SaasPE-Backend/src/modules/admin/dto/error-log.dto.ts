import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum ErrorSource {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
}

export class CreateErrorLogDto {
  @IsString()
  errorId: string;

  @IsOptional()
  @IsString()
  sentryId?: string;

  @IsEnum(ErrorSeverity)
  severity: ErrorSeverity;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(ErrorSource)
  source: ErrorSource;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  stackTrace?: string;

  @IsOptional()
  @IsString()
  errorType?: string;

  @IsOptional()
  @IsObject()
  context?: any;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsInt()
  statusCode?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;
}

export class GetErrorLogsDto {
  @IsOptional()
  @IsEnum(ErrorSeverity)
  severity?: ErrorSeverity;

  @IsOptional()
  @IsEnum(ErrorSource)
  source?: ErrorSource;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  resolved?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class ResolveErrorDto {
  @IsOptional()
  @IsString()
  resolution?: string;
}
