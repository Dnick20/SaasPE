import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  initialMessage?: string;
}
