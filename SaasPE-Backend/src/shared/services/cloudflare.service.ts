import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

interface CloudflareDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

@Injectable()
export class CloudflareDNSService {
  private readonly logger = new Logger(CloudflareDNSService.name);
  private readonly apiBase = 'https://api.cloudflare.com/client/v4';
  private readonly apiToken: string;
  private readonly accountId?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN') || '';
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID') || undefined;

    if (!this.apiToken) {
      this.logger.warn('CLOUDFLARE_API_TOKEN is not set. DNS automation will be disabled.');
    }
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiToken}`,
    } as Record<string, string>;
  }

  async ensureZone(domain: string): Promise<CloudflareZone> {
    const existing = await this.findZone(domain);
    if (existing) return existing;

    if (!this.accountId) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID is required to create zones');
    }

    const res = await fetch(`${this.apiBase}/zones`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: domain,
        account: { id: this.accountId },
        jump_start: true,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Cloudflare create zone failed: ${JSON.stringify(json.errors || json)}`);
    }
    return json.result as CloudflareZone;
  }

  async findZone(domain: string): Promise<CloudflareZone | undefined> {
    const res = await fetch(`${this.apiBase}/zones?name=${encodeURIComponent(domain)}`, {
      headers: this.headers(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Cloudflare list zones failed: ${JSON.stringify(json.errors || json)}`);
    }
    const zone = (json.result as CloudflareZone[])[0];
    return zone;
  }

  async upsertTxt(zoneId: string, name: string, value: string, ttl: number = 1): Promise<CloudflareDnsRecord> {
    return this.upsertRecord(zoneId, 'TXT', name, value, { ttl });
  }

  async upsertCname(zoneId: string, name: string, target: string, proxied: boolean = false): Promise<CloudflareDnsRecord> {
    return this.upsertRecord(zoneId, 'CNAME', name, target, { proxied });
  }

  async upsertMx(zoneId: string, name: string, priority: number, target: string): Promise<CloudflareDnsRecord> {
    return this.upsertRecord(zoneId, 'MX', name, target, { priority });
  }

  private async upsertRecord(
    zoneId: string,
    type: string,
    name: string,
    content: string,
    extra: Partial<{ ttl: number; proxied: boolean; priority: number }> = {},
  ): Promise<CloudflareDnsRecord> {
    const existing = await this.findRecord(zoneId, type, name);
    if (existing) {
      const res = await fetch(`${this.apiBase}/zones/${zoneId}/dns_records/${existing.id}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({ type, name, content, ...extra }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(`Cloudflare update record failed: ${JSON.stringify(json.errors || json)}`);
      }
      return json.result as CloudflareDnsRecord;
    }

    const res = await fetch(`${this.apiBase}/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ type, name, content, ...extra }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Cloudflare create record failed: ${JSON.stringify(json.errors || json)}`);
    }
    return json.result as CloudflareDnsRecord;
  }

  private async findRecord(zoneId: string, type: string, name: string): Promise<CloudflareDnsRecord | undefined> {
    const url = `${this.apiBase}/zones/${zoneId}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: this.headers() });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Cloudflare list records failed: ${JSON.stringify(json.errors || json)}`);
    }
    const rec = (json.result as CloudflareDnsRecord[])[0];
    return rec;
  }
}


