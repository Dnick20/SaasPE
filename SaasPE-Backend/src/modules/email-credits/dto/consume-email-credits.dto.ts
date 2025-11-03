import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class ConsumeEmailCreditsDto {
  @IsInt()
  @Min(1)
  credits: number;

  @IsString()
  actionType: string; // "campaign_email", "bulk_send", "individual_send"

  @IsOptional()
  metadata?: any;
}
