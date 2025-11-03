import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  ValidateNested,
  IsIn,
  IsNotEmpty,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CampaignSequenceStepDto {
  @IsInt()
  @Min(1)
  step: number;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsInt()
  @Min(0)
  delayDays: number;

  @IsBoolean()
  aiPersonalization: boolean;
}

export class CampaignContactDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}

export class CampaignScheduleDto {
  @IsArray()
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], { each: true })
  @ArrayMinSize(1)
  sendDays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];

  @IsString()
  @IsNotEmpty()
  sendTimeStart: string; // "09:00"

  @IsString()
  @IsNotEmpty()
  sendTimeEnd: string; // "17:00"

  @IsString()
  @IsNotEmpty()
  timezone: string; // "America/New_York"
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mailboxId: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignSequenceStepDto)
  @ArrayMinSize(1)
  sequence: CampaignSequenceStepDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignContactDto)
  @ArrayMinSize(1)
  contacts: CampaignContactDto[];

  @ValidateNested()
  @Type(() => CampaignScheduleDto)
  schedule: CampaignScheduleDto;
}
