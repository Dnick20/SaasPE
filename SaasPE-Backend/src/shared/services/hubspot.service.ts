import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface HubSpotContact {
  id?: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    linkedin_url?: string;
  };
}

interface HubSpotDeal {
  id?: string;
  properties: {
    dealname: string;
    dealstage: string;
    amount?: string;
    closedate?: string;
    pipeline?: string;
  };
  associations?: {
    contacts?: string[];
    companies?: string[];
  };
}

interface HubSpotCompany {
  id?: string;
  properties: {
    name: string;
    domain?: string;
    industry?: string;
    phone?: string;
  };
}

/**
 * HubSpot Service
 *
 * Handles two-way sync with HubSpot CRM:
 * - Sync clients to HubSpot contacts/companies
 * - Sync proposals to HubSpot deals
 * - Process webhooks from HubSpot
 * - Map deal stages to proposal statuses
 */
@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);
  private client: AxiosInstance;
  private enabled: boolean = false;

  // HubSpot deal stage mapping
  private readonly STAGE_MAPPING = {
    draft: 'appointmentscheduled',
    ready: 'qualifiedtobuy',
    sent: 'presentationscheduled',
    signed: 'closedwon',
    rejected: 'closedlost',
  };

  constructor(private config: ConfigService) {
    const apiKey = this.config.get('HUBSPOT_API_KEY');

    if (apiKey && apiKey !== 'your-hubspot-api-key') {
      this.enabled = true;
      this.client = axios.create({
        baseURL: 'https://api.hubapi.com',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log('HubSpot integration enabled');
    } else {
      this.logger.warn('HubSpot API key not configured. Integration disabled.');
    }
  }

  /**
   * Check if HubSpot integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create or update a contact in HubSpot
   */
  async syncContact(clientData: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    linkedIn?: string;
    hubspotContactId?: string;
  }): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const properties: any = {
        email: clientData.email,
      };

      if (clientData.firstName) properties.firstname = clientData.firstName;
      if (clientData.lastName) properties.lastname = clientData.lastName;
      if (clientData.company) properties.company = clientData.company;
      if (clientData.phone) properties.phone = clientData.phone;
      if (clientData.linkedIn) properties.linkedin_url = clientData.linkedIn;

      // Update existing contact
      if (clientData.hubspotContactId) {
        await this.client.patch(
          `/crm/v3/objects/contacts/${clientData.hubspotContactId}`,
          { properties },
        );
        this.logger.log(
          `Updated HubSpot contact: ${clientData.hubspotContactId}`,
        );
        return clientData.hubspotContactId;
      }

      // Create new contact
      const response = await this.client.post('/crm/v3/objects/contacts', {
        properties,
      });

      const contactId = response.data.id;
      this.logger.log(`Created HubSpot contact: ${contactId}`);
      return contactId;
    } catch (error: any) {
      this.logger.error(
        `Failed to sync contact to HubSpot:`,
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Create or update a company in HubSpot
   */
  async syncCompany(companyData: {
    name: string;
    domain?: string;
    industry?: string;
    phone?: string;
    hubspotCompanyId?: string;
  }): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const properties: any = {
        name: companyData.name,
      };

      if (companyData.domain) properties.domain = companyData.domain;
      if (companyData.industry) properties.industry = companyData.industry;
      if (companyData.phone) properties.phone = companyData.phone;

      // Update existing company
      if (companyData.hubspotCompanyId) {
        await this.client.patch(
          `/crm/v3/objects/companies/${companyData.hubspotCompanyId}`,
          { properties },
        );
        this.logger.log(
          `Updated HubSpot company: ${companyData.hubspotCompanyId}`,
        );
        return companyData.hubspotCompanyId;
      }

      // Create new company
      const response = await this.client.post('/crm/v3/objects/companies', {
        properties,
      });

      const companyId = response.data.id;
      this.logger.log(`Created HubSpot company: ${companyId}`);
      return companyId;
    } catch (error: any) {
      this.logger.error(
        `Failed to sync company to HubSpot:`,
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Create or update a deal in HubSpot
   */
  async syncDeal(dealData: {
    title: string;
    status: string;
    amount?: number;
    closeDate?: Date;
    hubspotDealId?: string;
    contactIds?: string[];
    companyIds?: string[];
  }): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const properties: any = {
        dealname: dealData.title,
        dealstage:
          this.STAGE_MAPPING[dealData.status] || 'appointmentscheduled',
      };

      if (dealData.amount) properties.amount = dealData.amount.toString();
      if (dealData.closeDate) {
        properties.closedate = dealData.closeDate.toISOString().split('T')[0];
      }

      // Update existing deal
      if (dealData.hubspotDealId) {
        await this.client.patch(
          `/crm/v3/objects/deals/${dealData.hubspotDealId}`,
          { properties },
        );
        this.logger.log(`Updated HubSpot deal: ${dealData.hubspotDealId}`);
        return dealData.hubspotDealId;
      }

      // Create new deal
      const response = await this.client.post('/crm/v3/objects/deals', {
        properties,
      });

      const dealId = response.data.id;
      this.logger.log(`Created HubSpot deal: ${dealId}`);

      // Associate with contacts and companies
      if (dealData.contactIds && dealData.contactIds.length > 0) {
        await this.associateDealWithContacts(dealId, dealData.contactIds);
      }
      if (dealData.companyIds && dealData.companyIds.length > 0) {
        await this.associateDealWithCompanies(dealId, dealData.companyIds);
      }

      return dealId;
    } catch (error: any) {
      this.logger.error(
        `Failed to sync deal to HubSpot:`,
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Associate a deal with contacts
   */
  private async associateDealWithContacts(
    dealId: string,
    contactIds: string[],
  ) {
    try {
      for (const contactId of contactIds) {
        await this.client.put(
          `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`,
        );
      }
      this.logger.log(
        `Associated deal ${dealId} with ${contactIds.length} contacts`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to associate deal with contacts:`,
        error.response?.data || error.message,
      );
    }
  }

  /**
   * Associate a deal with companies
   */
  private async associateDealWithCompanies(
    dealId: string,
    companyIds: string[],
  ) {
    try {
      for (const companyId of companyIds) {
        await this.client.put(
          `/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/5`,
        );
      }
      this.logger.log(
        `Associated deal ${dealId} with ${companyIds.length} companies`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to associate deal with companies:`,
        error.response?.data || error.message,
      );
    }
  }

  /**
   * Get a contact from HubSpot by email
   */
  async getContactByEmail(email: string): Promise<any | null> {
    if (!this.enabled) return null;

    try {
      const response = await this.client.get(
        `/crm/v3/objects/contacts/${email}?idProperty=email`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Contact not found
      }
      this.logger.error(
        `Failed to get contact from HubSpot:`,
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Get a deal from HubSpot by ID
   */
  async getDeal(dealId: string): Promise<any | null> {
    if (!this.enabled) return null;

    try {
      const response = await this.client.get(`/crm/v3/objects/deals/${dealId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to get deal from HubSpot:`,
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Process webhook from HubSpot
   * Handles updates from HubSpot back to our system
   */
  async processWebhook(webhookData: any): Promise<void> {
    if (!this.enabled) return;

    try {
      const objectType = webhookData.objectType; // contact, company, deal
      const eventType = webhookData.eventType; // created, updated, deleted
      const objectId = webhookData.objectId;

      this.logger.log(
        `Processing HubSpot webhook: ${eventType} ${objectType} ${objectId}`,
      );

      // Handle different object types
      switch (objectType) {
        case 'contact':
          await this.handleContactWebhook(objectId, eventType);
          break;
        case 'deal':
          await this.handleDealWebhook(objectId, eventType);
          break;
        case 'company':
          await this.handleCompanyWebhook(objectId, eventType);
          break;
        default:
          this.logger.warn(`Unknown webhook object type: ${objectType}`);
      }
    } catch (error) {
      this.logger.error('Failed to process HubSpot webhook:', error);
      throw error;
    }
  }

  private async handleContactWebhook(contactId: string, eventType: string) {
    // Implementation would update local client record based on HubSpot changes
    this.logger.log(`Contact webhook: ${eventType} ${contactId}`);
  }

  private async handleDealWebhook(dealId: string, eventType: string) {
    // Implementation would update local proposal record based on HubSpot deal changes
    this.logger.log(`Deal webhook: ${eventType} ${dealId}`);
  }

  private async handleCompanyWebhook(companyId: string, eventType: string) {
    // Implementation would update local client company record based on HubSpot changes
    this.logger.log(`Company webhook: ${eventType} ${companyId}`);
  }

  /**
   * Map HubSpot deal stage to our proposal status
   */
  mapDealStageToStatus(dealStage: string): string {
    const reverseMapping: Record<string, string> = {
      appointmentscheduled: 'draft',
      qualifiedtobuy: 'ready',
      presentationscheduled: 'sent',
      closedwon: 'signed',
      closedlost: 'rejected',
    };

    return reverseMapping[dealStage] || 'draft';
  }
}
