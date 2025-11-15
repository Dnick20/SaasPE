import {
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContactDto } from './create-contact.dto';

export class BulkImportContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  contacts: CreateContactDto[];

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean; // If true, skip duplicates; if false, update existing
}
