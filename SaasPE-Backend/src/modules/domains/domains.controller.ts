import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DomainsService } from './domains.service';
import { ProvisionDomainDto } from './dto/provision-domain.dto';
import { DomainResponseDto } from './dto/domain-response.dto';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  /**
   * POST /api/v1/domains/provision
   * Purchase (optional) and configure DNS for a domain, then kick off SES verification.
   */
  @Post('provision')
  async provision(
    @Request() req,
    @Body() dto: ProvisionDomainDto,
  ): Promise<DomainResponseDto> {
    const { tenantId, userId } = req.user;
    return this.domainsService.provisionDomain(tenantId, userId, dto);
  }

  /**
   * GET /api/v1/domains/:id
   * Retrieve domain status and DNS flags.
   */
  @Get(':id')
  async getOne(@Request() req, @Param('id') id: string): Promise<DomainResponseDto> {
    const { tenantId } = req.user;
    return this.domainsService.getDomain(tenantId, id);
  }
}


