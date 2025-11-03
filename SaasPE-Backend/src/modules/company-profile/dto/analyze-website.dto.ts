import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class AnalyzeWebsiteDto {
  @ApiProperty({
    example: 'https://acme.com',
    description: 'Website URL to analyze and scrape',
  })
  @IsString()
  @IsUrl()
  url: string;
}
