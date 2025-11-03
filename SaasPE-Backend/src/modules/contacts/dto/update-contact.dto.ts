import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @IsOptional()
  @IsString()
  status?: string; // active, unsubscribed, bounced
}
