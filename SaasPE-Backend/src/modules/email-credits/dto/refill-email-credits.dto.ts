import { IsInt, IsString, IsEnum, Min } from 'class-validator';

export class RefillEmailCreditsDto {
  @IsInt()
  @Min(1)
  credits: number;

  @IsEnum(['refill', 'allocation', 'bonus'])
  type: 'refill' | 'allocation' | 'bonus';

  @IsString()
  description: string;
}
