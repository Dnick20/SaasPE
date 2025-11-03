import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  @Get()
  async getAll() {
    // Return list of available integrations
    return [
      {
        id: 'hubspot',
        name: 'hubspot',
        displayName: 'HubSpot CRM',
        description: 'Sync contacts and deals',
        enabled: false,
        status: 'disconnected',
      },
      {
        id: 'zapier',
        name: 'zapier',
        displayName: 'Zapier',
        description: 'Automate workflows',
        enabled: true,
        status: 'connected',
      },
    ];
  }
}
