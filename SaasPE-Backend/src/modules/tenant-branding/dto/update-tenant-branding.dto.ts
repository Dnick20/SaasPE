import { PartialType } from '@nestjs/swagger';
import { CreateTenantBrandingDto } from './create-tenant-branding.dto';

export class UpdateTenantBrandingDto extends PartialType(
  CreateTenantBrandingDto,
) {}
